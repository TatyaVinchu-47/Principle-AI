"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface IngestResponse {
  status: "created" | "duplicate" | "rejected";
  reason?: string;
  jobId?: string;
  hiddenJobScore: number;
  scamScore: number;
  classification: { role?: string | null; company?: string | null };
}

export function SubmitPostDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);

  async function submit() {
    setError(null);
    setResult(null);
    if (!url && !text.trim()) {
      setError("Add a hiring-post URL or paste the text.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url || undefined, text: text || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setResult(data as IngestResponse);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setUrl("");
    setText("");
    setResult(null);
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Submit a post
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a hiring post</DialogTitle>
          <DialogDescription>
            Found a hiring post somewhere public? Drop the link or paste the text.
            We classify it and route it for verification.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="post-url">Post URL (optional)</Label>
              <Input
                id="post-url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-text">Post text</Label>
              <Textarea
                id="post-text"
                rows={6}
                placeholder="Paste the hiring post text here (recommended if the link needs login)…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Classifying…
                </>
              ) : (
                "Classify & submit"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  result.status === "created"
                    ? "success"
                    : result.status === "duplicate"
                      ? "warning"
                      : "danger"
                }
              >
                {result.status}
              </Badge>
              {result.hiddenJobScore >= 50 && (
                <Badge variant="referral">Hidden signal {result.hiddenJobScore}</Badge>
              )}
              {result.scamScore >= 35 && (
                <Badge variant="danger">Scam risk {result.scamScore}</Badge>
              )}
            </div>
            <p className="text-sm">
              <span className="font-medium">
                {result.classification.role ?? "Role?"}
              </span>{" "}
              @ {result.classification.company ?? "Company?"}
            </p>
            {result.reason && (
              <p className="text-sm text-muted-foreground">{result.reason}</p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              User-submitted posts are verified by an admin before appearing publicly.
            </p>
            <Button variant="outline" onClick={reset} className="w-full">
              Submit another
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
