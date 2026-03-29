import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  onSet: (date: string, time: string) => void;
  onCancel: () => void;
  initialDate?: string;
  initialTime?: string;
  disablePast?: boolean;
}

export const DateTimePicker = ({
  onSet,
  onCancel,
  initialDate,
  initialTime,
  disablePast = false,
}: DateTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate + "T00:00:00") : undefined
  );
  const initParts = initialTime?.split(":") ?? [];
  const [hour, setHour]     = useState(initParts[0] ? parseInt(initParts[0]) : 10);
  const [minute, setMinute] = useState(initParts[1] ? parseInt(initParts[1]) : 0);

  const incHour = () => setHour((h) => (h + 1) % 24);
  const decHour = () => setHour((h) => (h - 1 + 24) % 24);
  const incMin  = () => setMinute((m) => (m + 5) % 60);
  const decMin  = () => setMinute((m) => (m - 5 + 60) % 60);

  const handleSet = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onSet(dateStr, timeStr);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const SpinnerBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col select-none">
      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={disablePast ? { before: today } : undefined}
        initialFocus
      />

      {/* Divider */}
      <div className="border-t border-border mx-3" />

      {/* Time spinner */}
      <div className="flex items-center justify-center gap-4 py-4">
        {/* Hour */}
        <div className="flex flex-col items-center gap-1">
          <SpinnerBtn onClick={incHour}><ChevronUp className="h-5 w-5" /></SpinnerBtn>
          <div className="flex h-12 w-14 items-center justify-center rounded-lg border-2 border-border bg-background text-2xl font-semibold tabular-nums">
            {String(hour).padStart(2, "0")}
          </div>
          <SpinnerBtn onClick={decHour}><ChevronDown className="h-5 w-5" /></SpinnerBtn>
        </div>

        <span className="text-2xl font-bold text-muted-foreground pb-1">:</span>

        {/* Minute */}
        <div className="flex flex-col items-center gap-1">
          <SpinnerBtn onClick={incMin}><ChevronUp className="h-5 w-5" /></SpinnerBtn>
          <div className="flex h-12 w-14 items-center justify-center rounded-lg border-2 border-border bg-background text-2xl font-semibold tabular-nums">
            {String(minute).padStart(2, "0")}
          </div>
          <SpinnerBtn onClick={decMin}><ChevronDown className="h-5 w-5" /></SpinnerBtn>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between border-t border-border px-6 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSet}
          disabled={!selectedDate}
          className={cn(
            "text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors",
            selectedDate
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground opacity-40 cursor-not-allowed"
          )}
        >
          Set
        </button>
      </div>
    </div>
  );
};
