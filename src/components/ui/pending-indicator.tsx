import { Clock, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingIndicatorProps {
  size?: "sm" | "md";
  className?: string;
}

export function PendingIndicator({ size = "sm", className }: PendingIndicatorProps) {
  return (
    <div className={cn(
      "flex items-center gap-1 text-orange-500 bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded-sm",
      size === "sm" ? "text-xs" : "text-sm",
      className
    )}>
      <Upload className={cn(
        "animate-pulse",
        size === "sm" ? "h-3 w-3" : "h-4 w-4"
      )} />
      <span>Pending</span>
    </div>
  );
}