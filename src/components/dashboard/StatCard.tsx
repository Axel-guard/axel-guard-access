import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  primary: "bg-[image:var(--gradient-primary)]",
  success: "bg-[image:var(--gradient-success)]",
  warning: "bg-[image:var(--gradient-warning)]",
  info: "bg-[image:var(--gradient-info)]",
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = "primary",
}: StatCardProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 text-primary-foreground shadow-card transition-transform hover:scale-[1.02]",
        variantStyles[variant]
      )}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/5" />
      
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium opacity-90">{title}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        
        <p className="text-2xl font-bold tracking-tight lg:text-3xl">{value}</p>
        
        {trend && (
          <p className={cn("mt-2 text-sm", trend.positive ? "text-white/90" : "text-white/70")}>
            <span className={trend.positive ? "text-green-200" : "text-red-200"}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
            {" "}vs last month
          </p>
        )}
      </div>
    </div>
  );
};
