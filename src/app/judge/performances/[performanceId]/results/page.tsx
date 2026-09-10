"use client";

import { useParams } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { PageHeader } from "@/components/layout/page-header";
import { PerformanceResults } from "@/components/results/performance-results";

export default function JudgePerformanceResultsPage() {
  const { performanceId } = useParams<{ performanceId: string }>();
  const { performances } = useSession();
  const performance = performances.find((p) => p.id === performanceId);

  return (
    <div className="space-y-6">
      <PageHeader title="Results Dashboard" subtitle={`View performance metrics for ${performance?.name ?? ""}`} />
      <PerformanceResults performanceId={performanceId} />
    </div>
  );
}
