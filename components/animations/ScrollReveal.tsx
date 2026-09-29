'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    distance?: string;
    duration?: number;
    delay?: number;
}

function ScrollReveal({
    children,
    className = '',
    distance = '30px',
    duration = 800,
    delay = 0,
}: ScrollRevealProps) {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Once it's visible, we don't need to observe it anymore
                    if (domRef.current) {
                        observer.unobserve(domRef.current);
                    }
                }
            });
        }, {
            threshold: 0.1, // Trigger when 10% of the element is visible
        });

        const currentRef = domRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all ${className}`}
            style={{
                transitionDuration: `${duration}ms`,
                transitionDelay: `${delay}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'none' : `translateY(${distance})`,
                willChange: 'transform, opacity',
            }}
        >
            {children}
        </div>
    );
}

export default React.memo(ScrollReveal);
