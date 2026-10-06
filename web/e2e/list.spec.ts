import { expect, test } from '@playwright/test';

test('목록에 페어가 보이고 검색으로 걸러진다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('데이터 2026-10-06 16:30')).toBeVisible();
  await expect(page.getByTestId('pair-kr-test')).toContainText('L1 +2x / S1 −2x');
  await page.locator('input[type=search]').fill('newco');
  await expect(page.getByTestId('pair-us-new')).toBeVisible();
  await expect(page.getByTestId('pair-kr-test')).toHaveCount(0);
  await page.locator('input[type=search]').fill('zzz');
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible();
});

test('데이터가 없는 페어는 흐리게 표시된다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('pair-kr-missing')).toHaveClass(/off/);
  await expect(page.getByTestId('pair-kr-test')).not.toHaveClass(/off/);
});

test('375px 에서 가로 스크롤이 없다', async ({ page }) => {
  await page.goto('./');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);
});
