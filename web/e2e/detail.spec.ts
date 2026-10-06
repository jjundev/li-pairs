import { expect, test } from '@playwright/test';

test('페어를 누르면 두 다리 캔들이 공통 시작일부터 그려진다', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('pair-kr-test').click();
  await expect(page.getByRole('heading', { name: '테스트전자' })).toBeVisible();
  const long = page.getByTestId('chart-long');
  await expect(long.locator('canvas').first()).toBeVisible();
  await expect(long).toHaveAttribute('data-bars', '400'); // L1 600봉이 S1 상장일(2025-03-24)부터 잘림
  await expect(page.getByTestId('chart-short')).toHaveAttribute('data-bars', '400');
});

test('d w m q y 를 누르면 봉 수가 바뀐다', async ({ page }) => {
  await page.goto('./#/p/kr-test');
  const long = page.getByTestId('chart-long');
  await expect(long).toHaveAttribute('data-bars', '400');
  await page.getByTestId('tf-w').click();
  await expect(page.getByTestId('tf-w')).toHaveAttribute('aria-pressed', 'true');
  await expect(long).toHaveAttribute('data-bars', '80');
  await page.getByTestId('tf-m').click();
  await expect(long).toHaveAttribute('data-bars', '20');
  await page.getByTestId('tf-q').click();
  await expect(long).toHaveAttribute('data-bars', '8');
  await page.getByTestId('tf-y').click();
  await expect(long).toHaveAttribute('data-bars', '2');
});

test('봉 단위를 여러 번 바꿔도 뒤로가기 한 번이면 목록', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('pair-kr-test').click();
  for (const tf of ['w', 'm', 'q', 'y']) await page.getByTestId(`tf-${tf}`).click();
  await page.goBack();
  await expect(page.getByTestId('pair-kr-test')).toBeVisible();
});

test('상장 직후 페어는 연봉에서 안내 문구, 배율이 다르면 비대칭 배지', async ({ page }) => {
  await page.goto('./#/p/us-new?tf=y');
  await expect(page.locator('.notice')).toHaveText('상장 후 30거래일 · 연봉 1개');
  await expect(page.locator('.badge.asym')).toHaveText('비대칭');
});

test('겹쳐보기 토글은 차트 하나로 합친다', async ({ page }) => {
  await page.goto('./#/p/kr-test');
  await page.getByTestId('toggle-overlay').click();
  await expect(page.getByTestId('chart-overlay')).toBeVisible();
  await expect(page.getByTestId('chart-long')).toHaveCount(0);
  await page.getByTestId('toggle-overlay').click();
  await expect(page.getByTestId('chart-long')).toBeVisible();
});

test('롱 다리를 바꾸면 URL 과 차트가 따라간다', async ({ page }) => {
  await page.goto('./#/p/kr-test');
  await page.getByTestId('sel-long').selectOption('L2');
  await expect(page).toHaveURL(/l=L2/);
  await expect(page.getByTestId('chart-long')).toHaveAttribute('data-bars', '400');
});

test('데이터 없는 다리는 "데이터 없음"', async ({ page }) => {
  await page.goto('./#/p/kr-missing');
  await expect(page.getByTestId('chart-long')).toContainText('데이터 없음');
});

test('상세 화면도 가로 스크롤이 없다', async ({ page }) => {
  await page.goto('./#/p/kr-test');
  await expect(page.getByTestId('chart-long').locator('canvas').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
