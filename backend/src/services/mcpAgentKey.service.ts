import crypto from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';

export interface AuthenticatedAgent {
  organizationId: string;
  allowedTools: string[];
  blockedTools: string[];
  agentKeyId: string;
}

export class McpAgentKeyService {
  /**
   * Generates a new cryptographically secure agent key prefixed with `sk-mcp-`.
   * Computes its SHA-256 hash and stores metadata in the DB.
   * Returns the raw key ONLY once.
   */
  static async createAgentKey(
    organizationId: string,
    name: string,
    allowedTools: string[] = [],
    blockedTools: string[] = []
  ): Promise<{ rawKey: string; keyPrefix: string; name: string }> {
    try {
      // 1. Generate 32 random hex bytes (64 chars) and prepend with `sk-mcp-`
      const randomHex = crypto.randomBytes(32).toString('hex');
      const rawKey = `sk-mcp-${randomHex}`;
      
      // 2. The prefix stored is the first 12 characters of the raw key
      const keyPrefix = rawKey.substring(0, 12);
      
      // 3. Hash the raw key with SHA-256
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      
      // 4. Save prefix + hash + metadata to the DB
      await prisma.mcp_agent_keys.create({
        data: {
          organizationId,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          allowed_tools: allowedTools,
          blocked_tools: blockedTools,
          is_active: true,
        },
      });

      logger.info(`[MCP-KEY] Created new agent key: prefix="${keyPrefix}", org="${organizationId}"`);
      
      return {
        rawKey,
        keyPrefix,
        name,
      };
    } catch (error) {
      logger.error('[MCP-KEY] Failed to create agent key:', error);
      throw error;
    }
  }

  /**
   * Authenticates an agent key by its raw value.
   * Verifies SHA-256 hash matching and updates `last_used_at` asynchronously.
   * Throws an error if invalid or inactive.
   */
  static async authenticateAgentKey(rawKey: string): Promise<AuthenticatedAgent> {
    if (!rawKey || !rawKey.startsWith('sk-mcp-')) {
      throw new Error('Invalid agent key format');
    }

    // 1. Extract prefix (first 12 characters)
    const keyPrefix = rawKey.substring(0, 12);
    
    // 2. Fetch active key record matching the prefix
    const keyRecord = await prisma.mcp_agent_keys.findFirst({
      where: {
        key_prefix: keyPrefix,
        is_active: true,
      },
    });

    if (!keyRecord) {
      logger.warn(`[MCP-AUTH] Authentication failed: key prefix "${keyPrefix}" not found or inactive`);
      throw new Error('Unauthorized');
    }

    // 3. Verify key hash using SHA-256
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    if (keyRecord.key_hash !== keyHash) {
      logger.warn(`[MCP-AUTH] Authentication failed: key prefix "${keyPrefix}" hash mismatch`);
      throw new Error('Unauthorized');
    }

    // 4. Update last_used_at in the background (asynchronous)
    prisma.mcp_agent_keys.update({
      where: { id: keyRecord.id },
      data: { last_used_at: new Date() },
    }).catch((err) => {
      logger.error(`[MCP-AUTH] Failed to update last_used_at for key "${keyRecord.id}":`, err);
    });

    return {
      organizationId: keyRecord.organizationId,
      allowedTools: keyRecord.allowed_tools,
      blockedTools: keyRecord.blocked_tools,
      agentKeyId: keyRecord.id,
    };
  }

  /**
   * Lists all agent keys (prefix + metadata) for an organization.
   * The raw key and the key hash are never returned.
   */
  static async listAgentKeys(organizationId: string) {
    try {
      return await prisma.mcp_agent_keys.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          key_prefix: true,
          allowed_tools: true,
          blocked_tools: true,
          is_active: true,
          last_used_at: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      logger.error(`[MCP-KEY] Failed to list agent keys for org "${organizationId}":`, error);
      throw error;
    }
  }

  /**
   * Revokes an agent key by setting `is_active = false`.
   */
  static async revokeAgentKey(id: string, organizationId: string): Promise<void> {
    try {
      await prisma.mcp_agent_keys.update({
        where: {
          id,
          organizationId,
        },
        data: {
          is_active: false,
        },
      });
      logger.info(`[MCP-KEY] Revoked agent key "${id}" for org "${organizationId}"`);
    } catch (error) {
      logger.error(`[MCP-KEY] Failed to revoke agent key "${id}":`, error);
      throw error;
    }
  }
}
