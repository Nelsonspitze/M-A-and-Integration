"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeal } from "@/lib/store";
import { INTEGRATION_STRATEGIES, IntegrationStrategy } from "@/lib/pmi/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function NewDealPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    platformCompany: "",
    addOnCompany: "",
    closeDate: new Date().toISOString().split("T")[0],
    overallStrategy: "" as IntegrationStrategy | "",
    dealBrief: "",
  });

  const valid = form.name && form.platformCompany && form.addOnCompany && form.closeDate && form.overallStrategy;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.overallStrategy) return;
    const deal = createDeal({
      name: form.name,
      platformCompany: form.platformCompany,
      addOnCompany: form.addOnCompany,
      closeDate: form.closeDate,
      overallStrategy: form.overallStrategy,
      dealBrief: form.dealBrief,
    });
    router.push(`/deals/${deal.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Integration</h1>
            <p className="text-sm text-gray-500">Set up your post-merger integration project</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Integration Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Platform A × Add-on B Integration 2025"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platform">Platform Company</Label>
                  <Input
                    id="platform"
                    placeholder="Acquiring company"
                    value={form.platformCompany}
                    onChange={(e) => setForm({ ...form, platformCompany: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="addon">Add-on Company</Label>
                  <Input
                    id="addon"
                    placeholder="Acquired company"
                    value={form.addOnCompany}
                    onChange={(e) => setForm({ ...form, addOnCompany: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="closeDate">Close Date</Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={form.closeDate}
                  onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Strategy selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall Integration Strategy</CardTitle>
              <p className="text-sm text-gray-500">
                Set by CEO. Individual departments can override this for their domain.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {INTEGRATION_STRATEGIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, overallStrategy: s.value })}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      form.overallStrategy === s.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{s.label}</span>
                      {form.overallStrategy === s.value && (
                        <CheckCircle2 size={16} className="text-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
                    <div className="mt-2">
                      <span className="text-xs text-gray-400">
                        {s.activeWorkstreams.length} workstreams active
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deal brief */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal Brief</CardTitle>
              <p className="text-sm text-gray-500">
                Describe the deal context — industry, size, strategic rationale, key synergies. The AI uses this to generate tailored action plans.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g. Platform A is a B2B services company with 200 FTE active in the Netherlands and Belgium. Add-on B is a 45 FTE specialist in digital services, acquired to expand platform's digital capability. Key synergies include cross-sell into Add-on B's customer base (€300K revenue synergy) and centralisation of back-office functions (€150K cost synergy). Integration timeline target: 12 months."
                value={form.dealBrief}
                onChange={(e) => setForm({ ...form, dealBrief: e.target.value })}
                rows={5}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={!valid} size="lg" className="w-full">
            Create Integration →
          </Button>
        </form>
      </main>
    </div>
  );
}
