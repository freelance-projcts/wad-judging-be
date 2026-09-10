"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CalendarDays, BellRing } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api-client";
import { useSession } from "@/components/providers/session-provider";

interface Student {
  id: string;
  code: string;
  fullName: string;
  createdAt: string;
}
interface EditRequest {
  id: string;
  status: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminDashboardPage() {
  const { user } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.get<{ students: Student[] }>("/api/students").then((d) => setStudents(d.students));
    api.get<{ events: unknown[] }>("/api/events").then((d) => setEventCount(d.events.length));
    api
      .get<{ requests: EditRequest[] }>("/api/edit-requests")
      .then((d) => setPendingCount(d.requests.filter((r) => r.status === "PENDING").length));
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.name ?? ""}`} subtitle={today} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Students" value={students.length} icon={Users} colorClassName="text-primary" />
        <StatCard label="Total Events" value={eventCount} icon={CalendarDays} colorClassName="text-emerald-600" />
        <StatCard label="Pending Requests" value={pendingCount} icon={BellRing} colorClassName="text-red-500" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Recently Added Students</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {students.slice(0, 8).map((s) => (
            <Link key={s.id} href={`/admin/students/${s.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex flex-col items-center gap-2 py-4">
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials(s.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm text-center leading-tight">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.code}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {students.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full">No students yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
