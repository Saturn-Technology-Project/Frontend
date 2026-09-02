import { cn } from "@/lib/utils";

const tones = {
  operational: "bg-success",
  completed: "bg-success",
  active: "bg-success",
  connected: "bg-success",
  pass: "bg-success",
  running: "bg-info",
  executing: "bg-info",
  info: "bg-info",
  pending: "bg-warning",
  approval: "bg-warning",
  awaiting_approval: "bg-warning",
  awaiting_execution: "bg-info",
  warning: "bg-warning",
  degraded: "bg-warning",
  error: "bg-destructive",
  failed: "bg-destructive",
  rejected: "bg-destructive",
  denied: "bg-destructive",
  down: "bg-destructive",
  disconnected: "bg-destructive",
  idle: "bg-[#c4c4be]",
  paused: "bg-[#c4c4be]",
  muted: "bg-[#c4c4be]",
} as const;

export type StatusTone = keyof typeof tones;

export function StatusDot({
  tone,
  className,
}: {
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        tones[tone],
        className
      )}
    />
  );
}

export function StatusLabel({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] text-muted-foreground",
        className
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}
