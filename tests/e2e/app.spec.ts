import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/local-seed.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        name: '验收测试班',
        students: [
          { id: 's1', name: '测试甲', number: '0001', group: '测试班' },
          { id: 's2', name: '测试乙', number: '0002', group: '测试班' },
        ],
      }),
    }),
  );
  await page.clock.install({ time: new Date('2026-09-16T02:10:00Z') });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '课程表', exact: true })).toBeVisible();
});
test('week navigation, course details, attendance, correction and persistence', async ({
  page,
}) => {
  await expect(page.getByRole('region', { name: '第 2 周课表' })).toBeVisible();
  await page.getByRole('button', { name: '下一周', exact: true }).click();
  await expect(
    page.locator('.calendar .course-card').filter({ hasText: '三维基础建模' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: '回到本周', exact: true }).click();
  await page
    .locator('.calendar .course-card')
    .filter({ hasText: '计算机程序设计' })
    .first()
    .click();
  await page.getByRole('button', { name: '为这节课记考勤' }).click();
  await page.getByRole('button', { name: '测试甲迟到加一' }).click();
  await expect(page.getByRole('status')).toContainText('已登记 1 条迟到');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await expect(page.getByTestId('student-row').first().locator('.count-value')).toHaveText('1');
  await page.getByRole('button', { name: '查看测试甲明细' }).click();
  await expect(page.locator('.record-item')).toContainText('计算机程序设计');
  await page.getByRole('button', { name: '编辑记录', exact: true }).click();
  await page.getByLabel('备注', { exact: true }).last().fill('调课补充说明');
  await page.getByRole('button', { name: '保存考勤', exact: true }).click();
  await expect(page.locator('.record-note')).toHaveText('调课补充说明');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByText('暂无异常考勤记录')).toBeVisible();
  await page.getByLabel('显示已撤销记录').check();
  await page.getByRole('button', { name: '恢复', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('记录已恢复');
});
test('settings persist, roster import isolates workspaces, backup round trip', async ({ page }) => {
  await page.getByRole('button', { name: '设置与偏好' }).click();
  await page.getByLabel('开学日期', { exact: true }).fill('2026-08-31');
  await page.getByRole('button', { name: '保存学期设置' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.getByRole('navigation').getByRole('button', { name: '课程表', exact: true }).click();
  await expect(page.getByRole('region', { name: '第 3 周课表' })).toBeVisible();
  await page.getByRole('button', { name: '新建工作台', exact: true }).first().click();
  await page.getByLabel('工作台名称', { exact: true }).fill('选修课程');
  await page.getByLabel('选择学生信息表').setInputFiles({
    name: 'students.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('姓名,学号,班级\n新同学,009,选修班'),
  });
  await expect(page.getByText('成功读取 1 位同学')).toBeVisible();
  await page.getByRole('button', { name: '创建工作台', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('新工作台已创建');
  await page.getByRole('navigation').getByRole('button', { name: '数据与备份' }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  const path = await (await dl).path();
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles(path!);
  await expect(page.getByRole('heading', { name: '恢复备份副本' })).toBeVisible();
  await page.getByRole('button', { name: '确认恢复', exact: true }).click();
  await expect(page.locator('.workspace-list>button')).toHaveCount(5);
  await expect(page.getByRole('status')).toContainText('已恢复为独立工作台');
});
test('summary export and corrupted backup rejection', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await page.getByRole('button', { name: '测试乙请假加一' }).click();
  await expect(page.getByRole('status')).toContainText('已登记');
  await page.getByRole('button', { name: '查看汇总' }).click();
  await expect(page.locator('.report-card').first()).toContainText('1');
  for (const button of ['导出 Markdown', '导出 Excel']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: button }).click();
    expect((await download).suggestedFilename()).toContain('考勤汇总');
  }
  await page.getByRole('navigation').getByRole('button', { name: '数据与备份' }).click();
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"guilu-backup","version":1,"checksum":"wrong","data":{}}'),
  });
  await expect(page.getByRole('status')).toContainText('校验不通过');
  await expect(page.locator('.workspace-list>button')).toHaveCount(2);
});
test('two tabs reject stale writes without losing existing data', async ({ page, context }) => {
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.getByRole('heading', { name: '课程表', exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await page.getByRole('button', { name: '测试甲旷课加一' }).click();
  await expect(page.getByRole('status')).toContainText('已登记');
  await second.getByRole('button', { name: '设置与偏好' }).click();
  await second.getByRole('button', { name: '保存学期设置' }).click();
  await expect(second.getByRole('status')).toContainText('数据已在其他窗口更新');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '考勤工作台' }).click();
  await expect(page.getByTestId('student-row').first().locator('.count-value')).toHaveText('1');
});
