import prisma from '../config/db';
import { encrypt, decrypt } from '../utils/encryption';

export const LLMKeysService = {
  maskKey(key: string): string {
    if (!key) return '';
    const cleanKey = key.trim();
    if (cleanKey.length <= 8) {
      return '••••' + cleanKey.slice(-2);
    }
    return cleanKey.slice(0, 4) + '••••' + cleanKey.slice(-4);
  },

  async addKey(params: {
    organizationId: string;
    provider: string;
    apiKey: string;
    addedBy: string;
  }) {
    const { organizationId, provider, apiKey, addedBy } = params;
    const encryptedKey = encrypt(apiKey);
    const maskedKey = this.maskKey(apiKey);

    return prisma.llm_keys.create({
      data: {
        organizationId,
        provider,
        maskedKey,
        encryptedKey,
        addedBy,
      },
    });
  },

  async getKeys(organizationId: string) {
    return prisma.llm_keys.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        maskedKey: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteKey(id: string, organizationId: string) {
    return prisma.llm_keys.deleteMany({
      where: {
        id,
        organizationId,
      },
    });
  },
};
