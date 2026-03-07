import { Deal } from "./store";
import { PMI_LIBRARY } from "./pmi/library";

const today = () => new Date().toISOString().split("T")[0];

export interface PersonScore {
  member: { id: string; name: string; role: string; initials: string; color: string };
  assigned: number;
  completed: number;
  overdue: number;
  points: number;
}

export interface DeptScore {
  wsId: string;
  name: string;
  icon: string;
  total: number;
  completed: number;
  overdue: number;
  points: number;
}

export interface DealScore {
  personScores: PersonScore[];
  deptScores: DeptScore[];
  healthScore: number;   // % of due tasks that are completed
  totalOverdue: number;
  dueTasks: number;
  dueCompleted: number;
}

export function scoreForDeal(deal: Deal): DealScore {
  const t = today();

  const personScores: PersonScore[] = (deal.team ?? []).map(member => {
    const assigned = deal.tasks.filter(t => t.assigneeId === member.id);
    const completed = assigned.filter(t => t.completed).length;
    const overdue = assigned.filter(t => !t.completed && t.dueDate && t.dueDate < today()).length;
    const points = completed * 10 - overdue * 5;
    return { member, assigned: assigned.length, completed, overdue, points };
  }).sort((a, b) => b.points - a.points);

  const deptScores: DeptScore[] = PMI_LIBRARY.map(ws => {
    const tasks = deal.tasks.filter(task => task.workstreamId === ws.id);
    const completed = tasks.filter(task => task.completed).length;
    const overdue = tasks.filter(task => !task.completed && task.dueDate && task.dueDate < t).length;
    const points = completed * 10 - overdue * 5;
    return { wsId: ws.id, name: ws.name, icon: ws.icon, total: tasks.length, completed, overdue, points };
  }).filter(d => d.total > 0).sort((a, b) => b.points - a.points);

  const dueTasks = deal.tasks.filter(task => task.dueDate && task.dueDate <= t);
  const dueCompleted = dueTasks.filter(task => task.completed).length;
  const healthScore = dueTasks.length > 0 ? Math.round((dueCompleted / dueTasks.length) * 100) : 100;
  const totalOverdue = deal.tasks.filter(task => !task.completed && task.dueDate && task.dueDate < t).length;

  return { personScores, deptScores, healthScore, totalOverdue, dueTasks: dueTasks.length, dueCompleted };
}

export function medal(rank: number): string {
  if (rank === 0) return "🥇";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return `${rank + 1}.`;
}
