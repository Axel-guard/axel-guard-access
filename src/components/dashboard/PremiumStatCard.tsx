import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: "primary" | "success" | "warning" | "info" | "danger";
  subtitle?: string;
}

const variantStyles = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    trendPositive: "text-success bg-success/10",
    trendNegative: "text-destructive bg-destructive/10",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    trendPositive: "text-success bg-success/10",
    trendNegative: "text-destructive bg-destructive/10",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    trendPositive: "text-success bg-success/10",
    trendNegative: "text-destructive bg-destructive/10",
  },
  info: {
    iconBg: "bg-info/10",
    iconColor: "text-info",
    trendPositive: "text-success bg-success/10",
    trendNegative: "text-destructive bg-destructive/10",
  },
  danger: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    trendPositive: "text-success bg-success/10",
    trendNegative: "text-destructive bg-destructive/10",
  },
};

export const PremiumStatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = "primary",
  subtitle,
}: PremiumStatCardProps) => {
  const styles = variantStyles[variant];

  return (
    <div className="group relative overflow-hidden rounded-[14px] border border-border/50 bg-card p-3 sm:p-4 lg:p-5 shadow-card transition-all duration-300 hover:shadow-md hover:border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">{value}</p>
          
          {trend && (
            <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium",
                  trend.positive ? styles.trendPositive : styles.trendNegative
                )}
              >
                {trend.positive ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                )}
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">vs last month</span>
            </div>
          )}
          
          {subtitle && !trend && (
            <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div
          className={cn(
            "flex h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
};
