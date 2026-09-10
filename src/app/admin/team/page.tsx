"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { genders, genderLabels, provinces, provinceLabels } from "@/lib/validators";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Gender, Team } from "@prisma/client";

interface Student {
  id: string;
  code: string;
  fullName: string;
  team: Team | null;
}

export default function AssignTeamsPage() {
  const [gender, setGender] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const load = useCallback(async () => {
    if (!gender && !province) {
      setStudents([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    if (province) params.set("province", province);
    const data = await api.get<{ students: Student[] }>(`/api/students?${params.toString()}`);
    setStudents(data.students);
    setLoading(false);
  }, [gender, province]);

  useEffect(() => {
    load();
  }, [load]);

  async function setTeam(studentId: string, team: Team) {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, team } : s)));
    try {
      await api.patch("/api/team", { studentId, team });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update team");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assign Teams" subtitle="Filter students and assign them to Team A or Team B" />

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All Genders" />
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
            <SelectValue placeholder="All Provinces" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {provinceLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!searched && <p className="text-muted-foreground text-center py-10">Please select filters to find students.</p>}
      {searched && !loading && students.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No students found.</p>
      )}

      <div className="space-y-3">
        {students.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{s.fullName}</p>
                <p className="text-sm text-muted-foreground">Current Team: {s.team ?? "—"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={s.team === "A" ? "default" : "outline"}
                  className={cn("rounded-full px-4", s.team === "A" && "bg-primary")}
                  onClick={() => setTeam(s.id, "A")}
                >
                  A
                </Button>
                <Button
                  size="sm"
                  variant={s.team === "B" ? "default" : "outline"}
                  className={cn("rounded-full px-4", s.team === "B" && "bg-primary")}
                  onClick={() => setTeam(s.id, "B")}
                >
                  B
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
