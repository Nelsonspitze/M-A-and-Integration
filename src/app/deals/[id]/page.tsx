"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Deal, getDeal, saveDeal, Task, WorkstreamConfig } from "@/lib/store";
import { INTEGRATION_STRATEGIES, IntegrationStrategy, PMI_LIBRARY, Workstream, IntegrationItem } from "@/lib/pmi/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Sparkles, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, Plus, Trophy } from "lucide-react";
import Link from "next/link";

const strategyColors: Record<string, string> = {
  full: "bg-blue-100 text-blue-800",
  partial: "bg-purple-100 text-purple-800",
  "bolt-on": "bg-orange-100 text-orange-800",
  standalone: "bg-slate-100 text-slate-700",
};

function getDaysSinceClose(closeDate: string) {
  const diff = Date.now() - new Date(closeDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getDealProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  const done = deal.tasks.filter((t) => t.completed).length;
  return Math.round((done / deal.tasks.length) * 100);
}

function getWorkstreamProgress(deal: Deal, workstreamId: string) {
  const tasks = deal.tasks.filter((t) => t.workstreamId === workstreamId);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
}

function getActiveWorkstreams(deal: Deal): Workstream[] {
  const strategy = INTEGRATION_STRATEGIES.find((s) => s.value === deal.overallStrategy);
  if (!strategy) return [];
  return PMI_LIBRARY.filter((ws) => strategy.activeWorkstreams.includes(ws.id));
}

function getWorkstreamStrategy(deal: Deal, workstreamId: string): IntegrationStrategy {
  const config = deal.workstreamConfigs.find((c) => c.workstreamId === workstreamId);
  return config?.strategy ?? deal.overallStrategy;
}

// Workstream item card
function ItemCard({ item, deal, workstreamId, onUpdate }: {
  item: IntegrationItem;
  deal: Deal;
  workstreamId: string;
  onUpdate: (deal: Deal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", assignee: "", dueDate: "" });
  const [showAddTask, setShowAddTask] = useState(false);

  const tasks = deal.tasks.filter((t) => t.itemId === item.id);
  const actionPlan = deal.actionPlans[item.id];

  async function generatePlan() {
    setGenerating(true);
    try {
      const strategy = getWorkstreamStrategy(deal, workstreamId);
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, deal, strategy }),
      });
      const data = await res.json();
      const updated: Deal = {
        ...deal,
        actionPlans: { ...deal.actionPlans, [item.id]: data.plan },
      };
      saveDeal(updated);
      onUpdate(updated);
    } finally {
      setGenerating(false);
    }
  }

  function toggleTask(taskId: string) {
    const updated: Deal = {
      ...deal,
      tasks: deal.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    };
    saveDeal(updated);
    onUpdate(updated);
  }

  function addTask() {
    if (!newTask.title) return;
    const task: Task = {
      id: crypto.randomUUID(),
      itemId: item.id,
      workstreamId,
      dealId: deal.id,
      title: newTask.title,
      assignee: newTask.assignee,
      dueDate: newTask.dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated: Deal = { ...deal, tasks: [...deal.tasks, task] };
    saveDeal(updated);
    onUpdate(updated);
    setNewTask({ title: "", assignee: "", dueDate: "" });
    setShowAddTask(false);
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <Card className="border border-gray-200">
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm text-gray-900">{item.title}</h4>
              {item.synergyLink && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                  💰 {item.synergyLink}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">{item.description}</p>
            {tasks.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Progress value={progress} className="h-1.5 w-24" />
                <span className="text-xs text-gray-400">{completedCount}/{tasks.length} tasks</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">{item.typicalTimeline}</span>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Best practices */}
          <div>
            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Best Practices</h5>
            <ul className="space-y-1">
              {item.bestPractices.map((bp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {bp}
                </li>
              ))}
            </ul>
          </div>

          {/* Risk flags */}
          <div>
            <h5 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle size={11} /> Risk Flags
            </h5>
            <ul className="space-y-1">
              {item.riskFlags.map((rf, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                  <span className="mt-0.5">⚠</span>
                  {rf}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Action Plan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Sparkles size={11} className="text-purple-500" /> AI Action Plan
              </h5>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={generatePlan}
                disabled={generating}
              >
                <Sparkles size={11} />
                {generating ? "Generating..." : actionPlan ? "Regenerate" : "Generate Plan"}
              </Button>
            </div>
            {actionPlan ? (
              <div className="bg-purple-50 rounded-md p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                {actionPlan}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-400 text-center">
                Click &quot;Generate Plan&quot; to create a deal-specific action plan using AI
              </div>
            )}
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tasks</h5>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddTask(!showAddTask)}
              >
                <Plus size={11} /> Add Task
              </Button>
            </div>
            {tasks.length === 0 && !showAddTask && (
              <p className="text-xs text-gray-400">No tasks yet. Add tasks or generate an AI plan.</p>
            )}
            <div className="space-y-1">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-left"
                >
                  {task.completed ? (
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={15} className="text-gray-300 shrink-0" />
                  )}
                  <span className={`text-xs flex-1 ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {task.title}
                  </span>
                  {task.assignee && (
                    <span className="text-xs text-gray-400">{task.assignee}</span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-gray-400">{task.dueDate}</span>
                  )}
                </button>
              ))}
            </div>
            {showAddTask && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-2">
                <Input
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="h-8 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Assignee"
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={addTask}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddTask(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// Workstream panel
function WorkstreamPanel({ ws, deal, onUpdate }: { ws: Workstream; deal: Deal; onUpdate: (d: Deal) => void }) {
  const wsStrategy = getWorkstreamStrategy(deal, ws.id);
  const progress = getWorkstreamProgress(deal, ws.id);
  const activeItems = ws.items.filter((item) => item.strategies.includes(wsStrategy));

  function setWorkstreamStrategy(strategy: IntegrationStrategy) {
    const configs = deal.workstreamConfigs.filter((c) => c.workstreamId !== ws.id);
    const newConfig: WorkstreamConfig = { workstreamId: ws.id, strategy, owner: "", notes: "" };
    const updated: Deal = { ...deal, workstreamConfigs: [...configs, newConfig] };
    saveDeal(updated);
    onUpdate(updated);
  }

  return (
    <div className="space-y-4">
      {/* Workstream header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ws.icon}</span>
          <div>
            <h3 className="font-semibold">{ws.name}</h3>
            <p className="text-sm text-gray-500">{ws.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{progress}%</div>
          <div className="text-xs text-gray-400">complete</div>
        </div>
      </div>
      <Progress value={progress} className="h-2" />

      {/* Department strategy override */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Label className="text-xs font-semibold text-amber-800">Department Strategy Override</Label>
        <p className="text-xs text-amber-600 mb-2">
          Overall strategy: <strong>{INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy)?.label}</strong>.
          Department head can override for this workstream.
        </p>
        <div className="flex gap-2 flex-wrap">
          {INTEGRATION_STRATEGIES.map((s) => (
            <button
              key={s.value}
              onClick={() => setWorkstreamStrategy(s.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                wsStrategy === s.value
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-amber-300 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Integration items */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">
          Integration Items <span className="text-gray-400 font-normal">({activeItems.length} active for {INTEGRATION_STRATEGIES.find(s => s.value === wsStrategy)?.label})</span>
        </h4>
        {activeItems.map((item) => (
          <ItemCard key={item.id} item={item} deal={deal} workstreamId={ws.id} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

export default function DealPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);

  useEffect(() => {
    const d = getDeal(params.id as string);
    if (!d) { router.push("/"); return; }
    setDeal(d);
  }, [params.id, router]);

  if (!deal) return null;

  const progress = getDealProgress(deal);
  const days = getDaysSinceClose(deal.closeDate);
  const strategy = INTEGRATION_STRATEGIES.find((s) => s.value === deal.overallStrategy);
  const activeWorkstreams = getActiveWorkstreams(deal);

  function getGameBadge() {
    if (progress >= 100) return { emoji: "🏆", label: "Integration Complete!" };
    if (progress >= 75) return { emoji: "🚀", label: "Final stretch" };
    if (progress >= 50) return { emoji: "⚡", label: "Momentum building" };
    if (progress >= 25) return { emoji: "🌱", label: "Getting started" };
    return { emoji: "🎯", label: "Day 1 mode" };
  }

  const badge = getGameBadge();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{deal.name}</h1>
            <p className="text-sm text-gray-500">{deal.platformCompany} × {deal.addOnCompany}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={strategyColors[deal.overallStrategy] + " border-0"} variant="outline">
              {strategy?.label}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar size={12} />
              Day {days}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Progress hero */}
        <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-4xl font-bold mb-1">{progress}%</div>
                <div className="text-blue-100 text-sm">Integration progress</div>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-1">{badge.emoji}</div>
                <div className="text-blue-100 text-sm">{badge.label}</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold mb-1">{deal.tasks.filter(t => t.completed).length}</div>
                <div className="text-blue-100 text-sm">tasks completed</div>
              </div>
            </div>
            <Progress value={progress} className="h-3 bg-blue-400" />
            <div className="flex justify-between text-xs text-blue-200 mt-1">
              <span>Close date: {new Date(deal.closeDate).toLocaleDateString()}</span>
              <span>{deal.tasks.length - deal.tasks.filter(t => t.completed).length} tasks remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* Workstream overview cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {activeWorkstreams.map((ws) => {
            const wsProgress = getWorkstreamProgress(deal, ws.id);
            return (
              <Card key={ws.id} className="text-center">
                <CardContent className="pt-4 pb-4">
                  <div className="text-2xl mb-1">{ws.icon}</div>
                  <div className="text-xs font-medium text-gray-700 mb-2">{ws.name}</div>
                  <div className="text-lg font-bold text-gray-900">{wsProgress}%</div>
                  <Progress value={wsProgress} className="h-1 mt-1" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Workstream tabs */}
        <Tabs defaultValue={activeWorkstreams[0]?.id}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {activeWorkstreams.map((ws) => (
              <TabsTrigger key={ws.id} value={ws.id} className="gap-1 text-xs">
                {ws.icon} {ws.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeWorkstreams.map((ws) => (
            <TabsContent key={ws.id} value={ws.id}>
              <Card>
                <CardContent className="pt-6">
                  <WorkstreamPanel ws={ws} deal={deal} onUpdate={setDeal} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
