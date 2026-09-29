'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import nProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure NProgress
nProgress.configure({ 
  showSpinner: false, 
  trickleSpeed: 200,
  minimum: 0.1,
  easing: 'ease',
  speed: 500
});

interface ProgressBarProps {
  color?: string; // CSS variable or hex or class
  height?: string; // e.g. "2px"
  isPending?: boolean;
}

function ProgressBarContent({ color, height = '2px', isPending = false }: ProgressBarProps) {
  const pathname = usePathname() as string;
  const searchParams = useSearchParams() as any;

  useEffect(() => {
    // Inject custom styles if a color or height is provided
    const styleId = 'nprogress-custom-style';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // Enhanced color mapping for portal-specific branding
    let barColor = '#4f46e5'; // Default Indigo
    if (color) {
      if (color.includes('emerald') || color.includes('teal')) barColor = '#059669'; // Emerald/Teal
      else if (color.includes('rose') || color.includes('red')) barColor = '#e11d48'; // Rose/Red
      else if (color.includes('amber') || color.includes('orange')) barColor = '#d97706'; // Amber/Orange
      else if (color.includes('blue')) barColor = '#2563eb'; // Blue
      else if (color.includes('indigo')) barColor = '#4f46e5'; // Indigo
      else if (color.startsWith('#')) barColor = color; // Direct Hex
    }
    
    // Extract height if passed in Tailwind-like format
    const barHeight = height.includes('[') 
      ? height.replace('h-[', '').replace(']', '') 
      : (height === 'h-1' ? '4px' : height);
    
    styleElement.innerHTML = `
      #nprogress .bar { 
        background: ${barColor} !important; 
        height: ${barHeight} !important;
        z-index: 1031;
      }
      #nprogress .peg { 
        box-shadow: 0 0 10px ${barColor}, 0 0 5px ${barColor} !important; 
      }
    `;

    // Finish loading when the route changes
    nProgress.done();

    const handleAnchorClick = (event: MouseEvent) => {
      const anchor = event.target as HTMLAnchorElement;
      const target = anchor.closest('a');
      
      if (target && target.href && target.target !== '_blank') {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);
        
        // Only start loading for internal links that actually change the path or search
        if (url.origin === currentUrl.origin && (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search)) {
          nProgress.start();
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    
    return () => {
      document.removeEventListener('click', handleAnchorClick);
      nProgress.done();
    };
  }, [pathname, searchParams, color, height]);

  // Support manual transitions (like startTransition)
  useEffect(() => {
    if (isPending) {
      nProgress.start();
    } else {
      nProgress.done();
    }
  }, [isPending]);

  return null;
}

export default function ProgressBar(props: ProgressBarProps) {
  return (
    <Suspense fallback={null}>
      <ProgressBarContent {...props} />
    </Suspense>
  );
}
