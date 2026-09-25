"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default function DeskShell({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="grid h-full min-h-screen place-items-center bg-bg text-sm text-t3">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-[768px] overflow-hidden bg-bg">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
