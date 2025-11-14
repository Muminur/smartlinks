'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove trailing slash and split
  const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Skip the first 'dashboard' segment as we show Home icon
    if (segment === 'dashboard' && index === 0) {
      return;
    }

    // Format the label (capitalize and replace hyphens)
    let label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Handle special cases
    const labelMap: Record<string, string> = {
      'My-Links': 'My Links',
      'Qr-Codes': 'QR Codes',
      'Api-Keys': 'API Keys',
    };

    const formattedSegment = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');

    label = labelMap[formattedSegment] || label;

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  });

  return breadcrumbs;
}

function truncateLabel(label: string, maxLength: number = 20): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength) + '...';
}

export function Breadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      {/* Home */}
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <Fragment key={item.href}>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            {isLast ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
              >
                {truncateLabel(item.label)}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {truncateLabel(item.label)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

// Mobile breadcrumb (simplified for small screens)
export function MobileBreadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);
  const current = breadcrumbs[breadcrumbs.length - 1];

  if (!current) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Dashboard</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-sm">
      {breadcrumbs.length > 1 && (
        <>
          <Link
            href={breadcrumbs[breadcrumbs.length - 2]?.href || '/dashboard'}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Link>
        </>
      )}
      <span className="font-medium text-foreground">{truncateLabel(current.label, 15)}</span>
    </div>
  );
}
