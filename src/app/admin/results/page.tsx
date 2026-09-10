import { PageHeader } from "@/components/layout/page-header";
import { ResultsDashboard } from "@/components/results/results-dashboard";

export default function AdminResultsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Results Dashboard" subtitle="View performance metrics" />
      <ResultsDashboard showPerformanceTab />
    </div>
  );
}
