import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test('homepage loads', async ({ page }) => {
  await page.goto(BASE);
  await expect(page).toHaveTitle(/.+/);
  // Tunggu konten utama muncul
  await expect(page.locator('main, #root > *').first()).toBeVisible({ timeout: 10000 });
});

test('products visible on homepage', async ({ page }) => {
  await page.goto(BASE);
  // Tunggu produk load dari Supabase
  await page.waitForTimeout(3000);
  // Minimal ada satu card produk
  const cards = page.locator('[data-testid="product-card"], .product-card, [class*="ProductCard"]');
  // Jika tidak ada data-testid, fallback ke card yang ada teks harga
  const priceText = page.getByText(/Rp\s[\d.,]+/);
  await expect(priceText.first()).toBeVisible({ timeout: 10000 });
});

test('auth page loads', async ({ page }) => {
  await page.goto(`${BASE}/auth`);
  // Form login harus ada
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test('cart page loads', async ({ page }) => {
  await page.goto(`${BASE}/cart`);
  // Redirect ke auth atau tampilkan cart (keduanya valid)
  await expect(page).toHaveURL(/\/cart|\/auth/);
});

test('support page loads', async ({ page }) => {
  await page.goto(`${BASE}/support`);
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
});
