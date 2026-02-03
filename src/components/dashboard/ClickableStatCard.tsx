import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClickableStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "warning" | "info" | "danger";
  isActive?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  primary: "bg-[image:var(--gradient-primary)]",
  success: "bg-[image:var(--gradient-success)]",
  warning: "bg-[image:var(--gradient-warning)]",
  info: "bg-[image:var(--gradient-info)]",
  danger: "bg-gradient-to-br from-red-500 to-rose-600",
};

export const ClickableStatCard = ({
  title,
  value,
  icon: Icon,
  variant = "primary",
  isActive = false,
  onClick,
}: ClickableStatCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 text-white shadow-glass transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        variantStyles[variant],
        onClick && "cursor-pointer",
        isActive && "ring-4 ring-white/50 ring-offset-2 ring-offset-background scale-[1.02]"
      )}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      
      {/* Decorative elements */}
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl transition-all duration-500 group-hover:scale-150" />
      <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/5 blur-lg" />
      <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-white/10 blur-md" />
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-white animate-pulse" />
      )}
      
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">{title}</span>
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl backdrop-blur-sm transition-transform group-hover:scale-110",
            isActive ? "bg-white/30" : "bg-white/20"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
};
