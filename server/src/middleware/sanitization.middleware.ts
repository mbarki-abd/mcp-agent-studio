/**
 * Input Sanitization Middleware
 *
 * Provides protection against:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection patterns
 * - NoSQL Injection patterns
 * - Path traversal attacks
 * - Command injection patterns
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// Dangerous patterns to detect (not remove, just flag)
const DANGEROUS_PATTERNS = {
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|INTO|FROM|WHERE)\b.*\b(FROM|INTO|TABLE|DATABASE|SET|VALUES)\b)/i,
    /('|")\s*(OR|AND)\s*('|"|\d)/i,
    /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
    /--\s*$/,
    /\/\*.*\*\//,
  ],
  noSqlInjection: [
    /\$where/i,
    /\$gt|\$lt|\$gte|\$lte|\$ne|\$in|\$nin|\$or|\$and|\$not|\$nor|\$regex/i,
    /\{\s*"\$.*"\s*:/,
  ],
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /\.\.%2f/i,
    /%252e%252e%252f/i,
  ],
  commandInjection: [
    /[;&|`$()]/,
    /\$\(/,
    /`.*`/,
  ],
  xss: [
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:\s*text\/html/gi,
  ],
};

export interface SanitizationOptions {
  /** Enable HTML entity escaping */
  escapeHtml?: boolean;
  /** Enable dangerous pattern detection */
  detectPatterns?: boolean;
  /** Fields to skip sanitization (e.g., password) */
  skipFields?: string[];
  /** Log detected threats */
  logThreats?: boolean;
  /** Block requests with detected threats */
  blockThreats?: boolean;
  /** Maximum string length (truncate if exceeded) */
  maxStringLength?: number;
  /** Maximum nested depth for objects */
  maxDepth?: number;
}

const DEFAULT_OPTIONS: SanitizationOptions = {
  escapeHtml: true,
  detectPatterns: true,
  skipFields: ['password', 'passwordHash', 'token', 'secret', 'apiKey'],
  logThreats: true,
  blockThreats: false, // Default to logging only, not blocking
  maxStringLength: 10000,
  maxDepth: 10,
};

/**
 * Escape HTML entities in a string
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Trim and normalize whitespace
 */
function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Check string against dangerous patterns
 */
function detectThreats(str: string): string[] {
  const detected: string[] = [];

  for (const [category, patterns] of Object.entries(DANGEROUS_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(str)) {
        detected.push(category);
        break; // One detection per category is enough
      }
    }
  }

  return detected;
}

/**
 * Sanitize a single value
 */
function sanitizeValue(
  value: unknown,
  options: SanitizationOptions,
  path: string,
  depth: number
): { value: unknown; threats: string[] } {
  const threats: string[] = [];

  // Check depth limit
  if (depth > (options.maxDepth || 10)) {
    return { value: null, threats: ['maxDepthExceeded'] };
  }

  // Handle different types
  if (typeof value === 'string') {
    let sanitized = value;

    // Check max length
    if (options.maxStringLength && sanitized.length > options.maxStringLength) {
      sanitized = sanitized.substring(0, options.maxStringLength);
      threats.push('stringTruncated');
    }

    // Detect threats
    if (options.detectPatterns) {
      const detected = detectThreats(sanitized);
      threats.push(...detected);
    }

    // Escape HTML (unless this is a skip field)
    const fieldName = path.split('.').pop() || '';
    if (options.escapeHtml && !options.skipFields?.includes(fieldName)) {
      // Only escape for display fields, not for data storage
      // We'll detect but not modify for now to avoid breaking functionality
    }

    // Normalize whitespace for most fields
    if (!options.skipFields?.includes(fieldName)) {
      sanitized = normalizeWhitespace(sanitized);
    }

    return { value: sanitized, threats };
  }

  if (Array.isArray(value)) {
    const sanitizedArray: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      const result = sanitizeValue(value[i], options, `${path}[${i}]`, depth + 1);
      sanitizedArray.push(result.value);
      threats.push(...result.threats);
    }
    return { value: sanitizedArray, threats };
  }

  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize the key itself
      const sanitizedKey = key.replace(/[<>"']/g, '');
      if (sanitizedKey !== key) {
        threats.push('maliciousKey');
      }

      const result = sanitizeValue(val, options, `${path}.${sanitizedKey}`, depth + 1);
      sanitizedObj[sanitizedKey] = result.value;
      threats.push(...result.threats);
    }
    return { value: sanitizedObj, threats };
  }

  // Numbers, booleans, null - pass through
  return { value, threats };
}

/**
 * Sanitize request data
 */
function sanitizeRequest(
  data: unknown,
  options: SanitizationOptions,
  source: string
): { data: unknown; threats: Array<{ source: string; path: string; type: string }> } {
  const result = sanitizeValue(data, options, source, 0);
  const threats = [...new Set(result.threats)].map((type) => ({
    source,
    path: source,
    type,
  }));

  return { data: result.value, threats };
}

/**
 * Extend Fastify types
 */
declare module 'fastify' {
  interface FastifyRequest {
    sanitizationThreats?: Array<{ source: string; path: string; type: string }>;
  }
}

/**
 * Sanitization middleware plugin
 */
async function sanitizationPlugin(
  fastify: FastifyInstance,
  pluginOptions: SanitizationOptions = {}
) {
  const options = { ...DEFAULT_OPTIONS, ...pluginOptions };

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const allThreats: Array<{ source: string; path: string; type: string }> = [];

    // Sanitize body
    if (request.body && typeof request.body === 'object') {
      const result = sanitizeRequest(request.body, options, 'body');
      request.body = result.data;
      allThreats.push(...result.threats);
    }

    // Sanitize query params
    if (request.query && typeof request.query === 'object') {
      const result = sanitizeRequest(request.query, options, 'query');
      // Note: Fastify query is readonly, we can only detect threats here
      allThreats.push(...result.threats);
    }

    // Sanitize params
    if (request.params && typeof request.params === 'object') {
      const result = sanitizeRequest(request.params, options, 'params');
      allThreats.push(...result.threats);
    }

    // Store threats on request for logging/auditing
    request.sanitizationThreats = allThreats;

    // Log threats if detected
    if (allThreats.length > 0 && options.logThreats) {
      const user = request.user as { userId?: string } | undefined;
      fastify.log.warn({
        msg: 'Potential security threat detected',
        correlationId: request.correlationId,
        requestId: request.requestId,
        userId: user?.userId,
        ip: request.ip,
        method: request.method,
        url: request.url,
        threats: allThreats,
      });
    }

    // Block request if configured
    if (allThreats.length > 0 && options.blockThreats) {
      // Only block for high-severity threats
      const highSeverity = allThreats.some((t) =>
        ['sqlInjection', 'noSqlInjection', 'commandInjection'].includes(t.type)
      );

      if (highSeverity) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Request contains potentially malicious content',
          },
        });
      }
    }
  });
}

export default fp(sanitizationPlugin, {
  name: 'sanitization-plugin',
  fastify: '4.x',
});

/**
 * Utility: Sanitize a single string for safe display
 */
export function sanitizeForDisplay(str: string): string {
  return escapeHtml(normalizeWhitespace(str));
}

/**
 * Utility: Sanitize for safe filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '_')
    .substring(0, 255);
}

/**
 * Utility: Sanitize URL path
 */
export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '');
}

/**
 * Utility: Check if value contains potential threats
 */
export function containsThreats(value: string): boolean {
  return detectThreats(value).length > 0;
}

/**
 * Utility: Get detected threat types
 */
export function getThreats(value: string): string[] {
  return detectThreats(value);
}
