/**
 * Enterprise Pagination Parser Utility
 * Standardizes query page and limit inputs with fallback defaults and safe bounds.
 */
export const parsePagination = (query: any, defaultLimit = 20, maxLimit = 200) => {
  const page = Number.parseInt(query.page as string, 10) || 1;
  const rawLimit = Number.parseInt(query.limit as string, 10) || defaultLimit;
  const limit = Math.min(rawLimit, maxLimit);
  return { page, limit };
};
