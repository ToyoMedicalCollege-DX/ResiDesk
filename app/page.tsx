"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { ready, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(session ? "/students" : "/login");
  }, [ready, session, router]);

  return (
    <div className="grid h-full place-items-center text-sm text-t3">読み込み中…</div>
  );
}
