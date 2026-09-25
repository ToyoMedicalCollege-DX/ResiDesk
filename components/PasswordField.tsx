"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  id?: string;
};

export default function PasswordField({ value, onChange, autoComplete, id }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-stroke py-2.5 pl-3 pr-11 text-sm outline-none ring-accent/30 focus:ring-2"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "パスワードを隠す" : "パスワードを表示"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-t3 hover:bg-bg hover:text-t1"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
