import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** Original wordmark for "Principle AI" — not derived from any other brand. */
export function Brand({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="h-4 w-4" />
      </span>
      {showText && (
        <span className="text-lg font-semibold tracking-tight">
          Principle <span className="text-primary">AI</span>
        </span>
      )}
    </div>
  );
}
