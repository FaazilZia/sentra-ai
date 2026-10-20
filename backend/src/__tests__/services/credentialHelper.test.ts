import {
  encryptCredentials,
  decryptCredentials,
  sanitizeConnector,
  normalizePrivateKey,
  parseServiceAccountInput,
} from '../../utils/credentialHelper';

describe('Credential Helper', () => {
  it('encrypts and decrypts credentials object correctly', () => {
    const creds = {
      accessKeyId: 'AKIA1234567890EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
      bucketName: 'sentra-vault'
    };

    const encrypted = encryptCredentials(creds);
    expect(encrypted).not.toContain('AKIA1234567890EXAMPLE');
    expect(encrypted).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptCredentials<typeof creds>(encrypted);
    expect(decrypted).toEqual(creds);
  });

  it('encrypts and decrypts plain string', () => {
    const secret = 'https://hooks.slack.com/services/T00/B00/SECRET_KEY';
    const encrypted = encryptCredentials(secret);
    expect(encrypted).not.toContain('SECRET_KEY');

    const decrypted = decryptCredentials<string>(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('avoids double encryption if string is already encrypted format', () => {
    const secret = 'https://hooks.slack.com/services/T00/B00/KEY';
    const encryptedOnce = encryptCredentials(secret);
    const encryptedTwice = encryptCredentials(encryptedOnce);

    expect(encryptedTwice).toBe(encryptedOnce);
    expect(decryptCredentials<string>(encryptedTwice)).toBe(secret);
  });

  it('gracefully handles legacy plaintext JSON on decrypt', () => {
    const legacyJson = JSON.stringify({ host: 'localhost', user: 'postgres' });
    const decrypted = decryptCredentials<{ host: string; user: string }>(legacyJson);
    expect(decrypted).toEqual({ host: 'localhost', user: 'postgres' });
  });

  it('sanitizes connector records so credentials and raw secrets are stripped', () => {
    const connector = {
      id: 'conn-1',
      name: 'Production S3',
      type: 's3',
      credentials: 'encrypted-token-string',
      config: {
        bucket: 'my-bucket',
        secretAccessKey: 'super-secret',
        password: 'raw-password',
        private_key: 'raw-key',
      }
    };

    const sanitized = sanitizeConnector(connector);
    expect((sanitized as any).credentials).toBeUndefined();
    expect((sanitized.config as any).secretAccessKey).toBeUndefined();
    expect((sanitized.config as any).password).toBeUndefined();
    expect((sanitized.config as any).private_key).toBeUndefined();
    expect((sanitized.config as any).bucket).toBe('my-bucket');
  });

  describe('normalizePrivateKey', () => {
    it('normalizes escaped \\n into real newlines', () => {
      const raw = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\\n-----END PRIVATE KEY-----\\n';
      const normalized = normalizePrivateKey(raw);
      expect(normalized).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----');
    });

    it('normalizes CRLF \\r\\n and escaped \\r\\n', () => {
      const raw = '-----BEGIN PRIVATE KEY-----\r\nMIIE...\r\n-----END PRIVATE KEY-----';
      const normalized = normalizePrivateKey(raw);
      expect(normalized).toBe('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----');
    });

    it('strips surrounding quotes if pasted as string literal', () => {
      const raw = '"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n"';
      const normalized = normalizePrivateKey(raw);
      expect(normalized).toBe('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----');
    });
  });

  describe('parseServiceAccountInput', () => {
    it('parses uploaded service account JSON file string', () => {
      const jsonStr = JSON.stringify({
        type: 'service_account',
        project_id: 'my-proj',
        client_email: 'sa@my-proj.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n',
      });

      const parsed = parseServiceAccountInput(jsonStr);
      expect(parsed.client_email).toBe('sa@my-proj.iam.gserviceaccount.com');
      expect(parsed.private_key).toBe('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----');
      expect(parsed.project_id).toBe('my-proj');
    });

    it('parses raw private key string directly', () => {
      const rawKey = '-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----';
      const parsed = parseServiceAccountInput(rawKey);
      expect(parsed.private_key).toBe('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----');
      expect(parsed.client_email).toBeUndefined();
    });
  });
});
