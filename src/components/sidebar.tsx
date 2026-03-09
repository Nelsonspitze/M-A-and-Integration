"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, AppUser, resolvePermissions, ROLE_LABELS } from "@/lib/auth";
import { LayoutDashboard, Settings, Users, Target, Layers, TrendingUp, FolderOpen } from "lucide-react";

const partyBadge: Record<string, { label: string; color: string }> = {
  buyer:   { label: "Buyer",   color: "#FF6400" },
  seller:  { label: "Seller",  color: "#74A0F4" },
  advisor: { label: "Advisor", color: "#9AC183" },
};

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setUser(getUser());
    const refresh = () => setUser(getUser());
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

  const perms = resolvePermissions(user);
  const badge = partyBadge[user.partyType] ?? partyBadge.buyer;

  const navItems = [
    { href: "/",                label: "Dashboard",       icon: LayoutDashboard, show: true },
    { href: "/crm",             label: "Pipeline",        icon: Target,          show: perms.pipeline !== "none" },
    { href: "/implementations", label: "Integrations",    icon: Layers,          show: perms.workstreams !== "none" },
    { href: "/synergies",       label: "Synergies",       icon: TrendingUp,      show: perms.synergies !== "none" },
    { href: "/dataroom",        label: "Dataroom",        icon: FolderOpen,      show: perms.vdr !== "none" || perms.dataroom !== "none" },
    { href: "/team",            label: "Team",            icon: Users,           show: true },
    { href: "/settings",        label: "Settings",        icon: Settings,        show: true },
  ].filter(item => item.show);

  return (
    <aside className="w-[220px] shrink-0 h-screen sticky top-0 bg-white border-r border-[#E5E7EB] flex flex-col">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
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
        </Link>
      </div>


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


      {/* Current user */}
      <div className="mt-auto px-4 py-4 border-t border-[#E5E7EB]">
        <Link href="/settings" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-full bg-[#242C2D] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-medium text-white">{user.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#242C2D] truncate">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono text-[#9CA3AF] uppercase tracking-wider truncate">
                {ROLE_LABELS[user.role]}
              </span>
              <span className="text-[8px] font-mono px-1 py-px rounded shrink-0"
                style={{ backgroundColor: `${badge.color}20`, color: badge.color }}>
                {badge.label}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
