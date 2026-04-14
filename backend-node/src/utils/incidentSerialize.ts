import type { incidents } from '@prisma/client';

/** API shape expected by dashboard (metadata) vs Prisma (event_metadata) */
export function serializeIncident(row: incidents) {
  const { event_metadata, ...rest } = row;
  return {
    ...rest,
    metadata: event_metadata ?? {},
    event_metadata,
  };
}
