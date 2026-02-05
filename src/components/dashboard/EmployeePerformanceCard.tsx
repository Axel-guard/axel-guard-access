import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface EmployeePerformanceCardProps {
  name: string;
  initials: string;
  revenue: string;
  sales: number;
  balance: string;
  target?: number;
  color: "blue" | "emerald" | "amber";
}

const colorStyles = {
  blue: {
    avatar: "bg-[image:var(--gradient-primary)]",
    progress: "bg-primary",
    text: "text-primary",
  },
  emerald: {
    avatar: "bg-[image:var(--gradient-success)]",
    progress: "bg-success",
    text: "text-success",
  },
  amber: {
    avatar: "bg-[image:var(--gradient-warning)]",
    progress: "bg-warning",
    text: "text-warning",
  },
};

export const EmployeePerformanceCard = ({
  name,
  initials,
  revenue,
  sales,
  balance,
  target = 100000,
  color,
}: EmployeePerformanceCardProps) => {
  const styles = colorStyles[color];
  
  // Parse revenue to number for progress calculation
  const revenueNum = parseFloat(revenue.replace(/[₹,L]/g, '')) * (revenue.includes('L') ? 100000 : 1);
  const progressPercent = Math.min((revenueNum / target) * 100, 100);

  return (
    <div className="group rounded-[14px] border border-border/50 bg-card p-5 shadow-card transition-all duration-300 hover:shadow-md hover:border-border">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform group-hover:scale-105",
            styles.avatar
          )}
        >
          <span className="text-lg font-bold">{initials}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-semibold text-foreground">{name}</h4>
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
          <span className="font-medium text-foreground">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all duration-500", styles.progress)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
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
