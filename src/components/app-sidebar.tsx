"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Handshake,
  Send,
  CalendarCheck,
  Bookmark,
  UserRound,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Recommended", icon: LayoutDashboard },
  { href: "/hidden", label: "Hidden jobs", icon: Sparkles },
  { href: "/referrals", label: "Referrals", icon: Handshake },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/interviews", label: "Interviews", icon: CalendarCheck },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

const SECONDARY = [
  { href: "/profile", label: "Profile & resume", icon: UserRound },
  { href: "/preferences", label: "Preferences", icon: SlidersHorizontal },
];

export function AppSidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const Item = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
  }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 p-4 md:flex">
      <div className="px-2 py-2">
        <Link href="/dashboard">
          <Brand />
        </Link>
      </div>
      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {NAV.map((n) => (
          <Item key={n.href} {...n} />
        ))}
        <div className="my-3 h-px bg-border" />
        {SECONDARY.map((n) => (
          <Item key={n.href} {...n} />
        ))}
        {isAdmin && <Item href="/admin" label="Admin" icon={ShieldCheck} />}
      </nav>
    </aside>
  );
}
