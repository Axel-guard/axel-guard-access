import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface LoadingTimeoutProps {
  /** Timeout in milliseconds before showing retry UI (default: 15000) */
  timeout?: number;
  /** Whether loading is currently active */
  isLoading: boolean;
  /** Optional retry handler */
  onRetry?: () => void;
  /** Fallback loading UI */
  children: React.ReactNode;
}

export const LoadingTimeout = ({
  timeout = 15000,
  isLoading,
  onRetry,
  children,
}: LoadingTimeoutProps) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  if (!isLoading) return null;

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">
            Server taking too long
          </h2>
          <p className="text-sm text-muted-foreground">
            The request is taking longer than expected. Please check your connection and try again.
          </p>
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
