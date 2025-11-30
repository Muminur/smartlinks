'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center px-4 max-w-md">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          You&apos;re Offline
        </h1>
        <p className="text-muted-foreground mb-8">
          It looks like you&apos;ve lost your internet connection. Please check your
          network settings and try again.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors w-full"
          >
            Try Again
          </button>
          <p className="text-sm text-muted-foreground">
            Some features may be available offline once you&apos;ve used them before.
          </p>
        </div>
      </div>
    </div>
  );
}
