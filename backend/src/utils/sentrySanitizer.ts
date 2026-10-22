import type { Event as SentryEvent, Breadcrumb } from '@sentry/node';
import logger from './logger';

// Secret and PII patterns for regex redaction
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_.+/=-]{10,})?\b/g;
const DB_CONN_REGEX = /postgres(?:ql)?:\/\/[^\s@]+@[^\s/]+/gi;
const REDIS_CONN_REGEX = /rediss?:\/\/[^\s@]+@[^\s/]+/gi;
const API_KEY_REGEX = /\b(?:sk|ghp|gho|pat|xoxb|xoxp|sentra_live|sentra_test)-[a-z0-9_-]{16,}\b/gi;
const BEARER_REGEX = /Bearer\s+[a-z0-9._-]+/gi;

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'secret',
  'jwt_secret',
  'refresh_secret',
  'token',
  'refresh_token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'encryption_key',
  'encryptionkey',
  'api_key',
  'apikey',
  'x-api-key',
  'x-auth-token',
  'smtp_pass',
  'smtp_user',
  'credit_card',
  'creditcard',
  'ssn',
  'private_key',
  'privatekey',
  'database_url',
  'redis_url',
]);

/**
 * Sanitizes an arbitrary string, replacing detected secrets and PII with safe tokens.
 */
export function sanitizeString(val: string): string {
  if (!val || typeof val !== 'string') return val;
  return val
    .replace(DB_CONN_REGEX, 'postgresql://[REDACTED_DB_CREDENTIALS]@host:port')
    .replace(REDIS_CONN_REGEX, 'redis://[REDACTED_REDIS_CREDENTIALS]@host:port')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(API_KEY_REGEX, '[REDACTED_API_KEY]')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
}

/**
 * Recursively scrubs objects and arrays of sensitive key names and string values.
 */
export function sanitizeObject<T = any>(obj: T, depth: number = 0): T {
  if (depth > 8) return '[MAX_DEPTH_REACHED]' as any;
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1)) as any;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || /password|secret|token|credential|encrypt|auth/i.test(lowerKey)) {
        cleaned[key] = '[REDACTED_SECRET]';
      } else {
        cleaned[key] = sanitizeObject(value, depth + 1);
      }
    }
    return cleaned as any;
  }

  return obj;
}

function cleanUserContext(user: any): void {
  delete user.email;
  delete user.ip_address;
  delete user.username;
  if (user.id && typeof user.id === 'string') {
    user.id = sanitizeString(user.id);
  }
}

function cleanRequestContext(request: any): void {
  if (request.headers) {
    const headers = { ...request.headers };
    const scrubHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization'];
    for (const h of scrubHeaders) {
      if (headers[h]) headers[h] = '[REDACTED_HEADER]';
    }
    request.headers = headers;
  }
  if (request.cookies) {
    request.cookies = '[REDACTED_COOKIES]' as any;
  }
  if (request.data) {
    request.data = sanitizeObject(request.data);
  }
  if (request.query_string) {
    request.query_string = sanitizeString(String(request.query_string));
  }
  if (request.url) {
    request.url = sanitizeString(request.url);
  }
}

function cleanBreadcrumb(bc: Breadcrumb): Breadcrumb {
  if (bc.message) bc.message = sanitizeString(bc.message);
  if (bc.data) bc.data = sanitizeObject(bc.data);
  return bc;
}

function cleanExceptions(exceptionValues?: any[]): void {
  if (!exceptionValues) return;
  exceptionValues.forEach((exc: any) => {
    if (exc.value) exc.value = sanitizeString(exc.value);
    if (exc.stacktrace?.frames) {
      exc.stacktrace.frames.forEach((frame: any) => {
        if (frame.vars) frame.vars = sanitizeObject(frame.vars);
      });
    }
  });
}

/**
 * Sentry beforeSend hook that strips secrets, tokens, database URLs, and PII.
 */
export function sentryBeforeSend(event: any, hint?: any): any {
  try {
    if (event.user) cleanUserContext(event.user);
    if (event.request) cleanRequestContext(event.request);
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map(cleanBreadcrumb);
    }
    if (event.exception?.values) {
      cleanExceptions(event.exception.values);
    }
    if (event.extra) {
      event.extra = sanitizeObject(event.extra);
    }
    if (event.contexts) {
      event.contexts = sanitizeObject(event.contexts);
    }

    return event;
  } catch (err) {
    // If scrubber encounters an unhandled parsing anomaly, fail closed: log and return sanitized minimal event
    logger.warn('Sentry beforeSend sanitizer encountered an error, falling back to minimal sanitized event', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      message: 'Sanitized error: Sentry beforeSend sanitizer handled an error report',
      timestamp: event.timestamp || Date.now() / 1000,
      level: 'error',
    } as SentryEvent;
  }
}
