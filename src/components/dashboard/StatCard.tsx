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
        "group relative overflow-hidden rounded-2xl p-5 text-white shadow-glass transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        variantStyles[variant]
      )}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      
      {/* Decorative elements */}
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl transition-all duration-500 group-hover:scale-150" />
      <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/5 blur-lg" />
      <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-white/10 blur-md" />
      
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">{title}</span>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        
        {trend && (
          <p className="mt-3 text-sm text-white/80">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
              trend.positive ? "bg-white/20 text-white" : "bg-black/10 text-white/90"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
            <span className="ml-2">vs last month</span>
          </p>
        )}
      </div>
    </div>
  );
};