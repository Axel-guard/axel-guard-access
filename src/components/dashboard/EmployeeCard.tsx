import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface EmployeeCardProps {
  name: string;
  initials: string;
  revenue: string;
  sales: number;
  balance: string;
  color: "blue" | "emerald" | "amber";
}

const colorStyles = {
  blue: {
    gradient: "from-primary/20 to-accent/10",
    text: "text-primary",
    border: "border-primary/30",
    avatar: "bg-[image:var(--gradient-primary)]",
    glow: "group-hover:shadow-primary/20",
  },
  emerald: {
    gradient: "from-success/20 to-info/10",
    text: "text-success",
    border: "border-success/30",
    avatar: "bg-[image:var(--gradient-success)]",
    glow: "group-hover:shadow-success/20",
  },
  amber: {
    gradient: "from-warning/20 to-destructive/10",
    text: "text-warning",
    border: "border-warning/30",
    avatar: "bg-[image:var(--gradient-warning)]",
    glow: "group-hover:shadow-warning/20",
  },
};

export const EmployeeCard = ({
  name,
  initials,
  revenue,
  sales,
  balance,
  color,
}: EmployeeCardProps) => {
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card/80 p-5 backdrop-blur-xl transition-all duration-300 hover:shadow-lg",
        styles.border,
        styles.glow
      )}
    >
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        styles.gradient
      )} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-105",
              styles.avatar
            )}
          >
            <span className="text-lg font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="truncate text-lg font-semibold text-foreground">{name}</h4>
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-4 w-4", styles.text)} />
              <p className={cn("text-xl font-bold", styles.text)}>{revenue}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Sales</span>
            <span className="text-lg font-semibold text-foreground">{sales}</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <span className="text-muted-foreground">Balance</span>
            <span className="text-lg font-semibold text-foreground">{balance}</span>
          </div>
        </div>
      </div>
    </div>
  );
};