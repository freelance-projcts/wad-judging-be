import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  colorClassName = "text-primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-2">
        <div className={cn("flex size-10 items-center justify-center rounded-lg bg-muted", colorClassName)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold", colorClassName)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
