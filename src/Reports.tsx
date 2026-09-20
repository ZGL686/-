import {
  CalendarRange,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button, PageHeading, Tag } from './components/ui';
import { useApp } from './context';
import { download, excelReport, markdownReport, reportRows } from './files';
import { addDays, counts } from './model';
export function Reports() {
  const { w, notify } = useApp();
  const [from, setFrom] = useState(w.startDate);
  const [to, setTo] = useState(addDays(w.startDate, w.totalWeeks * 7 - 1));
  const [course, setCourse] = useState('');
  const [exporting, setExporting] = useState(false);
  const filter = { from, to, course };
  const cs = counts(w, undefined, from, to, course);
  const total = Object.values(cs).reduce((a, b) => a + b, 0);
  const rows = reportRows(w, filter);
  const involved = rows.filter((row) => Number(row.at(-1)) > 0).length;
  async function exportFile(type: 'xlsx' | 'md') {
    if (from > to) {
      notify('开始日期不能晚于结束日期。', true);
      return;
    }
    setExporting(true);
    try {
      const name = `${w.name.replace(/[<>:"/\\|?*]/g, '_')}_考勤汇总_${from}_${to}.${type}`;
      const success = await download(
        name,
        type === 'xlsx' ? await excelReport(w, filter) : markdownReport(w, filter),
        type === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/markdown;charset=utf-8',
      );
      if (success) notify('考勤汇总已导出');
    } catch (e) {
      notify(`导出失败：${String(e)}`, true);
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <PageHeading
        page="reports"
        description="随时整理考勤数据，让每一次沟通都有依据。"
        actions={
          <>
            <Button disabled={exporting} onClick={() => exportFile('md')}>
              <FileText size={16} />
              导出 Markdown
            </Button>
            <Button className="primary" disabled={exporting} onClick={() => exportFile('xlsx')}>
              <Download size={16} />
              导出 Excel
            </Button>
          </>
        }
      />
      <div className="report-filters">
        <CalendarRange size={18} />
        <label>
          开始日期
          <input
            type="date"
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </label>
        <span>—</span>
        <label>
          结束日期
          <input
            type="date"
            value={to}
            onChange={(e) => {
              if (e.target.value) setTo(e.target.value);
            }}
          />
        </label>
        <label className="report-course">
          课程
          <select value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">全部课程</option>
            {[
              ...new Set([...w.courses.map((c) => c.name), ...w.records.map((r) => r.courseName)]),
            ].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <Button
          className="small"
          onClick={() => {
            setFrom([w.startDate, ...w.records.map((r) => r.date)].sort()[0]);
            setTo(
              [addDays(w.startDate, w.totalWeeks * 7 - 1), ...w.records.map((r) => r.date)]
                .sort()
                .at(-1)!,
            );
            setCourse('');
          }}
        >
          全部记录
        </Button>
      </div>
      {from > to && <p className="form-error">开始日期不能晚于结束日期，请调整。</p>}
      <div className="report-cards">
        <div className="report-card">
          <span>
            <ClipboardList size={17} />
            异常记录总数
          </span>
          <strong>
            {total}
            <small>次</small>
          </strong>
          <p>所选时间范围内的有效记录</p>
        </div>
        {w.categories.map((c) => (
          <div className={`report-card ${c.color}`} key={c.id}>
            <span>
              <i className="category-dot" />
              {c.label}
            </span>
            <strong>
              {cs[c.id]}
              <small>次</small>
            </strong>
            <p>{total ? Math.round((cs[c.id] / total) * 100) : 0}% 的异常记录</p>
          </div>
        ))}
      </div>
      <div className="report-table-heading">
        <h3>
          <FileSpreadsheet size={18} />
          {w.name} · 考勤统计
        </h3>
        <span>
          <Users size={15} />
          涉及 {involved} / {w.students.length} 位同学
        </span>
      </div>
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>学号</th>
              {w.categories.map((c) => (
                <th key={c.id}>
                  <Tag color={c.color}>{c.label}</Tag>
                </th>
              ))}
              <th>合计</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={w.students[i].id}>
                <td>
                  <strong>{row[1]}</strong>
                </td>
                <td className="student-number">{row[0]}</td>
                {row.slice(3).map((v, i) => (
                  <td key={i} className={v ? '' : 'muted'}>
                    {v || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>合计</td>
              {w.categories.map((c) => (
                <td key={c.id}>{cs[c.id]}</td>
              ))}
              <td>{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="report-note">
        <FileText size={17} />
        <p>
          Excel 和 Markdown
          均包含汇总与逐条明细。统计单位为登记次数，已撤销记录不计入；没有异常记录不等同于已确认出勤。
        </p>
      </div>
    </>
  );
}
