'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';

type NaviAvatarProps = {
    className?: string;
    iconClassName?: string;
    dotClassName?: string;
};

export default function NaviAvatar({
    className = 'relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-50 to-white shadow-[0_8px_24px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100',
    iconClassName = 'h-10 w-10 drop-shadow-sm',
    dotClassName = 'absolute -right-1 -top-1 h-3 w-3 rounded-full bg-orange-300 ring-2 ring-white',
}: NaviAvatarProps) {
    const avatarId = useId().replace(/:/g, '');
    const bodyGradientId = `plyt-mascot-body-${avatarId}`;
    const wingGradientId = `plyt-mascot-wing-${avatarId}`;

    return (
        <motion.div
            aria-hidden="true"
            animate={{ y: [0, -4, 0], rotate: [0, 2, 0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className={className}
        >
            <svg viewBox="0 0 64 64" className={iconClassName}>
                <defs>
                    <linearGradient id={bodyGradientId} x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id={wingGradientId} x1="0%" x2="100%" y1="50%" y2="50%">
                        <stop offset="0%" stopColor="#99f6e4" />
                        <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                </defs>
                <motion.g
                    animate={{ rotate: [0, -8, 0, 8, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ originX: '50%', originY: '45%' }}
                >
                    <ellipse cx="18" cy="28" rx="13" ry="6" fill={`url(#${wingGradientId})`} transform="rotate(-22 18 28)" />
                    <ellipse cx="46" cy="28" rx="13" ry="6" fill={`url(#${wingGradientId})`} transform="rotate(22 46 28)" />
                </motion.g>
                <ellipse cx="32" cy="33" rx="12" ry="15" fill={`url(#${bodyGradientId})`} />
                <circle cx="36" cy="20" r="9" fill={`url(#${bodyGradientId})`} />
                <circle cx="39" cy="19" r="3" fill="#fff7ed" />
                <circle cx="40" cy="19" r="1.5" fill="#7c2d12" />
                <path d="M44 20l11-2-10 6z" fill="#0f766e" />
                <path d="M28 28c4 4 8 4 12 0" stroke="#d1fae5" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M26 48c2-1 4-1 6 0M34 48c2-1 4-1 6 0" stroke="#065f46" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <motion.span
                className={dotClassName}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
        </motion.div>
    );
}
