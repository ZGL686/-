import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/local-seed.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        name: '管理验收班',
        students: [
          { id: 's1', name: '虚构甲', number: 'TEST001', group: '验收班' },
          { id: 's2', name: '虚构乙', number: 'TEST002', group: '验收班' },
        ],
      }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '课程表', exact: true })).toBeVisible();
});
async function manager(page: Page) {
  await page.getByRole('button', { name: '切换班级', exact: true }).click();
  await page.getByRole('button', { name: '管理工作台', exact: true }).click();
  return page.getByRole('dialog', { name: '管理工作台', exact: true });
}
async function appearance(page: Page) {
  await page.getByRole('button', { name: '设置与偏好', exact: true }).click();
  await page.getByRole('tab', { name: '外观与交互' }).click();
}
async function attendance(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await page.getByLabel('登记课程', { exact: true }).selectOption('');
  await page.getByLabel('临时课程名称', { exact: true }).fill('验收课程A');
}

test('workspace metadata updates the open settings form without discarding an unsaved date', async ({
  page,
}) => {
  await page.getByRole('button', { name: '设置与偏好', exact: true }).click();
  await page.getByLabel('开学日期', { exact: true }).fill('2026-08-31');
  const dialog = await manager(page);
  await dialog.getByRole('button', { name: '编辑', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '编辑工作台', exact: true });
  await editor.getByLabel('工作台名称', { exact: true }).fill('同步后的班级');
  await editor.getByRole('button', { name: '保存修改' }).click();
  await expect(editor).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('工作台名称', { exact: true })).toHaveValue('同步后的班级');
  await expect(page.getByLabel('开学日期', { exact: true })).toHaveValue('2026-08-31');
  await page.getByRole('button', { name: '保存学期设置' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.reload();
  await expect(page.getByRole('button', { name: '切换班级', exact: true })).toContainText(
    '同步后的班级',
  );
  await page.getByRole('button', { name: '设置与偏好', exact: true }).click();
  await expect(page.getByLabel('开学日期', { exact: true })).toHaveValue('2026-08-31');
});

test('workspace edit, safe deletion, persisted recycle bin and complete restoration', async ({
  page,
}) => {
  await attendance(page);
  await page.getByRole('button', { name: '虚构甲迟到加一' }).click();
  await expect(page.getByRole('status')).toContainText('已登记');
  let dialog = await manager(page);
  await expect(dialog.getByRole('button', { name: '删除', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: '新建工作台', exact: true }).click();
  await page.getByLabel('工作台名称', { exact: true }).fill('空白工作台');
  await page.getByRole('button', { name: '创建工作台' }).click();
  await expect(page.getByRole('status')).toContainText('新工作台已创建');
  dialog = await manager(page);
  await dialog
    .getByRole('region', { name: '管理验收班', exact: true })
    .getByRole('button', { name: '编辑', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: '编辑工作台', exact: true });
  await editor.getByLabel('工作台名称', { exact: true }).fill('改名后的班级');
  await editor.getByLabel('学年学期', { exact: true }).fill('新学期标签');
  await editor.getByRole('button', { name: '保存修改' }).click();
  const renamed = dialog.getByRole('region', { name: '改名后的班级', exact: true });
  await expect(renamed).toContainText('1 条有效考勤');
  await renamed.getByRole('button', { name: '切换', exact: true }).click();
  dialog = await manager(page);
  await dialog
    .getByRole('region', { name: '改名后的班级', exact: true })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  let confirmation = page.getByRole('dialog', { name: '删除“改名后的班级”？', exact: true });
  await confirmation.getByRole('button', { name: '取消', exact: true }).click();
  await expect(dialog.getByRole('region', { name: '改名后的班级' })).toBeVisible();
  await dialog
    .getByRole('region', { name: '改名后的班级', exact: true })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  confirmation = page.getByRole('dialog', { name: '删除“改名后的班级”？', exact: true });
  await confirmation.getByRole('button', { name: '移入回收站', exact: true }).click();
  await expect(dialog.getByRole('region', { name: '改名后的班级', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: '切换班级', exact: true })).toContainText(
    '空白工作台',
  );
  dialog = await manager(page);
  await dialog.getByRole('button', { name: '回收站 · 1' }).click();
  await expect(dialog).toContainText('新学期标签');
  await dialog.getByRole('button', { name: '恢复', exact: true }).click();
  await expect(dialog.getByText('回收站是空的')).toBeVisible();
  await dialog.getByRole('button', { name: '使用中 · 2' }).click();
  await dialog
    .getByRole('region', { name: '改名后的班级', exact: true })
    .getByRole('button', { name: '切换', exact: true })
    .click();
  await attendance(page);
  await expect(page.getByTestId('student-row')).toHaveCount(2);
  await expect(page.getByTestId('student-row').first().locator('.count-value')).toHaveText('1');
});

test('theme follows live system changes, manual choice wins, persists and styles every page', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await appearance(page);
  await expect(page.getByRole('radio', { name: /跟随系统/ })).toBeChecked();
  await page.getByRole('radio', { name: /浅色/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('radio', { name: /深色/ }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const name of ['课程表', '考勤工作台', '学生数据库', '考勤记录', '考勤汇总', '数据与备份']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(32, 33, 36)');
    const whitePanels = await page.locator('.page-content').evaluate(
      (root) =>
        [...root.querySelectorAll('*')].filter((node) => {
          const box = node.getBoundingClientRect();
          return (
            box.width > 80 &&
            box.height > 25 &&
            getComputedStyle(node).backgroundColor === 'rgb(255, 255, 255)'
          );
        }).length,
    );
    expect(whitePanels).toBe(0);
  }
  const dialog = await manager(page);
  await expect(dialog).toHaveCSS('background-color', 'rgb(32, 33, 36)');
  await page.keyboard.press('Escape');
  await appearance(page);
  await page.getByRole('radio', { name: /深色/ }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('radio', { name: /跟随系统/ })).toBeChecked();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('minus selects exact records across courses and reloads; zero, restore and batch undo remain safe', async ({
  page,
}) => {
  await attendance(page);
  const minus = page.getByRole('button', { name: '虚构甲迟到减一', exact: true });
  await expect(minus).toBeDisabled();
  await page.getByRole('button', { name: '虚构甲迟到加一' }).click();
  await expect(page.getByRole('status')).toContainText('已登记');
  await page.getByLabel('临时课程名称', { exact: true }).fill('验收课程B');
  await page.getByRole('button', { name: '虚构甲迟到加一' }).click();
  await expect(page.getByTestId('student-row').first().locator('.count-value')).toHaveText('2');
  await page.reload();
  await attendance(page);
  await minus.click();
  const detail = page.getByRole('dialog', { name: '虚构甲的迟到明细', exact: true });
  await expect(detail.locator('.record-item').first()).toContainText('验收课程A');
  await detail
    .locator('.record-item')
    .filter({ hasText: '验收课程B' })
    .getByRole('button', { name: '撤销', exact: true })
    .click();
  await expect(detail.locator('.record-item')).toHaveCount(1);
  await detail.getByLabel('显示已撤销记录').check();
  await detail
    .locator('.record-item')
    .filter({ hasText: '验收课程B' })
    .getByRole('button', { name: '恢复', exact: true })
    .click();
  await expect(detail.locator('.record-item.voided')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByLabel('选择虚构甲', { exact: true }).check();
  await page.getByLabel('选择虚构乙', { exact: true }).check();
  await page.getByRole('button', { name: /批量登记/ }).click();
  await page
    .getByRole('dialog', { name: '批量登记', exact: true })
    .getByRole('button', { name: '请假' })
    .click();
  await expect(page.getByRole('status')).toContainText('已登记 2 条请假');
  await page.locator('.undo-bar').getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已撤销最近一次');
  await page.locator('.undo-bar').getByRole('button', { name: '恢复登记', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已恢复最近一次');
  await expect(page.getByTestId('student-row').last().locator('.count-value')).toHaveText('1');
});

test('failed workspace deletion keeps the dialog and data and exposes the error above it', async ({
  page,
  context,
}) => {
  let dialog = await manager(page);
  await dialog.getByRole('button', { name: '新建工作台', exact: true }).click();
  await page.getByLabel('工作台名称', { exact: true }).fill('冲突验收工作台');
  await page.getByRole('button', { name: '创建工作台' }).click();
  await expect(page.getByRole('status')).toContainText('新工作台已创建');
  dialog = await manager(page);
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: '设置与偏好', exact: true }).click();
  await other.getByLabel('工作台名称', { exact: true }).fill('另一个窗口已保存');
  await other.getByRole('button', { name: '保存学期设置' }).click();
  await expect(other.getByRole('status')).toContainText('已保存');
  await dialog
    .getByRole('region', { name: '冲突验收工作台', exact: true })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', { name: '删除“冲突验收工作台”？', exact: true });
  await confirmation.getByRole('button', { name: '移入回收站', exact: true }).click();
  await expect(confirmation.getByRole('status')).toContainText('数据已在其他窗口更新');
  await confirmation.getByRole('button', { name: '关闭通知' }).click();
  await expect(confirmation).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '切换班级', exact: true })).toContainText(
    '另一个窗口已保存',
  );
  dialog = await manager(page);
  await expect(dialog.getByRole('button', { name: '使用中 · 2' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '回收站 · 0' })).toBeVisible();
});
