import { cn } from "@/lib/utils";

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
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-l-primary",
    avatar: "bg-primary",
  },
  emerald: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-l-success",
    avatar: "bg-success",
  },
  amber: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-l-warning",
    avatar: "bg-warning",
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
        "rounded-xl border-l-4 bg-card p-4 shadow-card transition-all hover:shadow-md",
        styles.border
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground",
            styles.avatar
          )}
        >
          <span className="text-sm font-semibold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="truncate font-semibold text-foreground">{name}</h4>
          <p className={cn("text-lg font-bold", styles.text)}>{revenue}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-medium text-foreground">{sales}</span> sales
        </span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
        <span>
          Balance: <span className="font-medium text-foreground">{balance}</span>
        </span>
      </div>
    </div>
  );
};
