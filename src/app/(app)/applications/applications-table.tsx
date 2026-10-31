"use client";

import { useTransition } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { updateApplicationStatus } from "@/app/(app)/actions";

export interface AppRow {
  jobId: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  matchScore: number | null;
  updatedAt: string;
}

const STATUS_VARIANT: Record<string, "muted" | "match" | "success" | "warning" | "danger"> = {
  discovered: "muted",
  viewed: "muted",
  saved: "muted",
  applied: "match",
  referral_requested: "warning",
  referral_received: "success",
  assessment: "warning",
  interview: "warning",
  rejected: "danger",
  offer: "success",
  withdrawn: "muted",
};

function label(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function ApplicationsTable({ rows }: { rows: AppRow[] }) {
  const [pending, start] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Match</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.jobId} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link href={`/jobs/${r.jobId}`} className="font-medium hover:underline">
                  {r.role}
                </Link>
                <div className="text-xs text-muted-foreground">{r.company}</div>
              </td>
              <td className="px-4 py-3">
                {r.matchScore != null ? (
                  <Badge variant="match">{r.matchScore}%</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{timeAgo(r.updatedAt)}</td>
              <td className="px-4 py-3">
                <Select
                  value={r.status}
                  onValueChange={(v) =>
                    start(() => {
                      void updateApplicationStatus(r.jobId, v as ApplicationStatus);
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-[180px]" disabled={pending}>
                    <SelectValue>
                      <Badge variant={STATUS_VARIANT[r.status]}>{label(r.status)}</Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
