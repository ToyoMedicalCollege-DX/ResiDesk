"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutList,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/students", label: "学生一覧", icon: LayoutList },
  { href: "/departments", label: "学科別", icon: GraduationCap },
  { href: "/settings", label: "教員アカウント設定", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-stroke bg-white xl:w-[240px]">
      <div className="border-b border-stroke px-5 py-4">
        <p className="text-lg font-bold tracking-tight text-t1">ResiDesk</p>
        <p className="mt-0.5 text-xs text-t3">教員ダッシュボード</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-accent-lt text-accent"
                  : "text-t2 hover:bg-bg"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stroke p-4">
        <p className="text-sm font-semibold text-t1">{session?.name ?? "未ログイン"}</p>
        <p className="mt-0.5 text-xs text-t3">{session?.roleLabel}</p>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="mt-3 flex items-center gap-1.5 text-xs text-t3 hover:text-t1"
        >
          <LogOut size={14} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
