'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { QuickActions } from '@/components/layout/QuickActions';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Protect dashboard routes
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-col transition-all duration-300',
          sidebarCollapsed ? 'md:pl-[80px]' : 'md:pl-[280px]'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="container mx-auto p-4 sm:p-6 lg:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} ShortLinks. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <a
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms
                </a>
                <a
                  href="/help"
                  className="hover:text-foreground transition-colors"
                >
                  Help
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Search Command Palette */}
      <GlobalSearch />

      {/* Quick Actions FAB */}
      <QuickActions />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => useUIStore.getState().toggleSidebar()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
