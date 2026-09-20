import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/local-seed.json', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        name: '验收班',
        students: [
          { id: 's1', name: '测试甲', number: '0001', group: '一班' },
          { id: 's2', name: '测试乙', number: '0002', group: '二班' },
          { id: 's3', name: '测试丙', number: '0003', group: '一班' },
        ],
      }),
    }),
  );
  await page.clock.install({ time: new Date('2026-09-16T02:10:00Z') });
  await page.goto('/');
  await page.getByRole('heading', { name: '课程表', exact: true }).waitFor();
});
const navigate = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name }).click();
async function property(page: Page, name: string, type: string, options = '') {
  await page.getByRole('button', { name: '数据库属性', exact: true }).click();
  await page.getByRole('button', { name: '添加属性', exact: true }).click();
  await page.getByLabel('属性名称', { exact: true }).fill(name);
  await page.getByLabel('属性类型', { exact: true }).selectOption(type);
  if (options) await page.getByLabel('选项（每行一个）').fill(options);
  await page.getByRole('button', { name: '保存属性', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('属性已保存');
}
test('shared table, board drag, gallery, inline edit and side peek persist', async ({ page }) => {
  await navigate(page, '学生数据库');
  await page.getByRole('button', { name: '测试甲的跟进状态', exact: true }).click();
  await page.getByLabel('编辑跟进状态').selectOption('未跟进');
  await page.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('tab', { name: '跟进看板' }).click();
  const card = page.locator('.database-card').filter({ hasText: '测试甲' });
  await card.dragTo(page.getByRole('region', { name: '跟进中分组' }));
  await expect(page.getByRole('region', { name: '跟进中分组' })).toContainText('测试甲');
  await page.getByRole('tab', { name: '同学画廊' }).click();
  await expect(page.locator('.database-card').filter({ hasText: '测试甲' })).toContainText(
    '跟进中',
  );
  await page.locator('.database-card-title').filter({ hasText: '测试甲' }).click();
  const peek = page.locator('.database-peek');
  await expect(peek).toBeVisible();
  await peek.getByRole('button', { name: '修改备注', exact: true }).click();
  await peek.getByLabel('编辑备注').fill('下周联系');
  await peek.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await expect(peek).toContainText('下周联系');
  await page.reload();
  await navigate(page, '学生数据库');
  await expect(page.getByRole('tab', { name: '同学画廊' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.locator('.database-card-title').filter({ hasText: '测试甲' }).click();
  await expect(page.locator('.database-peek')).toContainText('下周联系');
});
test('custom numeric properties, batch edit, filters and calculations', async ({ page }) => {
  await navigate(page, '学生数据库');
  await property(page, '提醒次数', 'number');
  await page.getByRole('button', { name: '测试甲的提醒次数', exact: true }).click();
  await page.getByLabel('编辑提醒次数').fill('10');
  await page.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await page.getByLabel('选择测试乙', { exact: true }).check();
  await page.getByLabel('选择测试丙', { exact: true }).check();
  await page.getByLabel('批量编辑属性').selectOption({ label: '提醒次数' });
  await page.getByLabel('编辑提醒次数').fill('2');
  await page.locator('dialog').getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('批量修改已保存');
  await page.getByLabel('提醒次数列计算').selectOption('sum');
  await expect(page.locator('tfoot')).toContainText('14');
  await page.getByRole('button', { name: '数据库筛选', exact: true }).click();
  await page.getByRole('button', { name: '添加筛选条件' }).click();
  await page.getByLabel('筛选属性 1', { exact: true }).selectOption({ label: '提醒次数' });
  await page.getByLabel('筛选条件 1', { exact: true }).selectOption('gt');
  await page.getByLabel('筛选值 1', { exact: true }).fill('2');
  await page.getByRole('button', { name: '保存视图', exact: true }).click();
  await expect(page.getByTestId('database-row')).toHaveCount(1);
  await expect(page.locator('tfoot')).toContainText('10');
  await page.getByRole('button', { name: '数据库筛选', exact: true }).click();
  await page.getByRole('button', { name: '添加筛选条件' }).click();
  await page.getByLabel('筛选属性 2', { exact: true }).selectOption('group');
  await page.getByLabel('筛选条件 2', { exact: true }).selectOption('equals');
  await page.getByLabel('筛选值 2', { exact: true }).fill('二班');
  await page.getByLabel('筛选逻辑').selectOption('or');
  await page.getByRole('button', { name: '保存视图', exact: true }).click();
  await expect(page.getByTestId('database-row')).toHaveCount(2);
  await page.getByRole('button', { name: '数据库排序', exact: true }).click();
  await page.getByRole('button', { name: '添加排序', exact: true }).click();
  await page.getByLabel('排序属性 1').selectOption({ label: '提醒次数' });
  await page.getByLabel('排序方向 1').selectOption('asc');
  await page.getByRole('button', { name: '保存视图', exact: true }).click();
  await expect(page.getByTestId('database-row').first()).toContainText('测试乙');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出当前视图' }).click();
  expect((await dl).suggestedFilename()).toContain('全部同学.csv');
  await page.reload();
  await navigate(page, '学生数据库');
  await expect(page.getByTestId('database-row')).toHaveCount(2);
  await expect(page.getByTestId('database-row').first()).toContainText('测试乙');
});
test('saved view lifecycle and property visibility are independent', async ({ page }) => {
  await navigate(page, '学生数据库');
  await page.getByRole('button', { name: '添加视图', exact: true }).click();
  await page.getByLabel('视图名称', { exact: true }).fill('联系名单');
  await page.getByRole('button', { name: '列表', exact: true }).click();
  await page.getByRole('button', { name: '创建视图', exact: true }).click();
  await expect(page.locator('.database-list-row')).toHaveCount(3);
  await page.getByRole('tab', { name: '联系名单' }).click();
  await page.getByRole('button', { name: '复制视图', exact: true }).click();
  await expect(page.getByRole('tab', { name: '联系名单 副本' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: '数据库属性', exact: true }).click();
  await page.getByRole('button', { name: '隐藏学号', exact: true }).click();
  await page.getByRole('button', { name: '保存视图', exact: true }).click();
  await expect(page.locator('.database-list-row').first()).not.toContainText('0001');
  await page.getByRole('tab', { name: '联系名单', exact: true }).click();
  await expect(page.locator('.database-list-row').first()).toContainText('0001');
  await page.getByRole('tab', { name: '联系名单 副本' }).click();
  await page.getByRole('tab', { name: '联系名单 副本' }).click();
  await page.getByRole('button', { name: '删除视图', exact: true }).click();
  await expect(page.getByRole('tab', { name: '联系名单 副本' })).toHaveCount(0);
  await expect(page.getByTestId('database-row')).toHaveCount(3);
});
test('record calendar and bidirectional relation update student rollups', async ({ page }) => {
  await navigate(page, '考勤工作台');
  await page.getByRole('button', { name: '测试甲迟到加一' }).click();
  await expect(page.getByRole('status')).toContainText('已登记');
  await navigate(page, '考勤记录');
  await expect(page.getByTestId('database-row')).toHaveCount(1);
  await page.getByRole('tab', { name: '考勤日历' }).click();
  await expect(page.locator('.calendar-record')).toContainText('测试甲 · 迟到');
  await page.locator('.calendar-record').click();
  const peek = page.locator('.database-peek');
  await peek.getByRole('button', { name: '更改', exact: true }).click();
  await peek.getByLabel('编辑同学').selectOption('s2');
  await peek.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await peek.locator('.relation-link').click();
  await expect(peek.getByRole('heading', { name: '测试乙', exact: true })).toBeVisible();
  await expect(peek.locator('.related-record')).toHaveCount(1);
  await peek.locator('.related-record').click();
  await peek.getByRole('button', { name: '修改已撤销' }).click();
  await peek.getByLabel('编辑已撤销').selectOption('true');
  await peek.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await peek.getByRole('button', { name: '关闭详情' }).click();
  await expect(page.locator('.calendar-record')).toHaveCount(0);
  await navigate(page, '学生数据库');
  await expect(page.getByRole('button', { name: '测试乙的异常累计', exact: true })).toHaveText('0');
});
test('date, multi-select and checkbox properties survive backup restore', async ({ page }) => {
  await navigate(page, '学生数据库');
  await property(page, '沟通日期', 'date');
  await property(page, '标签', 'multiSelect', '住宿\n班委');
  await property(page, '已联系', 'checkbox');
  await page.getByRole('button', { name: '测试甲的沟通日期', exact: true }).click();
  await page.getByLabel('编辑沟通日期').fill('2026-09-18');
  await page.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('button', { name: '测试甲的标签', exact: true }).click();
  await page.getByLabel('住宿', { exact: true }).check();
  await page.getByLabel('班委', { exact: true }).check();
  await page.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await page.getByRole('button', { name: '测试甲的已联系', exact: true }).click();
  await page.getByLabel('编辑已联系').selectOption('true');
  await page.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await navigate(page, '数据与备份');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  const file = await (await download).path();
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles(file!);
  await page.getByRole('button', { name: '确认恢复', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已恢复');
  await navigate(page, '学生数据库');
  await expect(page.getByRole('button', { name: '测试甲的沟通日期', exact: true })).toHaveText(
    '2026-09-18',
  );
  await expect(page.getByRole('button', { name: '测试甲的标签', exact: true })).toContainText(
    '住宿',
  );
  await expect(page.getByRole('button', { name: '测试甲的已联系', exact: true })).toContainText(
    '✓',
  );
});
test('column menu, ordering and property deletion update all saved views', async ({ page }) => {
  await navigate(page, '学生数据库');
  await page.locator('.column-heading').filter({ hasText: '学号' }).click();
  const menu = page.getByRole('dialog', { name: '学号列设置' });
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: '降序排列' }).click();
  await expect(page.getByTestId('database-row').first()).toContainText('测试丙');
  await page
    .locator('.column-heading')
    .filter({ hasText: '跟进状态' })
    .dragTo(page.locator('.column-heading').filter({ hasText: '学号' }));
  await expect(page.locator('.column-heading').nth(1)).toHaveText('跟进状态');
  await property(page, '联系备注', 'text');
  await page.getByRole('button', { name: '测试甲的联系备注', exact: true }).click();
  await page.getByLabel('编辑联系备注').fill('保持联系');
  await page.locator('.cell-editor').getByRole('button', { name: '保存', exact: true }).click();
  await page.locator('.column-heading').filter({ hasText: '联系备注' }).click();
  await page.getByRole('button', { name: '编辑属性', exact: true }).click();
  await page.getByRole('button', { name: '删除属性', exact: true }).click();
  await page.getByRole('button', { name: '确认删除属性', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('属性已删除');
  await page.reload();
  await navigate(page, '学生数据库');
  await expect(page.locator('.column-heading').filter({ hasText: '联系备注' })).toHaveCount(0);
  await expect(page.getByTestId('database-row').first()).toContainText('测试丙');
});
