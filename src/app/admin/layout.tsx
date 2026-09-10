"use client";

import { Home, UserPlus, ClipboardList, CalendarDays, Users, Gavel, BarChart3, Bell, User } from "lucide-react";
import { Sidebar, type SidebarSection } from "@/components/layout/sidebar";
import { useSession } from "@/components/providers/session-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const sections: SidebarSection[] = [
  {
    items: [
      { label: "Home", href: "/admin", icon: Home },
      { label: "Student", href: "/admin/students/new", icon: UserPlus },
      { label: "Student List", href: "/admin/students", icon: ClipboardList },
      { label: "Event", href: "/admin/events", icon: CalendarDays },
      { label: "Team", href: "/admin/team", icon: Users },
      { label: "Judges", href: "/admin/judges", icon: Gavel },
      { label: "Results", href: "/admin/results", icon: BarChart3 },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Profile", href: "/admin/profile", icon: User },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar sections={sections} />
      <main className="flex-1 p-8 space-y-6 max-w-[1400px]">{children}</main>
    </div>
  );
}
