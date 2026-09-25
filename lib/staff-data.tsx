"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Student } from "@/lib/types";
import { useAuth } from "@/lib/auth";

type StaffDataValue = {
  students: Student[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getStudent: (id: string) => Student | undefined;
  loadDetail: (id: string) => Promise<Student | undefined>;
};

const StaffDataContext = createContext<StaffDataValue | null>(null);

export function StaffDataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/students", { cache: "no-store" });
      const json = (await res.json()) as { students?: Student[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "一覧の取得に失敗しました");
      setStudents(json.students ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getStudent = useCallback(
    (id: string) => students.find((s) => s.id === id),
    [students]
  );

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/students/${id}`, { cache: "no-store" });
    const json = (await res.json()) as { student?: Student; error?: string };
    if (!res.ok || !json.student) return undefined;
    setStudents((prev) => {
      if (prev.some((s) => s.id === id)) {
        return prev.map((s) => (s.id === id ? json.student! : s));
      }
      return [...prev, json.student!];
    });
    return json.student;
  }, []);

  const value = useMemo<StaffDataValue>(
    () => ({
      students,
      loading,
      error,
      refresh,
      getStudent,
      loadDetail,
    }),
    [students, loading, error, refresh, getStudent, loadDetail]
  );

  return <StaffDataContext.Provider value={value}>{children}</StaffDataContext.Provider>;
}

export function useStaffData(): StaffDataValue {
  const ctx = useContext(StaffDataContext);
  if (!ctx) throw new Error("useStaffData must be used within StaffDataProvider");
  return ctx;
}
