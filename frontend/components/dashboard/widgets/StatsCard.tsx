'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  loading?: boolean;
  delay?: number;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  loading = false,
  delay = 0,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn('rounded-lg p-2', iconBgColor)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              {change !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span
                    className={cn(
                      'font-medium',
                      isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {change}%
                  </span>
                  {changeLabel && ` ${changeLabel}`}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
