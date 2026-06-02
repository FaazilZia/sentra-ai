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

export const parseCursorPagination = (query: any) => {
  const limitQuery = query.limit;
  const cursor = query.cursor ? String(query.cursor) : undefined;

  const defaultLimit = 50;
  const maxLimit = 200;

  let limit = defaultLimit;
  if (limitQuery !== undefined) {
    const parsed = Number.parseInt(limitQuery as string, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      limit = defaultLimit;
    } else if (parsed > maxLimit) {
      throw new Error('limit must be ≤ 200');
    } else {
      limit = parsed;
    }
  }

  return { limit, cursor };
};
