"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, ApiClientError } from "@/lib/api-client";
import { provinceLabels } from "@/lib/validators";
import type { Province } from "@prisma/client";

interface MarkNotification {
  id: string;
  student: { code: string; fullName: string; province: Province };
  event: { name: string };
  performance: { name: string };
  dScore: string;
  finalScore: string;
}

interface EditRequestItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  requester: { name: string };
  markEntry: { student: { fullName: string }; event: { name: string } };
}

export default function NotificationsPage() {
  const [marks, setMarks] = useState<MarkNotification[]>([]);
  const [requests, setRequests] = useState<EditRequestItem[]>([]);

  const load = useCallback(async () => {
    const [m, r] = await Promise.all([
      api.get<{ marks: MarkNotification[] }>("/api/notifications"),
      api.get<{ requests: EditRequestItem[] }>("/api/edit-requests"),
    ]);
    setMarks(m.marks);
    setRequests(r.requests);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, status: "APPROVED" | "REJECTED") {
    try {
      await api.patch(`/api/edit-requests/${id}`, { status });
      toast.success(`Request ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to resolve request");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Approve/reject requests and view mark entries" />

      <Tabs defaultValue="marks">
        <TabsList className="w-full">
          <TabsTrigger value="marks" className="flex-1">
            Mark Entry Notifications
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1">
            Admin Edit Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marks" className="space-y-3 mt-4">
          {marks.length === 0 && <p className="text-muted-foreground text-sm">No mark entries yet.</p>}
          {marks.map((m) => (
            <Card key={m.id} className="bg-accent/40 border-none">
              <CardContent className="py-4">
                <p className="font-medium text-primary">Marks Entered: {m.student.fullName}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm mt-2">
                  <p>
                    <span className="font-semibold">ID:</span> {m.student.code}
                  </p>
                  <p>
                    <span className="font-semibold">Province:</span> {provinceLabels[m.student.province]}
                  </p>
                  <p>
                    <span className="font-semibold">Event:</span> {m.event.name}
                  </p>
                  <p>
                    <span className="font-semibold">D Mark:</span> {m.dScore}
                  </p>
                  <p>
                    <span className="font-semibold">Final Mark:</span> {m.finalScore}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3 mt-4">
          {requests.length === 0 && <p className="text-muted-foreground text-sm">No edit requests yet.</p>}
          {requests.map((r) => (
            <Card key={r.id} className="bg-accent/40 border-none">
              <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-primary">Request from {r.requester.name}</p>
                  <p className="text-sm">
                    Wants to edit marks for <span className="font-semibold">{r.markEntry.student.fullName}</span>{" "}
                    in the event <span className="font-semibold">{r.markEntry.event.name}</span>.
                  </p>
                  {r.reason && <p className="text-sm text-muted-foreground mt-1">Reason: {r.reason}</p>}
                </div>
                {r.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id, "REJECTED")}>
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => resolve(r.id, "APPROVED")}>
                      Approve
                    </Button>
                  </div>
                ) : (
                  <Badge variant={r.status === "APPROVED" ? "default" : "destructive"}>
                    {r.status === "APPROVED" ? "Approved" : "Rejected"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
