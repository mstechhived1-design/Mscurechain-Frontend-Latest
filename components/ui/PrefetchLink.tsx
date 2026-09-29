'use client';

/**
 * HMS Performance Architecture v6 — Phase 3
 * Mobile OnTouchStart Prefetch Component
 *
 * Replaces standard next/link to initiate React Query prefetching exactly
 * when the user touches the link, mirroring the hover-intent behavior on desktop.
 * On touch devices, 'hover' doesn't exist, so standard prefetch delays until tap-release.
 * This triggers on the initial touchstart event to shave off 100-300ms of perceived latency.
 */

import React from 'react';
import Link, { LinkProps } from 'next/link';

interface PrefetchLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  /** The React Query prefetch function to execute on hover/touch (e.g., from usePrefetchDashboard) */
  onPrefetch?: () => void;
  children: React.ReactNode;
}

export const PrefetchLink = React.forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ onPrefetch, onMouseEnter, onTouchStart, children, ...props }, ref) => {
    
    // Desktop: Trigger on hover intent
    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (onPrefetch) onPrefetch();
      if (onMouseEnter) onMouseEnter(e);
    };

    // Mobile: Trigger immediately on touch start (before touchend/click)
    const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
      if (onPrefetch) onPrefetch();
      if (onTouchStart) onTouchStart(e);
    };

    return (
      <Link
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

PrefetchLink.displayName = 'PrefetchLink';
