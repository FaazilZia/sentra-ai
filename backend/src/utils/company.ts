import prisma from '../config/db';

/**
 * Resolves organizationId for the authenticated principal (JWT user or API key).
 */
export async function resolveOrganizationId(req: any): Promise<string | null> {
  if (req.user?.organizationId) {
    return String(req.user.organizationId);
  }
  if (req.user?.id && req.user?.role !== 'SERVICE_AGENT') {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { organizationId: true },
    });
    return user?.organizationId ? String(user.organizationId) : null;
  }
  return null;
}
