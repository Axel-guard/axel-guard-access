import { cn } from "@/lib/utils";
import axelguardLogo from "@/assets/axelguard-logo.png";

interface AxelGuardLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

export const AxelGuardLogo = ({
  size = "md",
  showText = true,
  className,
}: AxelGuardLogoProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={axelguardLogo}
        alt="AxelGuard"
        className={cn(
          sizeClasses[size],
          "object-contain"
        )}
      />
      {showText && (
        <span
          className={cn(
            "font-bold text-foreground",
            textSizeClasses[size]
          )}
        >
          AxelGuard
        </span>
      )}
    </div>
  );
};

// For use in PDFs and emails where we need the base64 or URL
export const AXELGUARD_LOGO_PATH = axelguardLogo;
