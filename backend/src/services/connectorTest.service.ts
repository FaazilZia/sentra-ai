import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';
import { assertSafeTarget } from '../utils/ssrfProtection';
import { normalizePrivateKey, parseServiceAccountInput } from '../utils/credentialHelper';
import logger from '../utils/logger';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export function formatFriendlyConnectorError(err: any): string {
  const rawMsg = err?.message || String(err);

  if (rawMsg.includes('SSRF validation failed') || rawMsg.includes('private or internal network')) {
    return rawMsg;
  }
  if (rawMsg.includes('AccessDenied') || rawMsg.includes('Forbidden') || err?.name === 'AccessDenied') {
    return 'Access Denied: Please verify permissions and credential scopes.';
  }
  if (rawMsg.includes('NoSuchBucket')) {
    return 'Specified S3 bucket does not exist or is in a different region.';
  }
  if (rawMsg.includes('ECONNREFUSED')) {
    return 'Connection refused: Host unreachable. Verify host address and port.';
  }
  if (rawMsg.includes('ETIMEDOUT') || rawMsg.includes('ENOTFOUND')) {
    return 'Connection timed out or DNS lookup failed. Verify hostname and network connectivity.';
  }
  if (rawMsg.includes('password authentication failed') || err?.code === '28P01') {
    return 'Database authentication failed: Invalid username or password.';
  }
  if (rawMsg.includes('database') && rawMsg.includes('does not exist')) {
    return 'Database not found: Specified database does not exist on the target server.';
  }
  if (rawMsg.includes('invalid_grant')) {
    return 'Google Drive authentication failed: Invalid service account private key or client email.';
  }
  if (rawMsg.includes('DECODER routine:unsupported') || rawMsg.includes('PEM routines')) {
    return 'Invalid private key format. Please check the RSA private key or upload the service account JSON.';
  }

  return `Connection failed: ${rawMsg}`;
}

/**
 * Tests connection to an external data source without persisting credentials or modifying state.
 */
export async function testConnectorSource(
  type: string,
  config: Record<string, any> = {},
  credentials: any = {}
): Promise<TestConnectionResult> {
  const normalizedType = type === 'sql' ? 'postgres' : type;

  try {
    if (normalizedType === 's3') {
      const bucketName = config.bucketName || config.bucket || credentials.bucketName || credentials.bucket;
      const region = config.region || credentials.region || 'us-east-1';
      const accessKeyId = credentials.accessKeyId || config.accessKeyId;
      const secretAccessKey = credentials.secretAccessKey || config.secretAccessKey;

      if (!bucketName) {
        return { success: false, message: 'Bucket name is required for S3 connection test.' };
      }
      if (!accessKeyId || !secretAccessKey) {
        return { success: false, message: 'AWS Access Key ID and Secret Access Key are required.' };
      }

      const s3 = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      const listCmd = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
      await s3.send(listCmd);

      return {
        success: true,
        message: `Successfully connected to S3 bucket "${bucketName}" in region "${region}".`,
        details: { bucketName, region },
      };
    }

    if (normalizedType === 'gdrive') {
      let client_email = credentials.client_email || credentials.clientEmail || config.client_email;
      let private_key = credentials.private_key || credentials.privateKey || config.private_key;
      const driveScope = credentials.driveScope || config.driveScope || 'https://www.googleapis.com/auth/drive.readonly';

      // If user passed a service account JSON string or object
      if (!client_email || !private_key) {
        const parsed = parseServiceAccountInput(credentials) || parseServiceAccountInput(config);
        if (parsed.client_email) client_email = parsed.client_email;
        if (parsed.private_key) private_key = parsed.private_key;
      }

      if (!client_email) {
        return { success: false, message: 'Service account client email is required.' };
      }
      if (!private_key) {
        return { success: false, message: 'Service account private key is required.' };
      }

      const normalizedKey = normalizePrivateKey(private_key);

      const auth = new (google.auth.JWT as any)(
        client_email,
        null,
        normalizedKey,
        [driveScope]
      );
      const drive = google.drive({ version: 'v3', auth });

      const res = await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
      });

      const count = res.data.files ? res.data.files.length : 0;
      return {
        success: true,
        message: `Successfully connected to Google Drive API. Found ${count} readable file(s) in scope.`,
        details: { client_email, driveScope },
      };
    }

    if (normalizedType === 'postgres') {
      const host = credentials.host || config.host;
      const port = Number(credentials.port || config.port || 5432);
      const user = credentials.user || config.user;
      const password = credentials.password || config.password;
      const database = credentials.database || config.database || 'postgres';
      const schema = config.schema || credentials.schema || 'public';
      const useSsl = config.ssl !== false && credentials.ssl !== false;

      if (!host) {
        return { success: false, message: 'Database host is required.' };
      }
      if (!user) {
        return { success: false, message: 'Database user is required.' };
      }

      // SSRF check on host before establishing connection
      await assertSafeTarget(host);

      // Validate schema is a safe identifier
      if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
        return { success: false, message: 'Invalid schema name. Only alphanumeric characters and underscores are allowed.' };
      }

      const client = new PgClient({
        host,
        port,
        user,
        password,
        database,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000,
      });

      await client.connect();
      try {
        const verRes = await client.query('SELECT version()');
        const pgVersion = verRes.rows[0]?.version || 'PostgreSQL';

        // Check metadata access on specified schema
        const tablesRes = await client.query(
          `SELECT count(*)::int as table_count FROM information_schema.tables WHERE table_schema = $1`,
          [schema]
        );
        const tableCount = tablesRes.rows[0]?.table_count || 0;

        return {
          success: true,
          message: `Successfully connected to PostgreSQL (${schema} schema has ${tableCount} table(s)).`,
          details: {
            host,
            database,
            schema,
            tableCount,
            pgVersion: pgVersion.split(' ')[0] + ' ' + pgVersion.split(' ')[1],
          },
        };
      } finally {
        await client.end().catch(() => {});
      }
    }

    return {
      success: false,
      message: `Unsupported connector type "${type}". Allowed types: postgres, s3, gdrive.`,
    };
  } catch (err: any) {
    logger.warn(`Connector test connection failed for ${type}:`, err);
    return {
      success: false,
      message: formatFriendlyConnectorError(err),
      details: { raw: err?.message },
    };
  }
}
