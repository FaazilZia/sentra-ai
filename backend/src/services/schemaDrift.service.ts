import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import logger from '../utils/logger';

export interface MissingColumn {
  table: string;
  column: string;
}

export interface SchemaCheckResult {
  ok: boolean;
  missing: MissingColumn[];
  error?: string;
  cached?: boolean;
}

interface InformationSchemaRow {
  table_name: string;
  column_name: string;
}

interface CacheEntry {
  result: SchemaCheckResult;
  timestamp: number;
}

let cachedCheck: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Resets the in-memory schema drift cache. Useful for tests.
 */
export function clearSchemaDriftCache(): void {
  cachedCheck = null;
}

/**
 * Extracts expected tables and columns dynamically from Prisma Client's generated DMMF metadata.
 * Respects @@map for table names and @map for column names.
 * Filters exclusively for scalar and enum fields (physical columns in database tables).
 */
export function getExpectedSchemaFromDmmf(): Map<string, Set<string>> {
  const schema = new Map<string, Set<string>>();

  const models = Prisma.dmmf?.datamodel?.models || [];
  for (const model of models) {
    const tableName = model.dbName || model.name;
    let colSet = schema.get(tableName);
    if (!colSet) {
      colSet = new Set<string>();
      schema.set(tableName, colSet);
    }

    for (const field of model.fields) {
      // Only scalar and enum fields map to physical database table columns.
      // Relation fields (kind === 'object') are logical abstractions represented by scalar foreign keys.
      if (field.kind === 'scalar' || field.kind === 'enum') {
        const colName = field.dbName || field.name;
        colSet.add(colName);
      }
    }
  }

  return schema;
}

/**
 * Compares the expected Prisma model columns against the real columns in information_schema.columns.
 * Results are cached for ~60 seconds to ensure /ready remains lightweight.
 */
export async function checkSchemaDrift(options?: {
  forceFresh?: boolean;
  queryRunner?: () => Promise<InformationSchemaRow[]>;
}): Promise<SchemaCheckResult> {
  const now = Date.now();
  if (!options?.forceFresh && cachedCheck && now - cachedCheck.timestamp < CACHE_TTL_MS) {
    return { ...cachedCheck.result, cached: true };
  }

  try {
    let rows: InformationSchemaRow[];
    if (options?.queryRunner) {
      rows = await options.queryRunner();
    } else {
      rows = await prisma.$queryRaw<InformationSchemaRow[]>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = CURRENT_SCHEMA OR table_schema = 'public'
      `;
    }

    const actualSchema = new Map<string, Set<string>>();
    for (const row of rows) {
      let cols = actualSchema.get(row.table_name);
      if (!cols) {
        cols = new Set<string>();
        actualSchema.set(row.table_name, cols);
      }
      cols.add(row.column_name);
    }

    const expectedSchema = getExpectedSchemaFromDmmf();
    const missing: MissingColumn[] = [];

    for (const [expectedTable, expectedCols] of expectedSchema.entries()) {
      // Lookup table in actual schema (case-insensitive fallback)
      let actualCols = actualSchema.get(expectedTable);
      if (!actualCols) {
        const lowerExpected = expectedTable.toLowerCase();
        for (const [t, cols] of actualSchema.entries()) {
          if (t.toLowerCase() === lowerExpected) {
            actualCols = cols;
            break;
          }
        }
      }

      if (!actualCols) {
        // Table itself is missing in the database
        for (const col of expectedCols) {
          missing.push({ table: expectedTable, column: col });
        }
        continue;
      }

      for (const expectedCol of expectedCols) {
        let hasCol = actualCols.has(expectedCol);
        if (!hasCol) {
          const lowerCol = expectedCol.toLowerCase();
          for (const c of actualCols) {
            if (c.toLowerCase() === lowerCol) {
              hasCol = true;
              break;
            }
          }
        }

        if (!hasCol) {
          missing.push({ table: expectedTable, column: expectedCol });
        }
      }
    }

    const result: SchemaCheckResult = {
      ok: missing.length === 0,
      missing,
    };

    cachedCheck = { result, timestamp: now };
    return result;
  } catch (err: any) {
    logger.error('Failed to query information_schema for schema drift check:', err?.message || err);
    // Return sanitized failure without leaking connection details or credentials
    const failureResult: SchemaCheckResult = {
      ok: false,
      missing: [],
      error: 'Failed to inspect database schema',
    };
    return failureResult;
  }
}
