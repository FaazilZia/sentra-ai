import type { Event as SentryEvent, Breadcrumb } from '@sentry/node';
import logger from './logger';

// Secret and PII patterns for regex redaction
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const JWT_REGEX = /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
const DB_CONN_REGEX = /postgres(?:ql)?:\/\/[^\s@]+@[^\s/]+/gi;
const REDIS_CONN_REGEX = /rediss?:\/\/[^\s@]+@[^\s/]+/gi;
const API_KEY_REGEX = /\b(?:sk|ghp|gho|pat|xoxb|xoxp|sentra_live|sentra_test)-[A-Za-z0-9_-]{16,}\b/gi;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9._-]+/gi;

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

/**
 * Sentry beforeSend hook that strips secrets, tokens, database URLs, and PII.
 */
export function sentryBeforeSend(event: any, hint?: any): any {
  try {
    // 1. Scrub User Context (Strip email, IP, and personal identifiers)
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
      // Guarantee only opaque ID is retained
      if (event.user.id && typeof event.user.id === 'string') {
        event.user.id = sanitizeString(event.user.id);
      }
    }

    // 2. Scrub Request Context
    if (event.request) {
      if (event.request.headers) {
        const headers = { ...event.request.headers };
        const scrubHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization'];
        for (const h of scrubHeaders) {
          if (headers[h]) headers[h] = '[REDACTED_HEADER]';
        }
        event.request.headers = headers;
      }
      if (event.request.cookies) {
        event.request.cookies = '[REDACTED_COOKIES]' as any;
      }
      if (event.request.data) {
        event.request.data = sanitizeObject(event.request.data);
      }
      if (event.request.query_string) {
        event.request.query_string = sanitizeString(String(event.request.query_string));
      }
      if (event.request.url) {
        event.request.url = sanitizeString(event.request.url);
      }
    }

    // 3. Scrub Breadcrumbs
    if (event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map((bc: Breadcrumb) => {
        if (bc.message) bc.message = sanitizeString(bc.message);
        if (bc.data) bc.data = sanitizeObject(bc.data);
        return bc;
      });
    }

    // 4. Scrub Exception Messages & Stack Traces
    if (event.exception?.values) {
      event.exception.values.forEach((exc: any) => {
        if (exc.value) exc.value = sanitizeString(exc.value);
        if (exc.stacktrace?.frames) {
          exc.stacktrace.frames.forEach((frame: any) => {
            if (frame.vars) frame.vars = sanitizeObject(frame.vars);
          });
        }
      });
    }

    // 5. Scrub Extra and Contexts
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
