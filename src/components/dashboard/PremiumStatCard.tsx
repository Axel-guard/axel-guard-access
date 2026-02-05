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
    <div className="group relative overflow-hidden rounded-[14px] border border-border/50 bg-card p-5 shadow-card transition-all duration-300 hover:shadow-md hover:border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          
          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  trend.positive ? styles.trendPositive : styles.trendNegative
                )}
              >
                {trend.positive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          )}
          
          {subtitle && !trend && (
            <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-6 w-6", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
};
