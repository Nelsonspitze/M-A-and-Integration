"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Deal, getDeals } from "@/lib/store";
import { getUser, AppUser, canSeeCRM, canCreateIntegration, canSeeAllWorkstreams, ROLE_LABELS } from "@/lib/auth";
import { LayoutDashboard, Plus, Settings, Users, Target, MapPin } from "lucide-react";

function getDealProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  return Math.round((deal.tasks.filter(t => t.completed).length / deal.tasks.length) * 100);
}

const strategyDot: Record<string, string> = {
  full: "#FF6400", partial: "#74A0F4", "bolt-on": "#FCDCA0", standalone: "#C7CFDC",
};

export function Sidebar() {
  const pathname = usePathname();
  const [deals, setDeals]   = useState<Deal[]>([]);
  const [user, setUser]     = useState<AppUser | null>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    const allDeals = getDeals();
    // Dept-lead/team-member: only show deals where they have tasks
    const visible = canSeeAllWorkstreams(u)
      ? allDeals
      : allDeals.filter(d => d.tasks.some(t => t.workstreamId === u.deptId));
    setDeals(visible);

    const refresh = () => {
      const latest = getUser();
      setUser(latest);
      const all = getDeals();
      setDeals(canSeeAllWorkstreams(latest) ? all : all.filter(d => d.tasks.some(t => t.workstreamId === latest.deptId)));
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("user-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("user-change", refresh);
    };
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  if (!user) return null;

  const showCRM     = canSeeCRM(user);
  const showNewBtn  = canCreateIntegration(user);

  const navItems = [
    { href: "/",         label: "Dashboard", icon: LayoutDashboard, always: true },
    { href: "/crm",      label: "Pipeline",  icon: Target,          always: false, gate: showCRM },
    { href: "/team",     label: "Team",      icon: Users,           always: true },
    { href: "/settings", label: "Settings",  icon: Settings,        always: true },
  ].filter(item => item.always || item.gate);

  return (
    <aside className="w-[220px] shrink-0 h-screen sticky top-0 bg-white border-r border-[#E5E7EB] flex flex-col">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <svg width="34" height="22" viewBox="0 0 34 22" fill="none" className="shrink-0">
            <defs>
              <linearGradient id="tr" x1="0" y1="0" x2="34" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7B3F00" />
                <stop offset="100%" stopColor="#CD853F" />
              </linearGradient>
            </defs>
            <circle cx="11" cy="11" r="9" stroke="url(#tr)" strokeWidth="2.2" fill="none" />
            <circle cx="23" cy="11" r="9" stroke="url(#tr)" strokeWidth="2.2" fill="none" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#242C2D] leading-tight tracking-tight">twinrope</p>
            <p className="text-[9px] font-mono text-[#9CA3AF] tracking-widest uppercase">M&A · Integration · Growth</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      {showNewBtn && (
        <div className="px-4 pb-4">
          <Link href="/deals/new">
            <button className="w-full sf-gradient text-white text-xs font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Plus size={13} /> New Integration
            </button>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              isActive(href)
                ? "bg-[#F3F4F6] text-[#242C2D]"
                : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#242C2D]"
            }`}>
            <Icon size={14} className={isActive(href) ? "text-[#FF6400]" : "text-[#9CA3AF]"} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Integrations */}
      {deals.length > 0 && (
        <div className="mt-5 px-3 flex-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">
            {canSeeAllWorkstreams(user) ? "Integrations" : "My workstreams"}
          </p>
          <div className="space-y-0.5">
            {deals.map(deal => {
              const progress = getDealProgress(deal);
              const active   = pathname.startsWith(`/deals/${deal.id}`);
              const isPlan   = deal.planStatus === "planning";
              const href     = canSeeAllWorkstreams(user)
                ? (isPlan ? `/deals/${deal.id}/plan` : `/deals/${deal.id}`)
                : `/deals/${deal.id}/workstreams/${user.deptId}`;
              return (
                <Link key={deal.id} href={href}
                  className={`block px-3 py-2 rounded-xl transition-colors ${active ? "bg-[#FFEFE5]" : "hover:bg-[#F9FAFB]"}`}>
                  <div className="flex items-center gap-2">
                    {isPlan
                      ? <MapPin size={8} className="text-[#FF6400] shrink-0" />
                      : <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: strategyDot[deal.overallStrategy] }} />
                    }
                    <span className={`text-xs flex-1 truncate ${active ? "text-[#FF6400] font-medium" : "text-[#374151]"}`}>
                      {deal.addOnCompany}
                    </span>
                    {isPlan
                      ? <span className="text-[9px] font-mono text-[#FF6400]">plan</span>
                      : <span className="text-[10px] font-mono text-[#9CA3AF]">{progress}%</span>
                    }
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Current user */}
      <div className="mt-auto px-4 py-4 border-t border-[#E5E7EB]">
        <Link href="/settings" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-full bg-[#242C2D] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-medium text-white">{user.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#242C2D] truncate">{user.name}</p>
            <p className="text-[9px] font-mono text-[#9CA3AF] uppercase tracking-wider">{ROLE_LABELS[user.role]}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
