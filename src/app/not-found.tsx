import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Brand />
      <div>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          That page doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
