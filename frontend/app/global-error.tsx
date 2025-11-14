'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center px-4 max-w-md">
            <h1 className="text-4xl font-bold text-destructive mb-4">
              Critical Error
            </h1>
            <p className="text-muted-foreground mb-6">
              A critical error occurred. Please refresh the page.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mb-6">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
