import {
  sanitizeString,
  sanitizeObject,
  sentryBeforeSend,
} from '../utils/sentrySanitizer';

describe('Sentry Sanitizer - Secrets & PII Scrubbing', () => {
  describe('sanitizeString', () => {
    it('returns falsy or non-string inputs unchanged', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null as any)).toBe(null);
      expect(sanitizeString(undefined as any)).toBe(undefined);
      expect(sanitizeString(12345 as any)).toBe(12345);
    });

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

    it('redacts database credentials in connection strings (postgres and postgresql)', () => {
      const input = 'Database error at postgresql://postgres:SuperSecretPassword123!@db.internal.sentra:5432/production_db';
      const output = sanitizeString(input);
      expect(output).not.toContain('SuperSecretPassword123!');
      expect(output).toContain('[REDACTED_DB_CREDENTIALS]');

      const input2 = 'Database error at postgres://user:anotherPass123@localhost:5432/sentra_test';
      const output2 = sanitizeString(input2);
      expect(output2).not.toContain('anotherPass123');
      expect(output2).toContain('[REDACTED_DB_CREDENTIALS]');
    });

    it('redacts redis credentials in connection strings (redis and rediss)', () => {
      const input = 'Connection failed to redis://:SecretRedisPass123!@redis.sentra.internal:6379';
      const output = sanitizeString(input);
      expect(output).not.toContain('SecretRedisPass123!');
      expect(output).toContain('[REDACTED_REDIS_CREDENTIALS]');

      const input2 = 'Connection failed to rediss://default:SecureRedisSSLPass@ssl.redis:6380';
      const output2 = sanitizeString(input2);
      expect(output2).not.toContain('SecureRedisSSLPass');
      expect(output2).toContain('[REDACTED_REDIS_CREDENTIALS]');
    });

    it('redacts API keys with known prefixes', () => {
      const prefixes = [
        'sk-1234567890abcdef1234567890',
        'ghp-abcdef1234567890abcdef1234',
        'gho-abcdef1234567890abcdef1234',
        'pat-abcdef1234567890abcdef1234',
        'xoxb-1234567890-abcdef123456',
        'xoxp-1234567890-abcdef123456',
        'sentra_live-1234567890abcdef1234',
        'sentra_test-1234567890abcdef1234',
      ];

      for (const key of prefixes) {
        const input = `Failed key: ${key}`;
        const output = sanitizeString(input);
        expect(output).not.toContain(key);
        expect(output).toContain('[REDACTED_API_KEY]');
      }
    });

    it('redacts Bearer authorization header values', () => {
      const input = 'Failed request with Bearer secret-auth-token-12345';
      const output = sanitizeString(input);
      expect(output).not.toContain('secret-auth-token-12345');
      expect(output).toContain('Bearer [REDACTED_TOKEN]');
    });
  });

  describe('sanitizeObject', () => {
    it('handles primitive non-object inputs', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
      expect(sanitizeObject(42)).toBe(42);
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject('hello test@example.com')).toBe('hello [REDACTED_EMAIL]');
    });

    it('stops recursing when depth exceeds 8', () => {
      let deep: any = { value: 'secret' };
      for (let i = 0; i < 10; i++) {
        deep = { child: deep };
      }
      const sanitized = sanitizeObject(deep);
      expect(JSON.stringify(sanitized)).toContain('[MAX_DEPTH_REACHED]');
    });

    it('redacts sensitive fields like passwords, tokens, and secrets in object keys', () => {
      const payload = {
        username: 'service-admin',
        password: 'PlainTextPassword123',
        password_hash: 'hash-value-12345',
        jwt_secret: 'super-secret-key-that-must-never-leak',
        refresh_secret: 'refresh-key-secret-123',
        encryption_key: '0123456789abcdef0123456789abcdef',
        encryptionkey: 'legacy-key',
        token: 'token-val',
        refresh_token: 'refresh-token-val',
        accesstoken: 'access-token-val',
        access_token: 'access-token-val-2',
        refreshtoken: 'refresh-token-val-2',
        authorization: 'Bearer my-token',
        cookie: 'session=123',
        'set-cookie': 'session=123',
        api_key: 'api-key-val',
        apikey: 'apikey-val',
        'x-api-key': 'x-api-key-val',
        'x-auth-token': 'x-auth-token-val',
        smtp_pass: 'smtp-pass-val',
        smtp_user: 'smtp-user-val',
        credit_card: '4111111111111111',
        creditcard: '4111111111111111',
        ssn: '000-00-0000',
        private_key: 'private-key-val',
        privatekey: 'privatekey-val',
        database_url: 'postgres://db',
        redis_url: 'redis://redis',
        metadata: {
          nestedToken: 'nested-token-value',
          userCredential: 'credential-data',
          authProvider: 'google',
          safeField: 'harmless value',
        },
      };

      const sanitized = sanitizeObject(payload);
      expect(sanitized.password).toBe('[REDACTED_SECRET]');
      expect(sanitized.password_hash).toBe('[REDACTED_SECRET]');
      expect(sanitized.jwt_secret).toBe('[REDACTED_SECRET]');
      expect(sanitized.refresh_secret).toBe('[REDACTED_SECRET]');
      expect(sanitized.encryption_key).toBe('[REDACTED_SECRET]');
      expect(sanitized.encryptionkey).toBe('[REDACTED_SECRET]');
      expect(sanitized.token).toBe('[REDACTED_SECRET]');
      expect(sanitized.authorization).toBe('[REDACTED_SECRET]');
      expect(sanitized.cookie).toBe('[REDACTED_SECRET]');
      expect(sanitized['set-cookie']).toBe('[REDACTED_SECRET]');
      expect(sanitized.api_key).toBe('[REDACTED_SECRET]');
      expect(sanitized['x-api-key']).toBe('[REDACTED_SECRET]');
      expect(sanitized.smtp_pass).toBe('[REDACTED_SECRET]');
      expect(sanitized.credit_card).toBe('[REDACTED_SECRET]');
      expect(sanitized.ssn).toBe('[REDACTED_SECRET]');
      expect(sanitized.private_key).toBe('[REDACTED_SECRET]');
      expect(sanitized.database_url).toBe('[REDACTED_SECRET]');
      expect(sanitized.redis_url).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.nestedToken).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.userCredential).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.authProvider).toBe('[REDACTED_SECRET]');
      expect(sanitized.metadata.safeField).toBe('harmless value');
    });

    it('redacts PII and secrets inside array values', () => {
      const list = [
        'user1@example.com',
        'safe item',
        'postgres://admin:pass123@localhost:5432/db',
        { token: 'secret-inside-array' },
      ];
      const sanitized = sanitizeObject(list);
      expect(sanitized[0]).toBe('[REDACTED_EMAIL]');
      expect(sanitized[1]).toBe('safe item');
      expect(sanitized[2]).toContain('[REDACTED_DB_CREDENTIALS]');
      expect(sanitized[3].token).toBe('[REDACTED_SECRET]');
    });
  });

  describe('sentryBeforeSend', () => {
    it('completely strips PII from user context', () => {
      const event: any = {
        user: {
          id: 'user-uuid-123 user@example.com',
          email: 'admin@sentra.ai',
          ip_address: '192.168.1.100',
          username: 'admin',
        },
        request: {
          url: 'https://api.sentra.ai/auth?token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
          query_string: 'key=sk-1234567890abcdef1234567890',
          cookies: { session: 'session-id' },
          data: {
            authSecret: 'my-secret',
            normalData: 'clean value',
          },
          headers: {
            authorization: 'Bearer secret-jwt-token',
            cookie: 'sentra_access_token=secret_cookie',
            'set-cookie': 'session_token=abc',
            'x-api-key': 'secret-key',
            'x-auth-token': 'auth-token',
            'proxy-authorization': 'proxy-token',
            'user-agent': 'Mozilla/5.0',
          },
        },
        extra: {
          dbString: 'postgresql://usr:pass@host:5432/db',
        },
        contexts: {
          custom: {
            apiKey: 'sk-1234567890abcdef1234567890',
          },
        },
      };

      const result = sentryBeforeSend(event);
      expect(result).not.toBeNull();
      expect(result.user.email).toBeUndefined();
      expect(result.user.ip_address).toBeUndefined();
      expect(result.user.username).toBeUndefined();
      expect(result.user.id).toBe('user-uuid-123 [REDACTED_EMAIL]');
      expect(result.request.url).toContain('[REDACTED_JWT]');
      expect(result.request.query_string).toContain('[REDACTED_API_KEY]');
      expect(result.request.cookies).toBe('[REDACTED_COOKIES]');
      expect(result.request.data.authSecret).toBe('[REDACTED_SECRET]');
      expect(result.request.data.normalData).toBe('clean value');
      expect(result.request.headers.authorization).toBe('[REDACTED_HEADER]');
      expect(result.request.headers.cookie).toBe('[REDACTED_HEADER]');
      expect(result.request.headers['set-cookie']).toBe('[REDACTED_HEADER]');
      expect(result.request.headers['x-api-key']).toBe('[REDACTED_HEADER]');
      expect(result.request.headers['x-auth-token']).toBe('[REDACTED_HEADER]');
      expect(result.request.headers['proxy-authorization']).toBe('[REDACTED_HEADER]');
      expect(result.request.headers['user-agent']).toBe('Mozilla/5.0');
      expect(result.extra.dbString).toContain('[REDACTED_DB_CREDENTIALS]');
      expect(result.contexts.custom.apiKey).toBe('[REDACTED_SECRET]');
    });

    it('scrubs breadcrumb messages and exception stacks including frame vars', () => {
      const event: any = {
        breadcrumbs: [
          { message: 'Failed to connect: postgres://user:pass@localhost:5432/db', data: { token: 'secret' } },
          { message: 'Notification sent to user developer@sentra.ai' },
          { timestamp: 123456 },
        ],
        exception: {
          values: [
            {
              value: 'Auth token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl was rejected',
              stacktrace: {
                frames: [
                  { vars: { password: 'plain', safe: 'val' } },
                  { filename: 'server.ts' },
                ],
              },
            },
            {
              // Exception without value or stacktrace
              type: 'RuntimeError',
            },
          ],
        },
      };

      const result = sentryBeforeSend(event);
      expect(result.breadcrumbs[0].message).toContain('[REDACTED_DB_CREDENTIALS]');
      expect(result.breadcrumbs[0].data.token).toBe('[REDACTED_SECRET]');
      expect(result.breadcrumbs[1].message).toContain('[REDACTED_EMAIL]');
      expect(result.exception.values[0].value).toContain('[REDACTED_JWT]');
      expect(result.exception.values[0].stacktrace.frames[0].vars.password).toBe('[REDACTED_SECRET]');
      expect(result.exception.values[0].stacktrace.frames[0].vars.safe).toBe('val');
    });

    it('handles exceptions thrown inside sentryBeforeSend and returns minimal fallback event', () => {
      // Create an object that throws an error when accessing a property
      const faultyEvent: any = {
        get user() {
          throw new Error('Simulated memory/property access error');
        },
      };

      const fallback = sentryBeforeSend(faultyEvent);
      expect(fallback).toBeDefined();
      expect(fallback.message).toContain('Sanitized error: Sentry beforeSend sanitizer handled an error report');
      expect(fallback.level).toBe('error');
      expect(typeof fallback.timestamp).toBe('number');
    });
  });
});
