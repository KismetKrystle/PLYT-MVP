'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type LogoVariant = 'light' | 'dark';
type LogoType = 'full' | 'icon' | 'responsive';

interface LogoProps {
    variant?: LogoVariant;
    type?: LogoType;
    className?: string;
    width?: number; // Base width for full logo styling
}

export default function Logo({
    variant = 'dark',
    type = 'full',
    className = '',
    width = 120,
}: LogoProps) {
    // We use this state to trigger re-renders if window size changes for JS-based logic,
    // though CSS-based responsive switching is preferred for performance (SSR compatible).
    // However, since we are using next/image and might want different sources, let's use CSS classes for switching.

    const isLight = variant === 'light';

    // Define image paths
    const fullSrc = isLight ? '/images/logo-light.png' : '/images/logo-dark.png';
    const iconSrc = isLight ? '/images/logo-icon-light.png' : '/images/logo-icon-dark.png';

    if (type === 'icon') {
        return (
            <div className={`relative ${className}`} style={{ width: width / 3, height: width / 3 }}>
                <Image
                    src={iconSrc}
                    alt="PLYT Logo Icon"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 33vw"
                />
            </div>
        );
    }

    if (type === 'full') {
        return (
            <div className={`relative ${className}`} style={{ width: width, height: width / 3 }}>
                <Image
                    src={fullSrc}
                    alt="PLYT Logo"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 33vw"
                />
            </div>
        );
    }

    // RESPONSIVE TYPE: Shows Icon on Mobile, Full on Desktop
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Mobile Icon - Hidden on md+ */}
            <div className="block md:hidden relative w-10 h-10">
                <Image
                    src={iconSrc}
                    alt="PLYT Logo"
                    fill
                    className="object-contain"
                />
            </div>

            {/* Desktop Full Logo - Hidden on small screens */}
            <div className="hidden md:block relative transition-all duration-300" style={{ width: width, height: width / 3 }}>
                <Image
                    src={fullSrc}
                    alt="PLYT Logo"
                    fill
                    className="object-contain"
                />
            </div>
        </div>
    );
}
