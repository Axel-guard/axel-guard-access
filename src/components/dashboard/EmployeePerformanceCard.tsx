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
      "group rounded-[14px] border bg-card p-3 sm:p-4 lg:p-5 shadow-card transition-all duration-300 hover:shadow-md",
      isTopPerformer ? "border-success/50 ring-2 ring-success/20" : "border-border/50 hover:border-border"
    )}>
      <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
        {/* Avatar with rank */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full text-white shadow-md transition-transform group-hover:scale-105",
              styles.avatar
            )}
          >
            <span className="text-sm sm:text-base lg:text-lg font-bold">{initials}</span>
          </div>
          {isTopPerformer && (
            <div className="absolute -top-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-success text-white shadow-lg">
              <Flame className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h4 className="truncate text-sm sm:text-base font-semibold text-foreground">{name}</h4>
            {isTopPerformer && (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-success/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium text-success">
                <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Top
              </span>
            )}
          </div>
          <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className={cn("h-3 w-3 sm:h-4 sm:w-4", styles.text)} />
            <span className={cn("text-base sm:text-lg lg:text-xl font-bold", styles.text)}>{revenue}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 sm:mt-4">
        <div className="mb-1.5 sm:mb-2 flex items-center justify-between text-[10px] sm:text-xs">
          <span className="text-muted-foreground">Target Progress</span>
          <span className={cn("font-semibold", progressTextColor)}>
            {progressPercent.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-700 ease-out", progressColor)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-muted-foreground">
          Target: ₹{(target / 100000).toFixed(1)}L
        </p>
      </div>

      {/* Stats */}
      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-4">
        <div className="rounded-lg bg-muted/50 p-2 sm:p-2.5 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Sales</p>
          <p className="text-base sm:text-lg font-bold text-foreground">{sales}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 sm:p-2.5 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
          <p className="text-base sm:text-lg font-bold text-foreground">{balance}</p>
        </div>
      </div>
    </div>
  );
};
