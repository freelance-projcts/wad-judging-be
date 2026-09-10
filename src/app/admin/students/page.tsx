"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { provinces, provinceLabels } from "@/lib/validators";
import { api } from "@/lib/api-client";

interface Student {
  id: string;
  code: string;
  fullName: string;
  province: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (province !== "ALL") params.set("province", province);
    const data = await api.get<{ students: Student[] }>(`/api/students?${params.toString()}`);
    setStudents(data.students);
    setLoading(false);
  }, [q, province]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Student List" subtitle="Search and manage student records" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name or ID"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All Provinces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Provinces</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {provinceLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {students.map((s) => (
          <Link key={s.id} href={`/admin/students/${s.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-3 py-4">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials(s.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm leading-tight">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.code}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!loading && students.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-full">No students found.</p>
        )}
      </div>
    </div>
  );
}
