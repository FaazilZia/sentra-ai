import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASS  = process.env.TEST_ADMIN_PASSWORD || 'Sentra@Admin123';

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 });
}

test.describe('Entity Relationship Graph - Cross-Browser', () => {
  test.setTimeout(90000);

  test('should load graph, render nodes, and handle zoom/scroll/overflow', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => {
      console.error(`[PAGE ERROR] [${test.info().project.name}]:`, err.message);
      pageErrors.push(err.message);
    });

    console.log(`[${test.info().project.name}] Logging in...`);
    await loginAsAdmin(page);

    console.log(`[${test.info().project.name}] Navigating to Entity Graph...`);
    await page.goto('/app/entity-graph', { waitUntil: 'domcontentloaded' });

    // Wait for the loading spinner / text to disappear
    console.log(`[${test.info().project.name}] Waiting for mapping to complete...`);
    const loadingMessage = page.getByText('Mapping Entity Space...');
    await expect(loadingMessage).not.toBeVisible({ timeout: 30000 });

    // Assert ReactFlow canvas container is visible
    const reactFlowContainer = page.locator('.react-flow');
    await expect(reactFlowContainer).toBeVisible({ timeout: 15000 });

    // Assert that at least one node renders (count > 0)
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 15000 });
    const nodeCount = await nodes.count();
    console.log(`[${test.info().project.name}] Rendered node count: ${nodeCount}`);
    expect(nodeCount).toBeGreaterThan(0);

    const projectName = test.info().project.name;
    const isMobileSafari = projectName === 'mobile-safari';

    if (!isMobileSafari) {
      // Desktop: simulate wheel/scroll event over canvas and assert transform changes (zoom occurred)
      console.log(`[${projectName}] Simulating mouse wheel zoom event over canvas...`);
      const pane = page.locator('.react-flow__pane');
      await pane.hover();

      const viewport = page.locator('.react-flow__viewport');
      const initialStyle = await viewport.getAttribute('style');
      console.log(`[${projectName}] Initial viewport style: ${initialStyle}`);

      // Perform wheel event over the pane using the mouse
      const boundingBox = await pane.boundingBox();
      if (boundingBox) {
        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;
        
        await page.mouse.move(centerX, centerY);
        await page.mouse.wheel(0, 150); // Zoom out (safe from max-zoom-2 limitation)
        await page.waitForTimeout(500); // Allow time for CSS transform animation / transition to settle

        const finalStyle = await viewport.getAttribute('style');
        console.log(`[${projectName}] Final viewport style: ${finalStyle}`);
        
        // Assert that the style attribute changed (meaning zoom/transform took place)
        expect(finalStyle).not.toBe(initialStyle);
      }

      // Assert no critical console errors occurred during the load and interaction
      // Filter out common benign ResizeObserver notifications
      const criticalErrors = pageErrors.filter(err => !err.includes('ResizeObserver'));
      expect(criticalErrors).toHaveLength(0);
    } else {
      // mobile-safari only: assert outer page doesn't scroll horizontally (no horizontal overflow)
      console.log(`[mobile-safari] Verifying no horizontal overflow of the main page body...`);
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      console.log(`[mobile-safari] scrollWidth: ${bodyScrollWidth}, viewportWidth: ${viewportWidth}`);
      
      expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);

      // Note/Comment: Playwright cannot natively trigger multi-touch pinch-zoom gestures on mobile-safari easily.
      // This has been flagged for manual mobile spot-check in the report rather than failing the automated run.
    }
  });
});
