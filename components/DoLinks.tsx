const LINKS = [
  {
    label: "DOモニター",
    href: "https://tmc-do-dashboard.vercel.app/",
  },
  {
    label: "DOデータ",
    href: "https://jikeigroup.app.box.com/folder/406024768653?s=ixndlv6gzxmyoek6qk2juit674q309ut",
  },
] as const;

export default function DoLinks() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-card hover:bg-[#D9784A]"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
