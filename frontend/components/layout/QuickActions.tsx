'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Link as LinkIcon,
  Upload,
  BarChart,
  QrCode,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color?: string;
}

export function QuickActions() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      id: 'create-link',
      label: 'Create Short Link',
      icon: LinkIcon,
      action: () => {
        // TODO: Open create link modal
        console.log('Create short link');
        setIsOpen(false);
      },
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      id: 'import-links',
      label: 'Import Links',
      icon: Upload,
      action: () => {
        router.push('/dashboard/links/import');
        setIsOpen(false);
      },
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      icon: BarChart,
      action: () => {
        router.push('/dashboard/analytics');
        setIsOpen(false);
      },
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      id: 'generate-qr',
      label: 'Generate QR Code',
      icon: QrCode,
      action: () => {
        // TODO: Open QR code generator modal
        console.log('Generate QR code');
        setIsOpen(false);
      },
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <TooltipProvider>
      <div className="fixed bottom-8 right-8 z-50">
        <div className="relative">
          {/* Action Buttons */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-16 right-0 flex flex-col gap-3"
              >
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          delay: index * 0.05,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        y: 20,
                        scale: 0.8,
                        transition: {
                          delay: (actions.length - index - 1) * 0.05,
                        },
                      }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={action.action}
                            className={cn(
                              'h-12 w-12 rounded-full shadow-lg text-white',
                              action.color
                            )}
                            size="icon"
                          >
                            <Icon className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="font-medium">
                          {action.label}
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => setIsOpen(!isOpen)}
                  className={cn(
                    'h-14 w-14 rounded-full bg-primary shadow-xl hover:shadow-2xl transition-all',
                    isOpen && 'rotate-45'
                  )}
                  size="icon"
                >
                  {isOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Plus className="h-6 w-6" />
                  )}
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-medium">
              {isOpen ? 'Close' : 'Quick Actions'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Backdrop */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
