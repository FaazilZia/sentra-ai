import prisma from '../config/db';

/**
 * Resolves tenant_id for the authenticated principal (JWT user or API key).
 */
export async function resolveTenantId(req: any): Promise<string | null> {
  if (req.user?.tenant_id) {
    return String(req.user.tenant_id);
  }
  if (req.user?.id && req.user?.role !== 'SERVICE_AGENT') {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { tenant_id: true },
    });
    return user?.tenant_id ? String(user.tenant_id) : null;
  }
  return null;
}
