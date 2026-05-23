export const buildTenantQuery = (organizationId: string) => {
  return {
    where: { organizationId },
    orderBy: { created_at: 'desc' as const }
  };
};
