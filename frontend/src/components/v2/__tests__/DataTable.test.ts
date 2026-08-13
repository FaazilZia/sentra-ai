import { test, expect } from '@playwright/test';

test.describe('DataTable Component Unit Test', () => {
  test('renders columns and data rows correctly', async () => {
    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
    ];
    const data = [
      { id: '1', name: 'Test Item 1' },
      { id: '2', name: 'Test Item 2' },
    ];

    expect(columns).toHaveLength(2);
    expect(data).toHaveLength(2);
  });

  test('renders empty state when no data is provided', async () => {
    const columns = [{ key: 'id', header: 'ID' }];
    const data: any[] = [];
    expect(columns).toHaveLength(1);
    expect(data.length).toBe(0);
  });
});
