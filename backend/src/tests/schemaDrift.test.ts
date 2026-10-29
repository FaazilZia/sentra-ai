import request from 'supertest';
import app from '../app';
import prisma from '../config/db';
import {
  checkSchemaDrift,
  clearSchemaDriftCache,
  getExpectedSchemaFromDmmf,
} from '../services/schemaDrift.service';

describe('Schema Drift Guard & /ready Integration', () => {
  beforeEach(() => {
    clearSchemaDriftCache();
  });

  afterAll(() => {
    clearSchemaDriftCache();
  });

  describe('checkSchemaDrift (Unit)', () => {
    it('returns ok=true when database columns match Prisma model metadata', async () => {
      const expected = getExpectedSchemaFromDmmf();
      expect(expected.size).toBeGreaterThan(0);
      expect(expected.has('connectors')).toBe(true);

      // Construct mock rows representing a healthy database schema
      const mockRows: Array<{ table_name: string; column_name: string }> = [];
      for (const [table, cols] of expected.entries()) {
        for (const col of cols) {
          mockRows.push({ table_name: table, column_name: col });
        }
      }

      const result = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      expect(result.ok).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('detects a missing column (e.g. connectors.last_error) and returns ok=false with column details', async () => {
      const expected = getExpectedSchemaFromDmmf();
      const mockRows: Array<{ table_name: string; column_name: string }> = [];

      for (const [table, cols] of expected.entries()) {
        for (const col of cols) {
          // Simulate missing connectors.last_error
          if (table === 'connectors' && col === 'last_error') {
            continue;
          }
          mockRows.push({ table_name: table, column_name: col });
        }
      }

      const result = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      expect(result.ok).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0]).toEqual({
        table: 'connectors',
        column: 'last_error',
      });
    });

    it('detects when an entire expected table is missing from actual database schema', async () => {
      const expected = getExpectedSchemaFromDmmf();
      const mockRows: Array<{ table_name: string; column_name: string }> = [];

      // Include all tables EXCEPT 'connectors'
      for (const [table, cols] of expected.entries()) {
        if (table === 'connectors') {
          continue;
        }
        for (const col of cols) {
          mockRows.push({ table_name: table, column_name: col });
        }
      }

      const result = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      expect(result.ok).toBe(false);
      const connectorsCols = expected.get('connectors')!;
      const missingConnectorsCols = result.missing.filter(m => m.table === 'connectors');
      expect(missingConnectorsCols.length).toBe(connectorsCols.size);
    });

    it('handles case-insensitive table and column matching correctly', async () => {
      const expected = getExpectedSchemaFromDmmf();
      const mockRows: Array<{ table_name: string; column_name: string }> = [];

      for (const [table, cols] of expected.entries()) {
        // Uppercase table name and column names for connectors
        const tableName = table === 'connectors' ? table.toUpperCase() : table;
        for (const col of cols) {
          const colName = table === 'connectors' ? col.toUpperCase() : col;
          mockRows.push({ table_name: tableName, column_name: colName });
        }
      }

      const result = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      expect(result.ok).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('uses queryRunner when supplied and validates schema drift', async () => {
      const expected = getExpectedSchemaFromDmmf();
      const mockRows: Array<{ table_name: string; column_name: string }> = [];
      for (const [table, cols] of expected.entries()) {
        for (const col of cols) {
          mockRows.push({ table_name: table, column_name: col });
        }
      }

      const result = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      expect(result.ok).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('caches the schema drift check result for 60 seconds unless forceFresh is specified', async () => {
      let queryCallCount = 0;
      const mockRunner = async () => {
        queryCallCount++;
        return [{ table_name: 'connectors', column_name: 'id' }];
      };

      const firstResult = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: mockRunner,
      });
      expect(queryCallCount).toBe(1);

      // Second call without forceFresh should return cached result without calling queryRunner
      const secondResult = await checkSchemaDrift({
        queryRunner: mockRunner,
      });
      expect(queryCallCount).toBe(1);
      expect(secondResult.cached).toBe(true);
      expect(secondResult.ok).toBe(firstResult.ok);

      // Third call with forceFresh should invoke queryRunner again
      await checkSchemaDrift({
        forceFresh: true,
        queryRunner: mockRunner,
      });
      expect(queryCallCount).toBe(2);
    });

    it('handles queryRunner exceptions gracefully without leaking sensitive info', async () => {
      const failingRunner = async () => {
        throw new Error('Connection failed: postgresql://postgres:secretpassword@db.example.com:5432/db');
      };

      const result = await checkSchemaDrift({
        forceFresh: true,
        queryRunner: failingRunner,
      });

      expect(result.ok).toBe(false);
      expect(result.missing).toEqual([]);
      expect(result.error).toBe('Failed to inspect database schema');
      // Assert sensitive error message or password is not exposed
      expect(JSON.stringify(result)).not.toContain('secretpassword');
      expect(JSON.stringify(result)).not.toContain('db.example.com');
    });
  });

  describe('GET /ready with Schema Drift Check (Integration)', () => {
    it('returns HTTP 503 and lists ONLY the missing table and column when drift is simulated', async () => {
      const expected = getExpectedSchemaFromDmmf();
      const mockRows: Array<{ table_name: string; column_name: string }> = [];

      for (const [table, cols] of expected.entries()) {
        for (const col of cols) {
          if (table === 'connectors' && col === 'last_error') {
            continue;
          }
          mockRows.push({ table_name: table, column_name: col });
        }
      }

      // Prime the cache with the drifted schema
      await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      const res = await request(app).get('/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body.checks.schema).toBe('failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.schema).toBeDefined();
      expect(res.body.errors.schema.missing).toEqual([
        { table: 'connectors', column: 'last_error' },
      ]);

      // Verify no sensitive connection details or credentials appear anywhere in response
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('postgresql://');
      expect(bodyStr).not.toContain('postgres:');
    });

    it('returns ready with schema ok when database schema matches Prisma models', async () => {
      const expected = getExpectedSchemaFromDmmf();
      const mockRows: Array<{ table_name: string; column_name: string }> = [];

      for (const [table, cols] of expected.entries()) {
        for (const col of cols) {
          mockRows.push({ table_name: table, column_name: col });
        }
      }

      // Prime the cache with a healthy schema
      await checkSchemaDrift({
        forceFresh: true,
        queryRunner: async () => mockRows,
      });

      const res = await request(app).get('/ready');

      expect(res.body.checks.schema).toBe('ok');
      if (res.body.checks.db === 'ok' && res.body.checks.redis === 'ok' && res.body.checks.queue === 'ok') {
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ready');
      }
    });
  });
});
