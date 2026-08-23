"use client";

import Image from "next/image";
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
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar-bg">
      <div className="px-5 py-5">
        <Link href="/dashboard/siniestros" className="inline-flex items-center">
          <Image
            src="/choqui-logo.png"
            alt="Choqui"
            width={120}
            height={48}
            className="h-10 w-auto"
            priority
          />
        </Link>
        <p className="mt-2 text-xs text-white/60">Aseguradora demo</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-active text-white"
                  : "text-white/70 hover:bg-sidebar-active/60 hover:text-white"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-white" : "text-white/60"
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {"showBadge" in item && item.showBadge && (
                <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
                  {nuevosCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-xs text-white/50">{userEmail}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs text-white/60 transition-colors hover:bg-sidebar-active/60 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
