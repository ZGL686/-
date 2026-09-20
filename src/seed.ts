import type { AppData, Course, Student } from './model';
import { dataSchema, newWorkspace, parseWeeks, uid } from './model';
export function initialData(students: Student[] = [], name = '数字媒体技术班'): AppData {
  const w = newWorkspace(name, students);
  const c = (
    name: string,
    teacher: string,
    room: string,
    day: number,
    start: number,
    end: number,
    weeks: string,
    color: Course['color'],
  ): Course => ({
    id: uid(),
    name,
    teacher,
    room,
    day,
    start,
    end,
    weeks: parseWeeks(weeks),
    color,
  });
  const lab = '韶师3号教学楼-202';
  w.courses = [
    c('三维基础建模', '周玲', lab, 1, 3, 4, '1-2,4-13', 'purple'),
    c('三维基础建模课程设计', '周玲', lab, 1, 3, 4, '14-15', 'purple'),
    c('多媒体技术与应用', '霍彤', lab, 1, 5, 8, '1-2,4-13', 'blue'),
    c('马克思主义基本原理', '彭立文', '韶师2号教学楼-402', 2, 1, 2, '1-16', 'teal'),
    c('大学英语A3', '孙红元', '韶师2号教学楼-208', 2, 3, 4, '1-16', 'amber'),
    c('概率统计', '张有序', '韶师2号教学楼-302', 2, 5, 6, '1-16', 'pink'),
    c('多媒体平面设计', '廖丽琼', lab, 3, 1, 2, '1-16', 'purple'),
    c('计算机程序设计', '林育曼', lab, 3, 3, 4, '1-16', 'pink'),
    c('三维基础建模', '周玲', lab, 4, 3, 4, '1-2,4-13', 'purple'),
    c('摄影基础', '张丽娜', '韶师2号教学楼-308', 4, 5, 6, '1-16', 'green'),
    c('计算机程序设计', '林育曼', lab, 4, 7, 8, '1-16', 'pink'),
    c('大学体育3', '吴静知', '西区羽毛球馆', 5, 3, 4, '1-17', 'amber'),
  ];
  w.notes =
    '第 16 周：三维基础建模课程设计 · 周玲\n第 17 周：专业见习1 · 霍彤\n以上实践课程的具体日期和节次待确认。第 9–10 节结束时间为初始值，可在学期设置中调整。';
  return dataSchema.parse({ schemaVersion: 1, activeWorkspaceId: w.id, workspaces: [w] });
}
export async function loadSeed(): Promise<AppData> {
  const response = await fetch('./local-seed.json');
  if (response.ok && (response.headers.get('content-type') || '').includes('application/json')) {
    const seed = await response.json();
    return initialData(seed.students, seed.name);
  }
  return initialData();
}
