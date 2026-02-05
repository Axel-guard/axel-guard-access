import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateFilterDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const DateFilterDropdown = ({ value, onValueChange }: DateFilterDropdownProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[160px] rounded-xl border-border bg-card shadow-sm">
        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        <SelectItem value="today">Today</SelectItem>
        <SelectItem value="this-week">This Week</SelectItem>
        <SelectItem value="this-month">This Month</SelectItem>
        <SelectItem value="last-month">Last Month</SelectItem>
        <SelectItem value="this-quarter">This Quarter</SelectItem>
        <SelectItem value="this-year">This Year</SelectItem>
      </SelectContent>
    </Select>
  );
};
