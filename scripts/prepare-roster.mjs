import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const source = process.argv[2];
if (!source) throw new Error('用法：npm run roster:seed -- "班级信息表.xlsx 的路径"');
const book = new ExcelJS.Workbook();
await book.xlsx.readFile(source);
const sheet = book.worksheets[0];
if (!sheet) throw new Error('第一张工作表为空');
const rows = [];
sheet.eachRow((row) => {
  const cells = [];
  row.eachCell({ includeEmpty: true }, (cell, col) => (cells[col - 1] = cell.text.trim()));
  rows.push(cells);
});
const header = rows.findIndex((r) => r.includes('姓名') && r.includes('学号'));
if (header < 0) throw new Error('没有找到“姓名”和“学号”列');
const ni = rows[header].indexOf('姓名'),
  si = rows[header].indexOf('学号'),
  gi = rows[header].indexOf('班级');
const seen = new Set();
const students = [];
for (const row of rows.slice(header + 1)) {
  if (!row.some(Boolean)) continue;
  const name = row[ni],
    number = row[si];
  if (!name || !number) throw new Error('有学生缺少姓名或学号');
  if (seen.has(number)) throw new Error('学生学号重复');
  seen.add(number);
  students.push({ id: randomUUID(), name, number, group: row[gi] || '' });
}
if (!students.length) throw new Error('名单为空');
await fs.mkdir('public', { recursive: true });
await fs.writeFile(
  'public/local-seed.json',
  JSON.stringify(
    { name: students[0].group ? `${students[0].group}班` : '班级考勤', students },
    null,
    2,
  ),
  'utf8',
);
console.log(
  `已生成本地初始化名单：${students.length} 人。此文件被 Git 忽略，仅用于首次启动，不会覆盖现有数据。`,
);
