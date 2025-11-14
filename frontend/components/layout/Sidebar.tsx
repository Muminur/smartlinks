'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Link as LinkIcon,
  BarChart,
  Globe,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Links', href: '/dashboard/links', icon: LinkIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
  { name: 'Domains', href: '/dashboard/domains', icon: Globe },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: sidebarCollapsed ? '80px' : '280px',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-border bg-background"
    >
      <div className="flex h-full flex-col">
        {/* Logo & Toggle */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  SL
                </div>
                <span className="text-lg font-semibold">ShortLinks</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn('h-8 w-8', sidebarCollapsed && 'mx-auto')}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && !sidebarCollapsed && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-border p-4">
          <div
            className={cn(
              'flex items-center gap-3',
              sidebarCollapsed ? 'flex-col' : 'flex-row'
            )}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>

            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                >
                  <p className="truncate text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator className="my-3" />

          <div className={cn('space-y-1', sidebarCollapsed && 'flex flex-col items-center')}>
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full justify-start', sidebarCollapsed && 'w-auto px-2')}
              onClick={() => router.push('/dashboard/profile')}
            >
              <User className="h-4 w-4" />
              {!sidebarCollapsed && <span className="ml-2">Profile</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950',
                sidebarCollapsed && 'w-auto px-2'
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
