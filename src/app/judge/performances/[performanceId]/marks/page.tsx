"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Search, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarksDialog } from "@/components/marks/marks-dialog";
import { api } from "@/lib/api-client";
import { genders, genderLabels, provinces, provinceLabels } from "@/lib/validators";
import type { Gender, Team } from "@prisma/client";

interface StudentLite {
  id: string;
  code: string;
  fullName: string;
  team: Team | null;
}
interface EventItem {
  id: string;
  name: string;
  gender: Gender;
}

export default function JudgeMarksPage() {
  const { performanceId } = useParams<{ performanceId: string }>();
  const searchParams = useSearchParams();

  const [gender, setGender] = useState(searchParams.get("gender") ?? "");
  const [province, setProvince] = useState("");
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<StudentLite | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    api.get<{ events: EventItem[] }>("/api/events").then((d) => setAllEvents(d.events));
  }, []);

  const search = useCallback(async () => {
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (province) params.set("province", province);
    const data = await api.get<{ students: StudentLite[] }>(`/api/students?${params.toString()}`);
    setStudents(data.students);
    setSearched(true);
  }, [gender, province]);

  useEffect(() => {
    if (gender) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDialog(student: StudentLite) {
    setSelected(student);
    setDialogOpen(true);
  }

  const eventsForGender = gender ? allEvents.filter((e) => e.gender === gender) : allEvents;
  const teamA = students.filter((s) => s.team === "A");
  const teamB = students.filter((s) => s.team === "B");
  const unassigned = students.filter((s) => !s.team);

  return (
    <div className="space-y-6">
      <PageHeader title="Performance Marks" subtitle="Filter students and add marks for this performance's events." />

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Gender..." />
          </SelectTrigger>
          <SelectContent>
            {genders.map((g) => (
              <SelectItem key={g} value={g}>
                {genderLabels[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Province..." />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {provinceLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={search}>
          <Search /> Search
        </Button>
      </div>

      {!searched && <p className="text-muted-foreground text-center py-10">Use the filters above and search for students.</p>}

      {searched && (
        <div className="space-y-6">
          {teamA.length > 0 && (
            <StudentGroup title={`Team A Students (${teamA.length})`} students={teamA} onEdit={openDialog} />
          )}
          {teamB.length > 0 && (
            <StudentGroup title={`Team B Students (${teamB.length})`} students={teamB} onEdit={openDialog} />
          )}
          {unassigned.length > 0 && (
            <StudentGroup title={`Unassigned Students (${unassigned.length})`} students={unassigned} onEdit={openDialog} />
          )}
          {students.length === 0 && <p className="text-muted-foreground text-center py-10">No students found.</p>}
        </div>
      )}

      {selected && (
        <MarksDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          performanceId={performanceId}
          studentId={selected.id}
          studentName={selected.fullName}
          events={eventsForGender}
          onSaved={search}
        />
      )}
    </div>
  );
}

function StudentGroup({
  title,
  students,
  onEdit,
}: {
  title: string;
  students: StudentLite[];
  onEdit: (s: StudentLite) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold text-primary mb-2">{title}</h3>
      <div className="space-y-2">
        {students.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-primary">ID: {s.code}</p>
                <p className="text-sm">{s.fullName}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => onEdit(s)}>
                  Add Marks
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                  <Pencil className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
