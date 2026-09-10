"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Performance {
  id: string;
  name: string;
}
interface Judge {
  id: string;
  name: string;
  email: string;
  performances: Performance[];
}

export default function ManageJudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [j, p] = await Promise.all([
      api.get<{ judges: Judge[] }>("/api/judges"),
      api.get<{ performances: Performance[] }>("/api/performances"),
    ]);
    setJudges(j.judges);
    setPerformances(p.performances);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(judge: Judge, performance: Performance) {
    const assigned = judge.performances.some((p) => p.id === performance.id);
    setJudges((prev) =>
      prev.map((j) =>
        j.id === judge.id
          ? {
              ...j,
              performances: assigned
                ? j.performances.filter((p) => p.id !== performance.id)
                : [...j.performances, performance],
            }
          : j
      )
    );
    try {
      if (assigned) {
        await api.delete(`/api/judges/${judge.id}/performances?performanceId=${performance.id}`);
      } else {
        await api.post(`/api/judges/${judge.id}/performances`, { performanceId: performance.id });
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update assignment");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Judges"
        subtitle="Grant or revoke judge access to each performance"
      />

      {!loading && judges.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No judges have registered yet. Judges can create an account from the Sign Up page.
        </p>
      )}

      <div className="space-y-3">
        {judges.map((judge) => (
          <Card key={judge.id}>
            <CardContent className="py-4 space-y-3">
              <div>
                <p className="font-medium">{judge.name}</p>
                <p className="text-sm text-muted-foreground">{judge.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {performances.map((perf) => {
                  const assigned = judge.performances.some((p) => p.id === perf.id);
                  return (
                    <Button
                      key={perf.id}
                      size="sm"
                      variant={assigned ? "default" : "outline"}
                      className={cn("rounded-full", assigned && "bg-primary")}
                      onClick={() => toggle(judge, perf)}
                    >
                      {perf.name}
                      {assigned && <Badge variant="secondary" className="ml-1.5 bg-white/20 text-inherit">granted</Badge>}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
