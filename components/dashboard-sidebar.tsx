"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, FolderOpen, LogOut, ScanSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DashboardSidebarProps {
  userEmail: string;
}

const NAV_ITEMS = [
  {
    href: "/dashboard/siniestros",
    label: "Siniestros",
    icon: FolderOpen,
    match: (pathname: string) =>
      pathname === "/dashboard/siniestros" ||
      (pathname.startsWith("/dashboard/siniestros/") &&
        !pathname.startsWith("/dashboard/siniestros/nuevos")),
  },
  {
    href: "/dashboard/siniestros/nuevos",
    label: "Nuevos Siniestros",
    icon: Bell,
    showBadge: true,
    match: (pathname: string) =>
      pathname.startsWith("/dashboard/siniestros/nuevos"),
  },
  {
    href: "/dashboard/fraude",
    label: "Diagnósticos de Fraude",
    icon: ScanSearch,
    match: (pathname: string) => pathname.startsWith("/dashboard/fraude"),
  },
] as const;

export function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [nuevosCount, setNuevosCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function fetchCount() {
      const { count, error } = await supabase
        .from("siniestros")
        .select("*", { count: "exact", head: true })
        .eq("estado", "inicio");

      if (!error && isMounted && typeof count === "number") {
        setNuevosCount(count);
      }
    }

    fetchCount();

    const channel = supabase
      .channel("sidebar-nuevos-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "siniestros" },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-bg-surface">
      <div className="border-b border-border px-5 py-5">
        <p className="text-lg font-semibold tracking-tight text-text-primary">
          Choqui
        </p>
        <p className="mt-0.5 text-xs text-text-muted">Aseguradora demo</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-accent/15 text-text-primary"
                  : "text-text-muted hover:bg-bg-surface-hover hover:text-text-primary"
              }`}
            >
              <span
                className={`h-5 w-0.5 rounded-full ${
                  isActive ? "bg-accent" : "bg-transparent"
                }`}
              />
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-accent" : "text-text-muted"
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {"showBadge" in item && item.showBadge && (
                <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent">
                  {nuevosCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <p className="truncate text-xs text-text-muted">{userEmail}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-text-muted transition-colors hover:bg-bg-surface-hover hover:text-text-primary"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
