import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

import { AlertTriangleIcon, RefreshCwIcon, BugIcon } from "lucide-react";

export const ErrorFallback = ({ error, resetErrorBoundary }) => {
  if (import.meta.env.DEV) throw error;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>Runtime Error</AlertTitle>
          <AlertDescription>
            StarTerm encountered an unexpected error. The details below can help diagnose the issue.
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BugIcon size={16} className="text-destructive" />
            <h3 className="font-semibold text-sm text-muted-foreground">Error Details</h3>
          </div>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-40 font-mono">
            {error.message}
          </pre>
          {error.stack && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Stack trace
              </summary>
              <pre className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded mt-2 overflow-auto max-h-32 font-mono">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={resetErrorBoundary} 
            className="flex-1"
            variant="outline"
          >
            <RefreshCwIcon size={16} />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            className="flex-1"
            variant="default"
          >
            Reload App
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4 font-sans">
          If this error persists, try clearing browser data or contacting support.
        </p>
      </div>
    </div>
  );
}
