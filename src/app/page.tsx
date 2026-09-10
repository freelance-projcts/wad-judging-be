import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-9 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome to WAD Judging</h1>
            <p className="text-muted-foreground mt-2">
              The ultimate tool for streamlined student evaluations and performance tracking.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/register">Create an Account</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
