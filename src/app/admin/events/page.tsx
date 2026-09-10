"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { genders, genderLabels } from "@/lib/validators";
import { api, ApiClientError } from "@/lib/api-client";
import type { Gender } from "@prisma/client";

interface EventItem {
  id: string;
  name: string;
  gender: Gender;
}

export default function ManageEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filterGender, setFilterGender] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterGender !== "ALL") params.set("gender", filterGender);
    const data = await api.get<{ events: EventItem[] }>(`/api/events?${params.toString()}`);
    setEvents(data.events);
  }, [filterGender]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setGender("");
    setDialogOpen(true);
  }

  function openEdit(event: EventItem) {
    setEditing(event);
    setName(event.name);
    setGender(event.gender);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!gender || !name.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/events/${editing.id}`, { name, gender });
        toast.success("Event updated");
      } else {
        await api.post("/api/events", { name, gender });
        toast.success("Event created");
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/events/${deleteTarget.id}`);
      toast.success("Event deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete event");
    }
  }

  const maleEvents = events.filter((e) => e.gender === "MALE");
  const otherEvents = events.filter((e) => e.gender !== "MALE");

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Events" subtitle="Add, edit, or remove events" />

      <div className="flex justify-between gap-3 flex-wrap">
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Genders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Genders</SelectItem>
            {genders.map((g) => (
              <SelectItem key={g} value={g}>
                {genderLabels[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus /> Add New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...maleEvents, ...otherEvents].map((event) => (
          <Card key={event.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-muted-foreground">Gender: {genderLabels[event.gender]}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(event)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && <p className="text-muted-foreground text-sm">No events yet.</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Event" : "Add New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                {genders.map((g) => (
                  <SelectItem key={g} value={g}>
                    {genderLabels[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Event Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Save Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this event?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
