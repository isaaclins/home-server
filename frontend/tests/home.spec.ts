import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page and show redirect message', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads with correct title
    await expect(page).toHaveTitle(/Home Server Dashboard/);
    
    // Check that the redirect message is visible
    await expect(page.locator('text=Redirecting...')).toBeVisible();
    
    // Check that the server icon is visible
    await expect(page.locator('svg')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    
    // Wait for redirect to happen
    await page.waitForURL(/\/login/, { timeout: 10000 });
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page has proper structure
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    
    // Check for the loading container
    await expect(page.locator('.min-h-screen')).toBeVisible();
  });
}); 
