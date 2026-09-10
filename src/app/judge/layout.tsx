"use client";

import { Home, ListChecks, BarChart3, User } from "lucide-react";
import { Sidebar, type SidebarSection } from "@/components/layout/sidebar";
import { useSession } from "@/components/providers/session-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  const { user, performances, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "JUDGE")) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "JUDGE") {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const sections: SidebarSection[] = [
    ...performances.map((p) => ({
      label: p.name.toUpperCase(),
      items: [
        { label: "Home", href: `/judge/performances/${p.id}`, icon: Home },
        { label: "Marks", href: `/judge/performances/${p.id}/marks`, icon: ListChecks },
        { label: "Results", href: `/judge/performances/${p.id}/results`, icon: BarChart3 },
      ],
    })),
    {
      label: "General",
      items: [{ label: "Profile", href: "/judge/profile", icon: User }],
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar sections={sections} />
      <main className="flex-1 p-8 space-y-6 max-w-[1400px]">
        {performances.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            You have not been assigned to any performance yet. Please contact an administrator.
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
