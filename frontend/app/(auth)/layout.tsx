import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Shortlinks',
  description: 'Sign in or create an account to start shortening URLs',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <h1 className="text-4xl font-bold mb-6">Shortlinks</h1>
          <p className="text-xl text-blue-100 mb-8">
            Create short, memorable links that drive engagement and track
            performance.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <div>
                <h3 className="font-semibold mb-1">Lightning Fast</h3>
                <p className="text-blue-100 text-sm">
                  Create and share short links in seconds
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <svg
                className="h-6 w-6 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <div>
                <h3 className="font-semibold mb-1">Detailed Analytics</h3>
                <p className="text-blue-100 text-sm">
                  Track clicks, locations, devices, and more
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <svg
                className="h-6 w-6 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div>
                <h3 className="font-semibold mb-1">Secure & Reliable</h3>
                <p className="text-blue-100 text-sm">
                  Enterprise-grade security and 99.9% uptime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Shortlinks
            </h1>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
