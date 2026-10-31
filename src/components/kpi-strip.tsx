import {
  Compass,
  Target,
  Send,
  Handshake,
  HandHeart,
  CalendarCheck,
  Trophy,
  Bookmark,
} from "lucide-react";
import type { DashboardStats } from "@/lib/services/stats";

const ITEMS = [
  { key: "jobsDiscovered", label: "Jobs discovered", icon: Compass },
  { key: "jobsMatching", label: "Matching profile", icon: Target },
  { key: "applicationsSent", label: "Applications sent", icon: Send },
  { key: "referralRequests", label: "Referral requests", icon: Handshake },
  { key: "referralsReceived", label: "Referrals received", icon: HandHeart },
  { key: "interviews", label: "Interviews", icon: CalendarCheck },
  { key: "offers", label: "Offers", icon: Trophy },
  { key: "saved", label: "Saved", icon: Bookmark },
] as const;

export function KpiStrip({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <item.icon className="h-4 w-4" />
            <span className="text-xs">{item.label}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {stats[item.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
