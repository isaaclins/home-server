import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check that the login page loads with correct title
    await expect(page).toHaveTitle(/Home Server Dashboard/);
    
    // Check for login form elements (adjust selectors based on your actual form)
    await expect(page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]')).toBeVisible();
  });

  test('should load register page', async ({ page }) => {
    await page.goto('/register');
    
    // Check that the register page loads with correct title
    await expect(page).toHaveTitle(/Home Server Dashboard/);
    
    // Check for registration form elements (adjust selectors based on your actual form)
    await expect(page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]')).toBeVisible();
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/login');
    
    // Check that the page has proper structure
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    
    // Check for form elements
    await expect(page.locator('form, [role="form"]')).toBeVisible();
  });

  test('should handle form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form if submit button exists
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should either show validation errors or stay on the same page
      // This is a basic check - adjust based on your actual validation
      await expect(page).toHaveURL(/\/login/);
    }
  });
}); 
