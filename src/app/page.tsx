"use client";

import { useEffect, useState } from "react";
import { Deal, getDeals } from "@/lib/store";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { INTEGRATION_STRATEGIES } from "@/lib/pmi/library";
import { Plus, Building2, Calendar, TrendingUp, Target } from "lucide-react";

function getDealProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  const done = deal.tasks.filter((t) => t.completed).length;
  return Math.round((done / deal.tasks.length) * 100);
}

function getDaysSinceClose(closeDate: string) {
  const diff = Date.now() - new Date(closeDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const strategyColors: Record<string, string> = {
  full: "bg-blue-100 text-blue-800",
  partial: "bg-purple-100 text-purple-800",
  "bolt-on": "bg-orange-100 text-orange-800",
  standalone: "bg-slate-100 text-slate-700",
};

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    setDeals(getDeals());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IntegrationOS</h1>
            <p className="text-sm text-gray-500">Post-Merger Integration Platform</p>
          </div>
          <Link href="/deals/new">
            <Button className="gap-2">
              <Plus size={16} />
              New Integration
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {deals.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{deals.length}</p>
                    <p className="text-sm text-gray-500">Active Integrations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {deals.length > 0
                        ? Math.round(deals.reduce((acc, d) => acc + getDealProgress(d), 0) / deals.length)
                        : 0}%
                    </p>
                    <p className="text-sm text-gray-500">Avg. Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {deals.reduce((acc, d) => acc + d.tasks.filter((t) => t.completed).length, 0)}
                    </p>
                    <p className="text-sm text-gray-500">Tasks Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {deals.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🤝</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No integrations yet</h2>
            <p className="text-gray-500 mb-6">Start by creating your first post-merger integration project.</p>
            <Link href="/deals/new">
              <Button size="lg" className="gap-2">
                <Plus size={18} />
                New Integration
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {deals.map((deal) => {
              const progress = getDealProgress(deal);
              const days = getDaysSinceClose(deal.closeDate);
              const strategy = INTEGRATION_STRATEGIES.find((s) => s.value === deal.overallStrategy);
              return (
                <Link key={deal.id} href={`/deals/${deal.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{deal.name}</CardTitle>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {deal.platformCompany} acquires {deal.addOnCompany}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={strategyColors[deal.overallStrategy] + " border-0"} variant="outline">
                            {strategy?.label}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Calendar size={12} />
                            Day {days}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Progress value={progress} className="flex-1 h-2" />
                        <span className="text-sm font-semibold text-gray-700 w-10 text-right">{progress}%</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{deal.tasks.filter((t) => t.completed).length} / {deal.tasks.length} tasks done</span>
                        <span>{deal.workstreamConfigs.length} workstreams configured</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
