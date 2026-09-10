"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api-client";
import type { Gender } from "@prisma/client";

interface EventItem {
  id: string;
  name: string;
  gender: Gender;
}

interface RoundForm {
  round: number;
  markEntryId?: string;
  d: string;
  dSupervisor: string;
  e1: string;
  e1Supervisor: string;
  e2: string;
  e2Supervisor: string;
  e3: string;
  e3Supervisor: string;
  e4: string;
  e4Supervisor: string;
  p: string;
  pSupervisor: string;
}

function emptyRound(round: number): RoundForm {
  return {
    round,
    d: "",
    dSupervisor: "",
    e1: "",
    e1Supervisor: "",
    e2: "",
    e2Supervisor: "",
    e3: "",
    e3Supervisor: "",
    e4: "",
    e4Supervisor: "",
    p: "0",
    pSupervisor: "",
  };
}

interface MarkEntryDto {
  id: string;
  round: number;
  dScore: string;
  dSupervisor: string | null;
  e1Score: string;
  e1Supervisor: string | null;
  e2Score: string;
  e2Supervisor: string | null;
  e3Score: string;
  e3Supervisor: string | null;
  e4Score: string;
  e4Supervisor: string | null;
  penaltyScore: string;
  penaltySupervisor: string | null;
}

export function MarksDialog({
  open,
  onOpenChange,
  performanceId,
  studentId,
  studentName,
  events,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performanceId: string;
  studentId: string;
  studentName: string;
  events: EventItem[];
  onSaved: () => void;
}) {
  const [eventId, setEventId] = useState("");
  const [rounds, setRounds] = useState<RoundForm[]>([emptyRound(1)]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEventId("");
      setRounds([emptyRound(1)]);
    }
  }, [open]);

  useEffect(() => {
    if (!eventId) {
      setRounds([emptyRound(1)]);
      return;
    }
    setLoading(true);
    api
      .get<{ marks: MarkEntryDto[] }>(`/api/marks?performanceId=${performanceId}&eventId=${eventId}&studentId=${studentId}`)
      .then((d) => {
        if (d.marks.length === 0) {
          setRounds([emptyRound(1)]);
          return;
        }
        setRounds(
          d.marks
            .sort((a, b) => a.round - b.round)
            .map((m) => ({
              round: m.round,
              markEntryId: m.id,
              d: m.dScore,
              dSupervisor: m.dSupervisor ?? "",
              e1: m.e1Score,
              e1Supervisor: m.e1Supervisor ?? "",
              e2: m.e2Score,
              e2Supervisor: m.e2Supervisor ?? "",
              e3: m.e3Score,
              e3Supervisor: m.e3Supervisor ?? "",
              e4: m.e4Score,
              e4Supervisor: m.e4Supervisor ?? "",
              p: m.penaltyScore,
              pSupervisor: m.penaltySupervisor ?? "",
            }))
        );
      })
      .finally(() => setLoading(false));
  }, [eventId, performanceId, studentId]);

  function updateRound(index: number, field: keyof RoundForm, value: string) {
    setRounds((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRound() {
    const nextRound = Math.max(...rounds.map((r) => r.round)) + 1;
    setRounds((prev) => [...prev, emptyRound(nextRound)]);
  }

  async function requestEditAccess(markEntryId: string) {
    try {
      await api.post("/api/edit-requests", { markEntryId });
      toast.success("Edit request sent to the administrator");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to request edit access");
    }
  }

  async function handleSave() {
    if (!eventId) {
      toast.error("Please select an event");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        studentId,
        eventId,
        performanceId,
        rounds: rounds.map((r) => ({
          round: r.round,
          d: Number(r.d),
          dSupervisor: r.dSupervisor || null,
          e1: Number(r.e1),
          e1Supervisor: r.e1Supervisor || null,
          e2: Number(r.e2),
          e2Supervisor: r.e2Supervisor || null,
          e3: Number(r.e3),
          e3Supervisor: r.e3Supervisor || null,
          e4: Number(r.e4),
          e4Supervisor: r.e4Supervisor || null,
          p: Number(r.p || 0),
          pSupervisor: r.pSupervisor || null,
        })),
      };
      await api.post("/api/marks", payload);
      toast.success("Marks saved successfully");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        const blockedRound = rounds.find((r) => r.markEntryId);
        toast.error(err.message, {
          action: blockedRound?.markEntryId
            ? {
                label: "Request Access",
                onClick: () => requestEditAccess(blockedRound.markEntryId!),
              }
            : undefined,
        });
      } else {
        toast.error(err instanceof ApiClientError ? err.message : "Failed to save marks");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Marks for {studentName}</DialogTitle>
        </DialogHeader>

        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Event..." />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && <p className="text-sm text-muted-foreground">Loading existing marks…</p>}

        {eventId &&
          !loading &&
          rounds.map((round, index) => (
            <div key={round.round} className="space-y-2 border rounded-lg p-3">
              <p className="font-semibold text-sm">Round {round.round}</p>
              {(
                [
                  ["d", "dSupervisor", "D"],
                  ["e1", "e1Supervisor", "E1"],
                  ["e2", "e2Supervisor", "E2"],
                  ["e3", "e3Supervisor", "E3"],
                  ["e4", "e4Supervisor", "E4"],
                  ["p", "pSupervisor", "P"],
                ] as const
              ).map(([scoreField, supField, label]) => (
                <div key={scoreField} className="flex items-center gap-2">
                  <span className="w-6 text-sm font-medium text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Score"
                    className="w-24"
                    value={round[scoreField]}
                    onChange={(e) => updateRound(index, scoreField, e.target.value)}
                  />
                  <Input
                    placeholder="Supervisor"
                    value={round[supField]}
                    onChange={(e) => updateRound(index, supField, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}

        {eventId && !loading && (
          <button
            type="button"
            onClick={addRound}
            className="flex items-center justify-center gap-2 text-sm text-primary hover:underline py-2"
          >
            <Plus className="size-4" /> Add Round {Math.max(...rounds.map((r) => r.round)) + 1}
          </button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !eventId}>
            {saving ? "Saving…" : "Save Marks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
