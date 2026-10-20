"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  TrendingUp,
  Handshake,
  Map,
} from "lucide-react";
import clsx from "clsx";

const links = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/parceiros", label: "Parceiros", icon: Users },
  { href: "/mapa", label: "Mapa de Parceiros", icon: Map },
  { href: "/vencimentos", label: "Vencimentos futuros", icon: CalendarDays },
  { href: "/leads", label: "Leads ativos", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-surface-sidebar text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Parceiros</p>
            <p className="text-xs text-white/50">Inteligência comercial</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Menu
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active
                  ? "bg-brand/25 text-white border-l-2 border-brand pl-[10px]"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
        Ambiente local · leitura
      </div>
    </aside>
  );
}
