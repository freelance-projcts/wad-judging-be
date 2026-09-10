"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";

export default function JudgeIndexPage() {
  const { performances, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && performances.length > 0) {
      router.replace(`/judge/performances/${performances[0].id}`);
    }
  }, [loading, performances, router]);

  return null;
}
