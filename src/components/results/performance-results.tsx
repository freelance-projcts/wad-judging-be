"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { TeamPerformanceTab, Top8Tab, AllRoundersTab, type EventItem } from "./results-dashboard";

/** Results view scoped to a single performance - used on the judge side, where a judge
 * must only ever see results for a performance they're assigned to. */
export function PerformanceResults({ performanceId }: { performanceId: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    api.get<{ events: EventItem[] }>("/api/events").then((d) => setEvents(d.events));
  }, []);

  return (
    <Tabs defaultValue="team">
      <TabsList className="w-full">
        <TabsTrigger value="team" className="flex-1">
          Team Performance
        </TabsTrigger>
        <TabsTrigger value="top8" className="flex-1">
          Top 8
        </TabsTrigger>
        <TabsTrigger value="all-rounders" className="flex-1">
          All Rounders
        </TabsTrigger>
      </TabsList>

      <TabsContent value="team" className="mt-4">
        <TeamPerformanceTab performanceId={performanceId} events={events} />
      </TabsContent>
      <TabsContent value="top8" className="mt-4">
        <Top8Tab performanceId={performanceId} events={events} />
      </TabsContent>
      <TabsContent value="all-rounders" className="mt-4">
        <AllRoundersTab performanceId={performanceId} />
      </TabsContent>
    </Tabs>
  );
}
