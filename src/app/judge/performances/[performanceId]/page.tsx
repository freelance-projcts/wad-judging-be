"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useSession } from "@/components/providers/session-provider";
import { genderLabels } from "@/lib/validators";
import type { Gender } from "@prisma/client";

interface EventItem {
  id: string;
  name: string;
  gender: Gender;
}

export default function JudgePerformanceHomePage() {
  const { performanceId } = useParams<{ performanceId: string }>();
  const { user, performances } = useSession();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    api.get<{ events: EventItem[] }>("/api/events").then((d) => setEvents(d.events));
    api.get<{ students: unknown[] }>("/api/students").then((d) => setStudentCount(d.students.length));
  }, []);

  const performance = performances.find((p) => p.id === performanceId);
  const today = new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.name ?? ""}`} subtitle={today} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Events" value={events.length} icon={CalendarDays} colorClassName="text-emerald-600" />
        <StatCard label="Total Students" value={studentCount} icon={Users} colorClassName="text-primary" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Available Events</h2>
        <div className="space-y-3">
          {events.map((event) => (
            <Link key={event.id} href={`/judge/performances/${performanceId}/marks?gender=${event.gender}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-sm text-muted-foreground">Gender: {genderLabels[event.gender]}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {events.length === 0 && <p className="text-muted-foreground text-sm">No events yet.</p>}
        </div>
      </div>

      {performance && <p className="text-xs text-muted-foreground">Viewing {performance.name}</p>}
    </div>
  );
}
