import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSummaryCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant: "primary" | "success" | "info" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  primary: "bg-gradient-to-br from-violet-500 to-purple-600",
  success: "bg-gradient-to-br from-emerald-500 to-green-600",
  info: "bg-gradient-to-br from-blue-500 to-indigo-600",
  warning: "bg-gradient-to-br from-amber-500 to-orange-600",
  danger: "bg-gradient-to-br from-rose-500 to-red-600",
};

export const ReportSummaryCard = ({
  title,
  value,
  icon: Icon,
  variant,
  className,
}: ReportSummaryCardProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4 text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl",
        variantStyles[variant],
        className
      )}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white/90">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
        </div>
        <p className="mt-2 text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
    </div>
  );
};
