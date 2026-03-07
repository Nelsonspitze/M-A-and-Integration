"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Deal, getDeals } from "@/lib/store";
import { LayoutDashboard, Plus, Settings } from "lucide-react";

function getDealProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  return Math.round((deal.tasks.filter(t => t.completed).length / deal.tasks.length) * 100);
}

const strategyDot: Record<string, string> = {
  full: "#FF6400", partial: "#74A0F4", "bolt-on": "#FCDCA0", standalone: "#C7CFDC",
};

export function Sidebar() {
  const pathname = usePathname();
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    setDeals(getDeals());
    const h = () => setDeals(getDeals());
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-[220px] shrink-0 h-screen sticky top-0 bg-white border-r border-[#E5E7EB] flex flex-col">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          {/* Twinrope interlocking circles */}
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
      <div className="px-4 pb-4">
        <Link href="/deals/new">
          <button className="w-full sf-gradient text-white text-xs font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Plus size={13} /> New Integration
          </button>
        </Link>
      </div>

      {/* Nav */}
      <nav className="px-3 space-y-0.5">
        {[
          { href: "/",         label: "Dashboard", icon: LayoutDashboard },
          { href: "/settings", label: "Settings",  icon: Settings },
        ].map(({ href, label, icon: Icon }) => (
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
            Integrations
          </p>
          <div className="space-y-0.5">
            {deals.map(deal => {
              const progress = getDealProgress(deal);
              const active = pathname.startsWith(`/deals/${deal.id}`);
              return (
                <Link key={deal.id} href={`/deals/${deal.id}`}
                  className={`block px-3 py-2 rounded-xl transition-colors ${active ? "bg-[#FFEFE5]" : "hover:bg-[#F9FAFB]"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: strategyDot[deal.overallStrategy] }} />
                    <span className={`text-xs flex-1 truncate ${active ? "text-[#FF6400] font-medium" : "text-[#374151]"}`}>
                      {deal.addOnCompany}
                    </span>
                    <span className="text-[10px] font-mono text-[#9CA3AF]">{progress}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="mt-auto px-5 py-4 border-t border-[#E5E7EB]">
        <p className="text-[10px] font-mono text-[#9CA3AF]">MVP · v0.1</p>
      </div>
    </aside>
  );
}
