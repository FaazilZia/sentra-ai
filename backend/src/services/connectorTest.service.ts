import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Client as PgClient } from 'pg';
import { assertSafeTarget } from '../utils/ssrfProtection';
import { normalizePrivateKey, parseServiceAccountInput } from '../utils/credentialHelper';
import logger from '../utils/logger';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export const RESTRICTED_POSTGRES_PORTS = new Set([
  21,   // FTP
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  53,   // DNS
  80,   // HTTP
  110,  // POP3
  143,  // IMAP
  389,  // LDAP
  443,  // HTTPS
  445,  // SMB
  636,  // LDAPS
  2375, // Docker plain
  2376, // Docker TLS
  2379, // etcd
  2380, // etcd peer
  3306, // MySQL
  5000, // Docker Registry / Flask
  6379, // Redis
  8080, // HTTP Alt
  8443, // HTTPS Alt
  9200, // Elasticsearch
  9300, // Elasticsearch transport
  11211,// Memcached
  27017,// MongoDB
]);

interface FriendlyErrorRule {
  matches: (msg: string, err?: any) => boolean;
  friendlyMessage: string;
}

const FRIENDLY_ERROR_RULES: FriendlyErrorRule[] = [
  {
    matches: (msg, err) => msg.includes('AccessDenied') || msg.includes('Forbidden') || err?.name === 'AccessDenied',
    friendlyMessage: 'Access Denied: Please verify permissions and credential scopes (e.g. check s3:ListBucket).',
  },
  {
    matches: (msg) => msg.includes('NoSuchBucket'),
    friendlyMessage: 'Specified S3 bucket does not exist or is in a different region.',
  },
  {
    matches: (msg) =>
      msg.includes('IllegalLocationConstraintException') ||
      msg.includes('PermanentRedirect') ||
      msg.includes('BucketRegionError') ||
      msg.includes('different region'),
    friendlyMessage: 'S3 bucket region error: The specified bucket is in a different AWS region.',
  },
  {
    matches: (msg) =>
      msg.includes('SignatureDoesNotMatch') ||
      msg.includes('InvalidAccessKeyId') ||
      msg.includes('The security token included in the request is invalid'),
    friendlyMessage: 'AWS authentication failed: Invalid Access Key ID or Secret Access Key.',
  },
  {
    matches: (msg) => msg.includes('ECONNREFUSED'),
    friendlyMessage: 'Connection refused: Host unreachable. Verify host address and port.',
  },
  {
    matches: (msg) => msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND'),
    friendlyMessage: 'Connection timed out or DNS lookup failed. Verify hostname and network connectivity.',
  },
  {
    matches: (msg) =>
      msg.includes('ERR_TLS_CERT_ALTNAME_INVALID') ||
      msg.includes("is not in the cert's altnames") ||
      msg.includes('does not match certificate'),
    friendlyMessage: 'SSL/TLS certificate hostname mismatch: The server certificate does not match the requested hostname.',
  },
  {
    matches: (msg, err) =>
      msg.includes('DEPTH_ZERO_SELF_SIGNED_CERT') ||
      msg.includes('SELF_SIGNED_CERT_IN_CHAIN') ||
      msg.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
      msg.includes('unable to verify the first certificate') ||
      err?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      err?.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
      msg.includes('self-signed') ||
      msg.includes('self signed'),
    friendlyMessage:
      'SSL/TLS certificate verification failed: Self-signed certificate in chain. Enable "Allow self-signed certificate (not recommended)" if connecting to a server with a private certificate.',
  },
  {
    matches: (msg) => msg.includes('CERT_HAS_EXPIRED') || msg.includes('certificate has expired'),
    friendlyMessage: 'SSL/TLS certificate error: The server certificate has expired.',
  },
  {
    matches: (msg) => msg.includes('server does not support SSL'),
    friendlyMessage: 'The target database does not support SSL connections. Disable the Require SSL option to connect without SSL.',
  },
  {
    matches: (msg, err) => msg.includes('password authentication failed') || err?.code === '28P01',
    friendlyMessage: 'Database authentication failed: Invalid username or password.',
  },
  {
    matches: (msg) => msg.includes('database') && msg.includes('does not exist'),
    friendlyMessage: 'Database not found: Specified database does not exist on the target server.',
  },
  {
    matches: (msg, err) => msg.includes('permission denied') || msg.includes('must be member of role') || err?.code === '42501',
    friendlyMessage: 'Database access denied: Insufficient privileges on the target schema or tables.',
  },
  {
    matches: (msg) => msg.includes('invalid_grant'),
    friendlyMessage: 'Google Drive authentication failed: Invalid service account private key or client email.',
  },
  {
    matches: (msg) => msg.includes('DECODER routine:unsupported') || msg.includes('PEM routines'),
    friendlyMessage: 'Invalid private key format. Please check the RSA private key or upload the service account JSON.',
  },
  {
    matches: (msg) =>
      msg.includes('Google Drive API has not been used') ||
      msg.includes('Drive API is not enabled') ||
      msg.includes('accessNotConfigured') ||
      msg.includes('has not been used in project'),
    friendlyMessage: 'Google Drive API is disabled. Enable the Google Drive API in your Google Cloud Console project.',
  },
  {
    matches: (msg) => msg.includes('File not found') || msg.includes('notFound') || msg.includes('folder not shared'),
    friendlyMessage: 'Target Google Drive folder or file not found or not shared with the service account email.',
  },
];

export function formatFriendlyConnectorError(err: any): string {
  const rawMsg = err?.message || String(err);

  if (rawMsg.includes('SSRF validation failed') || rawMsg.includes('private or internal network')) {
    return rawMsg;
  }

  const matched = FRIENDLY_ERROR_RULES.find((rule) => rule.matches(rawMsg, err));
  return matched ? matched.friendlyMessage : 'Connection failed. Please verify credentials, host address, and permissions.';
}

async function testS3Source(
  config: Record<string, any>,
  credentials: any
): Promise<TestConnectionResult> {
  const bucketName = config.bucketName || config.bucket || credentials.bucketName || credentials.bucket;
  const region = config.region || credentials.region || 'us-east-1';
  const accessKeyId = credentials.accessKeyId || config.accessKeyId;
  const secretAccessKey = credentials.secretAccessKey || config.secretAccessKey;

  // Defensive SSRF check if a custom endpoint parameter was injected
  const customEndpoint = config.endpoint || credentials.endpoint;
  if (customEndpoint) {
    const parsedUrl = new URL(String(customEndpoint));
    await assertSafeTarget(parsedUrl.hostname);
  }

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

async function testGDriveSource(
  config: Record<string, any>,
  credentials: any
): Promise<TestConnectionResult> {
  let client_email = credentials.client_email || credentials.clientEmail || config.client_email;
  let private_key = credentials.private_key || credentials.privateKey || config.private_key;
  const driveScope = credentials.driveScope || config.driveScope || 'https://www.googleapis.com/auth/drive.readonly';

  // Defensive SSRF check if a custom endpoint parameter was injected
  const customEndpoint = config.endpoint || credentials.endpoint;
  if (customEndpoint) {
    const parsedUrl = new URL(String(customEndpoint));
    await assertSafeTarget(parsedUrl.hostname);
  }

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

  // Lazy-require googleapis to isolate third-party library loading without breaking CommonJS tests
  const googleapis = require('googleapis');
  const google = googleapis.google || googleapis;
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

async function testPostgresSource(
  config: Record<string, any>,
  credentials: any
): Promise<TestConnectionResult> {
  const rawHost = String(credentials.host || config.host || '').trim();
  const rawPort = credentials.port || config.port || 5432;
  const rawUser = String(credentials.user || config.user || '').trim();
  const rawPassword = String(credentials.password || config.password || '');
  const rawDatabase = String(credentials.database || config.database || 'postgres').trim();
  const rawSchema = String(config.schema || credentials.schema || 'public').trim();
  const useSsl = config.ssl !== false && credentials.ssl !== false;
  const allowSelfSigned = Boolean(config.allowSelfSigned || credentials.allowSelfSigned);

  const HOST_REGEX = /^[a-zA-Z0-9_.-]+$/;
  const USER_REGEX = /^[a-zA-Z0-9_.-]+$/;
  const DB_REGEX = /^[a-zA-Z0-9_-]+$/;
  const SCHEMA_REGEX = /^\w+$/;

  if (!rawHost || !HOST_REGEX.test(rawHost)) {
    return { success: false, message: 'Database host is required and must have a valid hostname/IP format.' };
  }
  if (!rawUser || !USER_REGEX.test(rawUser)) {
    return { success: false, message: 'Database user is required and must have a valid username format.' };
  }
  if (!rawDatabase || !DB_REGEX.test(rawDatabase)) {
    return { success: false, message: 'Invalid database name format.' };
  }
  if (!rawSchema || !SCHEMA_REGEX.test(rawSchema)) {
    return { success: false, message: 'Invalid schema name. Only alphanumeric characters and underscores are allowed.' };
  }

  const parsedPort = Number.parseInt(String(rawPort), 10);
  if (Number.isNaN(parsedPort) || parsedPort < 1024 || parsedPort > 65535 || RESTRICTED_POSTGRES_PORTS.has(parsedPort)) {
    return {
      success: false,
      message: `Invalid port: Port ${rawPort} is not permitted for PostgreSQL connections. Privileged system ports (1-1023) and restricted service ports are blocked.`,
    };
  }
  const port = parsedPort;

  // SSRF check on host before establishing connection - pins to resolved IP
  const safeIp = await assertSafeTarget(rawHost);
  if (!/^[a-zA-Z0-9_.:]+$/.test(safeIp)) {
    return { success: false, message: 'Invalid resolved target IP address.' };
  }

  const client = new PgClient({
    host: safeIp,
    port,
    user: rawUser,
    password: rawPassword,
    database: rawDatabase,
    ssl: useSsl ? { rejectUnauthorized: !allowSelfSigned, servername: rawHost } : undefined,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  try {
    const verRes = await client.query('SELECT version()');
    const pgVersion = verRes.rows[0]?.version || 'PostgreSQL';

    let hasUsage = true;
    try {
      const usageRes = await client.query(
        `SELECT has_schema_privilege(current_user, $1, 'USAGE') as has_usage`,
        [rawSchema]
      );
      hasUsage = usageRes.rows[0]?.has_usage === true;
    } catch {
      hasUsage = false;
    }

    let tableCount = 0;
    try {
      const tablesRes = await client.query(
        `SELECT count(*)::int as table_count FROM information_schema.tables WHERE table_schema = $1`,
        [rawSchema]
      );
      tableCount = tablesRes.rows[0]?.table_count || 0;
    } catch {
      tableCount = 0;
    }

    if (!hasUsage || tableCount === 0) {
      return {
        success: false,
        message: `Connected, but this user cannot read schema ${rawSchema} (or it has no tables). Grant USAGE on the schema and SELECT on its tables.`,
        details: {
          host: rawHost,
          database: rawDatabase,
          schema: rawSchema,
          tableCount,
        },
      };
    }

    return {
      success: true,
      message: `Successfully connected to PostgreSQL (${rawSchema} schema has ${tableCount} table(s)).`,
      details: {
        host: rawHost,
        database: rawDatabase,
        schema: rawSchema,
        tableCount,
        pgVersion: String(pgVersion).split(' ').slice(0, 2).join(' '),
      },
    };
  } finally {
    await client.end().catch(() => {});
  }
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
      return await testS3Source(config, credentials);
    }
    if (normalizedType === 'gdrive') {
      return await testGDriveSource(config, credentials);
    }
    if (normalizedType === 'postgres') {
      return await testPostgresSource(config, credentials);
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
    };
  }
}
