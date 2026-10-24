import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Client as PgClient } from 'pg';
import { assertSafeTarget } from '../utils/ssrfProtection';
import { normalizePrivateKey, parseServiceAccountInput } from '../utils/credentialHelper';
import logger from '../utils/logger';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  warning?: boolean;
  details?: Record<string, any>;
}

export const DEFAULT_ALLOWED_POSTGRES_PORTS = new Set([5432, 5433, 6432, 6543]);

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

export function validatePostgresPort(
  rawPort: any,
  allowCustomPort: boolean
): { valid: boolean; port: number; error?: string } {
  const parsedPort = Number.parseInt(String(rawPort), 10);
  if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return {
      valid: false,
      port: 5432,
      error: `Invalid port: Port ${rawPort} is not a valid TCP port number (1-65535).`,
    };
  }

  if (DEFAULT_ALLOWED_POSTGRES_PORTS.has(parsedPort)) {
    return { valid: true, port: parsedPort };
  }

  if (!allowCustomPort) {
    return {
      valid: false,
      port: parsedPort,
      error: `Invalid port: Port ${rawPort} is not permitted by default. Only standard PostgreSQL ports (5432, 5433, 6432, 6543) are allowed. Custom database ports require an explicit administrator setting.`,
    };
  }

  if (parsedPort < 1024 || RESTRICTED_POSTGRES_PORTS.has(parsedPort)) {
    return {
      valid: false,
      port: parsedPort,
      error: `Invalid port: Port ${rawPort} is a privileged system port (1-1023) or restricted service port and cannot be used for PostgreSQL connections.`,
    };
  }

  return { valid: true, port: parsedPort };
}

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
  {
    matches: (msg) => msg.includes('invalid_auth') || msg.includes('not_authed'),
    friendlyMessage: 'Slack authentication failed: Invalid or missing bot token. Ensure you are using a Bot User OAuth Token starting with "xoxb-".',
  },
  {
    matches: (msg) => msg.includes('token_revoked') || msg.includes('account_inactive') || msg.includes('app_uninstalled'),
    friendlyMessage: 'Slack connection failed: Bot token has been revoked, the app is uninstalled, or workspace is inactive.',
  },
  {
    matches: (msg) => msg.includes('missing_scope') || msg.includes('not_in_channel') || msg.includes('restricted_action'),
    friendlyMessage: 'Slack authorization error: Missing required OAuth scopes. Ensure channels:read, channels:history, and files:read scopes are granted in your Slack app.',
  },
  {
    matches: (msg) => msg.includes('ratelimited'),
    friendlyMessage: 'Slack rate limit exceeded: Too many requests sent to the Slack API. Please wait before retrying.',
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

  let auth: any;
  try {
    auth = new (google.auth.JWT as any)({
      email: client_email,
      key: normalizedKey,
      scopes: [driveScope],
    });
  } catch {
    auth = new (google.auth.JWT as any)(
      client_email,
      null,
      normalizedKey,
      [driveScope]
    );
  }
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    pageSize: 1,
    fields: 'files(id, name)',
  });

  const count = res.data.files ? res.data.files.length : 0;
  if (count === 0) {
    return {
      success: true,
      warning: true,
      message: 'Connected to Google Drive API, but 0 readable files were found in scope. Ensure target files or folders are shared with the Service Account email.',
      details: { client_email, driveScope, fileCount: 0 },
    };
  }

  return {
    success: true,
    warning: false,
    message: `Successfully connected to Google Drive API. Found ${count} readable file(s) in scope.`,
    details: { client_email, driveScope, fileCount: count },
  };
}

function validatePostgresInputs(
  config: Record<string, any>,
  credentials: any,
  isAdmin: boolean
): {
  error?: string;
  port?: number;
  rawHost?: string;
  rawUser?: string;
  rawPassword?: string;
  rawDatabase?: string;
  rawSchema?: string;
} {
  const rawHost = String(credentials.host || config.host || '').trim();
  const rawPort = credentials.port || config.port || 5432;
  const rawUser = String(credentials.user || config.user || '').trim();
  const rawPassword = String(credentials.password || config.password || '');
  const rawDatabase = String(credentials.database || config.database || 'postgres').trim();
  const rawSchema = String(config.schema || credentials.schema || 'public').trim();

  const HOST_REGEX = /^[a-zA-Z0-9_.-]+$/;
  const USER_REGEX = /^[a-zA-Z0-9_.-]+$/;
  const DB_REGEX = /^[a-zA-Z0-9_-]+$/;
  const SCHEMA_REGEX = /^\w+$/;

  if (!rawHost || !HOST_REGEX.test(rawHost)) {
    return { error: 'Database host is required and must have a valid hostname/IP format.' };
  }
  if (!rawUser || !USER_REGEX.test(rawUser)) {
    return { error: 'Database user is required and must have a valid username format.' };
  }
  if (!rawDatabase || !DB_REGEX.test(rawDatabase)) {
    return { error: 'Invalid database name format.' };
  }
  if (!rawSchema || !SCHEMA_REGEX.test(rawSchema)) {
    return { error: 'Invalid schema name. Only alphanumeric characters and underscores are allowed.' };
  }

  if (config && typeof config === 'object') {
    delete config.allowCustomPortApprovedBy;
    delete config.allowCustomPortApprovedAt;
  }
  if (credentials && typeof credentials === 'object') {
    delete credentials.allowCustomPortApprovedBy;
    delete credentials.allowCustomPortApprovedAt;
  }

  const allowCustomPort = Boolean(
    process.env.ALLOW_CUSTOM_DB_PORTS === 'true' ||
    (isAdmin && (config.allowCustomPort || credentials.allowCustomPort))
  );

  const portValidation = validatePostgresPort(rawPort, allowCustomPort);
  if (!portValidation.valid) {
    return { error: portValidation.error || 'Invalid port.' };
  }

  return {
    port: portValidation.port,
    rawHost,
    rawUser,
    rawPassword,
    rawDatabase,
    rawSchema,
  };
}

async function testPostgresSource(
  config: Record<string, any>,
  credentials: any,
  isAdmin = false
): Promise<TestConnectionResult> {
  const validated = validatePostgresInputs(config, credentials, isAdmin);
  if (validated.error) {
    return { success: false, message: validated.error };
  }

  const { rawHost, port, rawUser, rawPassword, rawDatabase, rawSchema } = validated as Required<typeof validated>;
  const useSsl = config.ssl !== false && credentials.ssl !== false;
  const allowSelfSigned = Boolean(config.allowSelfSigned || credentials.allowSelfSigned);

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

async function testSlackSource(
  config: Record<string, any>,
  credentials: any
): Promise<TestConnectionResult> {
  let botToken = '';
  if (typeof credentials === 'string') {
    botToken = credentials.trim();
  } else if (credentials && typeof credentials === 'object') {
    botToken = (credentials.botToken || credentials.token || '').trim();
  } else if (config && typeof config === 'object') {
    botToken = (config.botToken || config.token || '').trim();
  }

  if (!botToken) {
    return {
      success: false,
      message: 'Slack Bot User OAuth Token is required.',
    };
  }

  if (!botToken.startsWith('xoxb-')) {
    return {
      success: false,
      message: 'Invalid Slack bot token format. Bot tokens must begin with "xoxb-".',
    };
  }

  const { WebClient } = require('@slack/web-api');
  const client = new WebClient(botToken);

  // 1. Verify authentication
  const authRes = await client.auth.test();
  if (!authRes.ok) {
    return {
      success: false,
      message: `Slack authentication failed: ${authRes.error || 'Invalid credentials'}.`,
    };
  }

  const workspaceName = authRes.team || authRes.url || 'Slack Workspace';

  // 2. Count readable channels
  let channelCount: number;
  try {
    const listRes = await client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 100,
    });
    channelCount = Array.isArray(listRes.channels) ? listRes.channels.length : 0;
  } catch (err: any) {
    const rawMsg = err?.data?.error || err?.message || String(err);
    if (rawMsg.includes('missing_scope')) {
      return {
        success: false,
        message: 'Slack authorization error: Missing required OAuth scope "channels:read". Please add channels:read under Bot Token Scopes in your Slack app.',
        details: { workspaceName },
      };
    }
    throw err;
  }

  if (channelCount === 0) {
    return {
      success: true,
      warning: true,
      message: `Connected to Slack workspace "${workspaceName}", but 0 readable channels were found. Ensure the Slack app bot is invited to public or target channels.`,
      details: { workspaceName, channelCount: 0 },
    };
  }

  return {
    success: true,
    warning: false,
    message: `Successfully connected to Slack workspace "${workspaceName}". Found ${channelCount} readable channel(s).`,
    details: { workspaceName, channelCount },
  };
}

/**
 * Tests connection to an external data source without persisting credentials or modifying state.
 */
export async function testConnectorSource(
  type: string,
  config: Record<string, any> = {},
  credentials: any = {},
  isAdmin = false
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
      return await testPostgresSource(config, credentials, isAdmin);
    }
    if (normalizedType === 'slack') {
      return await testSlackSource(config, credentials);
    }

    return {
      success: false,
      message: `Unsupported connector type "${type}". Allowed types: postgres, s3, gdrive, slack.`,
    };
  } catch (err: any) {
    logger.warn(`Connector test connection failed for ${type}:`, err);
    return {
      success: false,
      message: formatFriendlyConnectorError(err),
    };
  }
}
