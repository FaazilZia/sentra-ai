import prisma from '../config/db';

/**
 * Resolves companyId for the authenticated principal (JWT user or API key).
 */
export async function resolveCompanyId(req: any): Promise<string | null> {
  if (req.user?.companyId) {
    return String(req.user.companyId);
  }
  if (req.user?.id && req.user?.role !== 'SERVICE_AGENT') {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { companyId: true },
    });
    return user?.companyId ? String(user.companyId) : null;
  }
  return null;
}
