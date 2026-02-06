import { cn } from "@/lib/utils";
import { TrendingUp, Flame } from "lucide-react";

interface EmployeePerformanceCardProps {
  name: string;
  initials: string;
  revenue: string;
  sales: number;
  balance: string;
  revenueNum: number;
  target?: number;
  color: "blue" | "emerald" | "amber";
  isTopPerformer?: boolean;
  rank?: number;
}

const MONTHLY_TARGET = 550000;

const colorStyles = {
  blue: {
    avatar: "bg-[image:var(--gradient-primary)]",
    text: "text-primary",
  },
  emerald: {
    avatar: "bg-[image:var(--gradient-success)]",
    text: "text-success",
  },
  amber: {
    avatar: "bg-[image:var(--gradient-warning)]",
    text: "text-warning",
  },
};

const getProgressColor = (percent: number) => {
  if (percent >= 100) return "bg-success";
  if (percent >= 71) return "bg-info";
  if (percent >= 41) return "bg-warning";
  return "bg-destructive";
};

const getProgressTextColor = (percent: number) => {
  if (percent >= 100) return "text-success";
  if (percent >= 71) return "text-info";
  if (percent >= 41) return "text-warning";
  return "text-destructive";
};

export const EmployeePerformanceCard = ({
  name,
  initials,
  revenue,
  sales,
  balance,
  revenueNum,
  target = MONTHLY_TARGET,
  color,
  isTopPerformer = false,
  rank = 0,
}: EmployeePerformanceCardProps) => {
  const styles = colorStyles[color];
  
  // Calculate progress with cap at 100%
  const progressPercent = Math.min((revenueNum / target) * 100, 100);
  const progressColor = getProgressColor(progressPercent);
  const progressTextColor = getProgressTextColor(progressPercent);

  return (
    <div className={cn(
      "group rounded-[14px] border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-md",
      isTopPerformer ? "border-success/50 ring-2 ring-success/20" : "border-border/50 hover:border-border"
    )}>
      <div className="flex items-start gap-4">
        {/* Avatar with rank */}
        <div className="relative">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform group-hover:scale-105",
              styles.avatar
            )}
          >
            <span className="text-lg font-bold">{initials}</span>
          </div>
          {isTopPerformer && (
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white shadow-lg">
              <Flame className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-base font-semibold text-foreground">{name}</h4>
            {isTopPerformer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <Flame className="h-3 w-3" />
                Top
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <TrendingUp className={cn("h-4 w-4", styles.text)} />
            <span className={cn("text-xl font-bold", styles.text)}>{revenue}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Target Progress</span>
          <span className={cn("font-semibold", progressTextColor)}>
            {progressPercent.toFixed(0)}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-700 ease-out", progressColor)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Target: ₹{(target / 100000).toFixed(1)}L
        </p>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Sales</p>
          <p className="text-lg font-bold text-foreground">{sales}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-lg font-bold text-foreground">{balance}</p>
        </div>
      </div>
    </div>
  );
};
