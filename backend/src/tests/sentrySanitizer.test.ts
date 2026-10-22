import {
  sanitizeString,
  sanitizeObject,
  sentryBeforeSend,
} from '../utils/sentrySanitizer';

describe('Sentry Sanitizer - Secrets & PII Scrubbing', () => {
  describe('sanitizeString', () => {
    it('redacts email addresses', () => {
      const input = 'Error contacting user alice.smith@sentra.ai regarding incident';
      const output = sanitizeString(input);
      expect(output).not.toContain('alice.smith@sentra.ai');
      expect(output).toContain('[REDACTED_EMAIL]');
    });

    it('redacts JWT access and refresh tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const input = `Authorization failed for token ${jwt}`;
      const output = sanitizeString(input);
      expect(output).not.toContain(jwt);
      expect(output).toContain('[REDACTED_JWT]');
    });

    it('redacts database credentials in connection strings', () => {
      const input = 'Database error at postgresql://postgres:SuperSecretPassword123!@db.internal.sentra:5432/production_db';
      const output = sanitizeString(input);
      expect(output).not.toContain('SuperSecretPassword123!');
      expect(output).toContain('[REDACTED_DB_CREDENTIALS]');
    });

    it('redacts redis credentials in connection strings', () => {
      const input = 'Connection failed to redis://:SecretRedisPass123!@redis.sentra.internal:6379';
      const output = sanitizeString(input);
      expect(output).not.toContain('SecretRedisPass123!');
      expect(output).toContain('[REDACTED_REDIS_CREDENTIALS]');
    });

    it('redacts API keys with known prefixes', () => {
      const input = 'Failed to authenticate using key sk-1234567890abcdef1234567890';
      const output = sanitizeString(input);
      expect(output).not.toContain('sk-1234567890abcdef1234567890');
      expect(output).toContain('[REDACTED_API_KEY]');
    });

    it('redacts Bearer authorization header values', () => {
      const input = 'Failed request with Bearer secret-auth-token-12345';
      const output = sanitizeString(input);
      expect(output).not.toContain('secret-auth-token-12345');
      expect(output).toContain('Bearer [REDACTED_TOKEN]');
    });
  });

  describe('sanitizeObject', () => {
    it('redacts sensitive fields like passwords, tokens, and secrets in object keys', () => {
      const payload = {
        username: 'service-admin',
        password: 'PlainTextPassword123',
        jwt_secret: 'super-secret-key-that-must-never-leak',
        encryption_key: '0123456789abcdef0123456789abcdef',
        metadata: {
          nestedToken: 'nested-token-value',
          safeField: 'harmless value',
        },
      };

      const sanitized = sanitizeObject(payload);
      expect(sanitized.password).toBe('[REDACTED_SECRET]');
      expect(sanitized.jwt_secret).toBe('[REDACTED_SECRET]');
      expect(sanitized.encryption_key).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.nestedToken).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.safeField).toBe('harmless value');
    });

    it('redacts PII and secrets inside array values', () => {
      const list = [
        'user1@example.com',
        'safe item',
        'postgres://admin:pass123@localhost:5432/db',
      ];
      const sanitized = sanitizeObject(list);
      expect(sanitized[0]).toBe('[REDACTED_EMAIL]');
      expect(sanitized[1]).toBe('safe item');
      expect(sanitized[2]).toContain('[REDACTED_DB_CREDENTIALS]');
    });
  });

  describe('sentryBeforeSend', () => {
    it('completely strips PII from user context', () => {
      const event: any = {
        user: {
          id: 'user-uuid-123',
          email: 'admin@sentra.ai',
          ip_address: '192.168.1.100',
          username: 'admin',
        },
        request: {
          headers: {
            authorization: 'Bearer secret-jwt-token',
            cookie: 'sentra_access_token=secret_cookie',
            'user-agent': 'Mozilla/5.0',
          },
        },
      };

      const result = sentryBeforeSend(event);
      expect(result).not.toBeNull();
      expect(result?.user?.email).toBeUndefined();
      expect(result?.user?.ip_address).toBeUndefined();
      expect(result?.user?.username).toBeUndefined();
      expect(result?.user?.id).toBe('user-uuid-123');
      expect(result?.request?.headers?.authorization).toBe('[REDACTED_HEADER]');
      expect(result?.request?.headers?.cookie).toBe('[REDACTED_HEADER]');
      expect(result?.request?.headers?.['user-agent']).toBe('Mozilla/5.0');
    });

    it('scrubs breadcrumb messages and exception stacks', () => {
      const event: any = {
        breadcrumbs: [
          { message: 'Failed to connect: postgres://user:pass@localhost:5432/db' },
          { message: 'Notification sent to user developer@sentra.ai' },
        ],
        exception: {
          values: [
            { value: 'Auth token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl was rejected' },
          ],
        },
      };

      const result = sentryBeforeSend(event);
      expect(result?.breadcrumbs?.[0].message).toContain('[REDACTED_DB_CREDENTIALS]');
      expect(result?.breadcrumbs?.[1].message).toContain('[REDACTED_EMAIL]');
      expect(result?.exception?.values?.[0].value).toContain('[REDACTED_JWT]');
    });
  });
});
