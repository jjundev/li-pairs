import { expect, test } from '@playwright/test';

test('목록의 Zone 시뮬레이션 링크 → 세 차트와 수치 칸', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('zone-link').click();
  await expect(page).toHaveURL(/#\/z\/kr-test$/);
  for (const id of ['zone-index', 'zone-pnl', 'zone-rolling']) await expect(page.getByTestId(id).locator('canvas').first()).toBeVisible();
  await expect(page.getByTestId('zone-index')).toHaveAttribute('data-bars', '400');
  await expect(page.getByTestId('zone-rolling')).toHaveAttribute('data-bars', '340'); // 400행 − H 60
  for (const id of ['stat-escape', 'stat-out', 'stat-in', 'stat-all']) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByText(/zone 탈출 여부는 미리 알 수 없습니다 · 탈출 비율 \d+% · 세전/)).toBeVisible();
});

test('H·g 를 바꾸면 URL·창 개수가 바뀌고 뒤로가기 한 번에 목록', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('zone-link').click();
  await page.getByTestId('h-20').click();
  await expect(page.getByTestId('h-20')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('zone-rolling')).toHaveAttribute('data-bars', '380');
  await page.getByTestId('g-10').click();
  await expect(page).toHaveURL(/h=20&g=10/);
  await page.goBack();
  await expect(page.getByTestId('pair-kr-test')).toBeVisible();
});

test('지수 차트를 탭하면 진입일이 바뀐다', async ({ page }) => {
  await page.goto('./#/z/kr-test');
  const chart = page.getByTestId('zone-index');
  await expect(chart.locator('canvas').first()).toBeVisible();
  const box = (await chart.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(page).toHaveURL(/from=\d{8}/);
  await expect.poll(async () => Number(await page.getByTestId('zone-index').getAttribute('data-bars'))).toBeLessThan(400);
  await expect(page.getByTestId('zone-rolling')).toHaveAttribute('data-bars', '340'); // 통계는 진입일과 무관
});

test('H 가 기간보다 길면 수치 칸이 — ', async ({ page }) => {
  await page.goto('./#/z/kr-short?h=250'); // 정렬 250행 → 250일 보유 창 0개
  await expect(page.getByTestId('zone-rolling')).toHaveAttribute('data-bars', '0');
  await expect(page.getByTestId('stat-all')).toContainText('—');
});

test('지수 없는 페어는 안내 문구, 상세에 Zone 보기는 지수 있는 페어만', async ({ page }) => {
  await page.goto('./#/z/us-new');
  await expect(page.getByText('이 페어는 지수 데이터가 없어 zone을 계산할 수 없습니다')).toBeVisible();
  await page.goto('./#/p/us-new');
  await expect(page.getByRole('heading', { name: 'NEWCO' })).toBeVisible();
  await expect(page.getByTestId('zone-open')).toHaveCount(0);
  await page.goto('./#/p/kr-test');
  await page.getByTestId('zone-open').click();
  await expect(page).toHaveURL(/#\/z\/kr-test/);
});

test('375px 에서 가로 스크롤 없음', async ({ page }) => {
  await page.goto('./#/z/kr-test');
  await expect(page.getByTestId('zone-pnl').locator('canvas').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('지수 없는 페어에서 피커로 지수 페어를 고르면 이동한다', async ({ page }) => {
  await page.goto('./#/z/us-new');
  await page.getByTestId('zone-pair').selectOption('kr-test');
  await expect(page).toHaveURL(/#\/z\/kr-test$/);
});
