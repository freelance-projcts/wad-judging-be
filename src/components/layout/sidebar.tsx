"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useSession } from "@/components/providers/session-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface SidebarSection {
  label?: string;
  items: SidebarNavItem[];
}

export function Sidebar({ sections }: { sections: SidebarSection[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { refresh } = useSession();

  // Highlight only the single most-specific matching item (longest href match),
  // so a parent "Home" route doesn't stay highlighted while on a child "Marks"/"Results" page.
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  async function handleLogout() {
    await api.post("/api/auth/logout");
    await refresh();
    router.push("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="flex flex-col items-center gap-2 py-6 px-4 border-b border-sidebar-border">
        <div className="size-12 rounded-full bg-sidebar-accent flex items-center justify-center text-lg font-bold text-sidebar-accent-foreground">
          WJ
        </div>
        <span className="font-semibold text-sm tracking-wide">WAD Judging</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.label && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors">
              <LogOut className="size-4 shrink-0" />
              <span>Logout</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Logout</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to logout?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
}
