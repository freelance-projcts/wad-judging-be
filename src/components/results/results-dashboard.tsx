"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiClientError } from "@/lib/api-client";
import { genderLabels } from "@/lib/validators";
import type { Gender } from "@prisma/client";

export interface EventItem {
  id: string;
  name: string;
  gender: Gender;
}
interface Performance {
  id: string;
  name: string;
  order: number;
}
interface StudentLite {
  id: string;
  code: string;
  fullName: string;
  team: string | null;
}

function downloadUrl(performanceId: string, gender: Gender, eventId?: string) {
  const params = new URLSearchParams({ performanceId, gender });
  if (eventId) params.set("eventId", eventId);
  return `/api/results/download?${params.toString()}`;
}

async function triggerDownload(url: string, filenameFallback: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    toast.error("Failed to download results");
    return;
  }
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filenameFallback;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function TeamPerformanceTab({ performanceId, events }: { performanceId: string; events: EventItem[] }) {
  const [eventId, setEventId] = useState("");
  const [data, setData] = useState<{ teamA: { total: number; average: number }; teamB: { total: number; average: number } } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setData(null);
      return;
    }
    setLoading(true);
    api
      .get<{ data: typeof data }>(`/api/results?performanceId=${performanceId}&view=team&eventId=${eventId}`)
      .then((d) => setData(d.data))
      .catch((err) => toast.error(err instanceof ApiClientError ? err.message : "Failed to load results"))
      .finally(() => setLoading(false));
  }, [eventId, performanceId]);

  return (
    <div className="space-y-4">
      <Select value={eventId} onValueChange={setEventId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an Event..." />
        </SelectTrigger>
        <SelectContent>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name} ({genderLabels[e.gender]})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          className="flex-1 min-w-52 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => triggerDownload(downloadUrl(performanceId, "MALE"), "male-performance-results.csv")}
        >
          <Download /> Male Performance
        </Button>
        <Button
          variant="outline"
          className="flex-1 min-w-52 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => triggerDownload(downloadUrl(performanceId, "FEMALE"), "female-performance-results.csv")}
        >
          <Download /> Female Performance
        </Button>
      </div>

      {!eventId && <p className="text-center text-muted-foreground py-8">Please select an event to view team performances.</p>}
      {loading && <p className="text-center text-muted-foreground py-8">Loading…</p>}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Team A</p>
              <p className="text-3xl font-bold text-primary">{data.teamA.total}</p>
              <p className="text-xs text-muted-foreground mt-1">avg {data.teamA.average}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Team B</p>
              <p className="text-3xl font-bold text-primary">{data.teamB.total}</p>
              <p className="text-xs text-muted-foreground mt-1">avg {data.teamB.average}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function Top8Tab({ performanceId, events }: { performanceId: string; events: EventItem[] }) {
  const [eventId, setEventId] = useState("");
  const [data, setData] = useState<{ rank: number; student: StudentLite; score: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setData([]);
      return;
    }
    setLoading(true);
    api
      .get<{ data: typeof data }>(`/api/results?performanceId=${performanceId}&view=top8&eventId=${eventId}`)
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, [eventId, performanceId]);

  return (
    <div className="space-y-4">
      <Select value={eventId} onValueChange={setEventId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an Event..." />
        </SelectTrigger>
        <SelectContent>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name} ({genderLabels[e.gender]})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!eventId && <p className="text-center text-muted-foreground py-8">Select an event to view the top 8.</p>}
      {loading && <p className="text-center text-muted-foreground py-8">Loading…</p>}
      {data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.student.id}>
                <TableCell>{row.rank}</TableCell>
                <TableCell>{row.student.fullName}</TableCell>
                <TableCell>{row.student.code}</TableCell>
                <TableCell>{row.student.team ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">{row.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function AllRoundersTab({ performanceId }: { performanceId: string }) {
  const [gender, setGender] = useState<Gender>("MALE");
  const [data, setData] = useState<{ rank: number; student: StudentLite; eventsCompeted: number; total: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: typeof data }>(`/api/results?performanceId=${performanceId}&view=all-rounders&gender=${gender}`)
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, [gender, performanceId]);

  return (
    <div className="space-y-4">
      <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MALE">Male</SelectItem>
          <SelectItem value="FEMALE">Female</SelectItem>
        </SelectContent>
      </Select>

      {loading && <p className="text-center text-muted-foreground py-8">Loading…</p>}
      {!loading && data.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No all-rounder results yet.</p>
      )}
      {data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Events</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.student.id}>
                <TableCell>{row.rank}</TableCell>
                <TableCell>{row.student.fullName}</TableCell>
                <TableCell>{row.eventsCompeted}</TableCell>
                <TableCell className="text-right font-semibold">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function PerformanceResultsTab({ performanceId, events, label }: { performanceId: string; events: EventItem[]; label: string }) {
  const [eventId, setEventId] = useState("");
  const [searched, setSearched] = useState(false);
  const [data, setData] = useState<{ teamA: { total: number; average: number }; teamB: { total: number; average: number } } | null>(
    null
  );

  async function handleSearch() {
    if (!eventId) return;
    setSearched(true);
    const d = await api.get<{ data: typeof data }>(`/api/results?performanceId=${performanceId}&view=team&eventId=${eventId}`);
    setData(d.data);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an Event..." />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} ({genderLabels[e.gender]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="icon" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          className="flex-1 min-w-52 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => triggerDownload(downloadUrl(performanceId, "MALE"), `male-${label}-results.csv`)}
        >
          <Download /> Male {label} Results
        </Button>
        <Button
          variant="outline"
          className="flex-1 min-w-52 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={() => triggerDownload(downloadUrl(performanceId, "FEMALE"), `female-${label}-results.csv`)}
        >
          <Download /> Female {label} Results
        </Button>
      </div>

      {!searched && <p className="text-center text-muted-foreground py-8">Please select an event and search.</p>}
      {searched && data && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Team A</p>
              <p className="text-3xl font-bold text-primary">{data.teamA.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">Team B</p>
              <p className="text-3xl font-bold text-primary">{data.teamB.total}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function ResultsDashboard({ showPerformanceTab }: { showPerformanceTab: boolean }) {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const load = useCallback(async () => {
    const [p, e] = await Promise.all([
      api.get<{ performances: Performance[] }>("/api/performances"),
      api.get<{ events: EventItem[] }>("/api/events"),
    ]);
    setPerformances(p.performances.sort((a, b) => a.order - b.order));
    setEvents(e.events);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const primary = performances[0];
  const secondary = performances[1];

  const tabs = useMemo(
    () => [
      { value: "team", label: "Team Performance" },
      { value: "top8", label: "Top 8" },
      { value: "all-rounders", label: "All Rounders" },
      ...(showPerformanceTab && secondary ? [{ value: "performance2", label: secondary.name }] : []),
    ],
    [showPerformanceTab, secondary]
  );

  if (!primary) {
    return <p className="text-muted-foreground">Loading events…</p>;
  }

  return (
    <Tabs defaultValue="team">
      <TabsList className="w-full flex-wrap h-auto">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="flex-1">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="team" className="mt-4">
        <TeamPerformanceTab performanceId={primary.id} events={events} />
      </TabsContent>
      <TabsContent value="top8" className="mt-4">
        <Top8Tab performanceId={primary.id} events={events} />
      </TabsContent>
      <TabsContent value="all-rounders" className="mt-4">
        <AllRoundersTab performanceId={primary.id} />
      </TabsContent>
      {showPerformanceTab && secondary && (
        <TabsContent value="performance2" className="mt-4">
          <PerformanceResultsTab performanceId={secondary.id} events={events} label="P2" />
        </TabsContent>
      )}
    </Tabs>
  );
}
