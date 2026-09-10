"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "JUDGE";
  avatarUrl?: string | null;
}

export interface SessionPerformance {
  id: string;
  name: string;
  order: number;
}

interface SessionContextValue {
  user: SessionUser | null;
  performances: SessionPerformance[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  performances: [],
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [performances, setPerformances] = useState<SessionPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ user: SessionUser | null; performances?: SessionPerformance[] }>(
        "/api/auth/me"
      );
      setUser(data.user);
      setPerformances(data.performances ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, performances, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
