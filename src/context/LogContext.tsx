import React, { createContext, useContext, useState, useEffect } from "react";

export type LogEntry = { id: string; level: "info" | "warn" | "error" | "debug"; message: string; time: number };

const KEY = "connector_logs_v1";

const LogContext = createContext(null as any);

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(logs));
    } catch {}
  }, [logs]);

  function append(level: "info" | "warn" | "error" | "debug", args: any[]) {
    const message = args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");
    setLogs((prev) => {
      const next = [...prev, { id: Math.random().toString(36).slice(2), level, message, time: Date.now() }];
      // keep last 1000
      if (next.length > 1000) next.shift();
      return next;
    });
  }

  function clear() {
    setLogs([]);
  }

  return <LogContext.Provider value={{ logs, append, clear }}>{children}</LogContext.Provider>;
}

export function useLogs() {
  return useContext(LogContext);
}
