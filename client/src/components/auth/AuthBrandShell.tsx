'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import Logo from '../Logo';

type AuthBrandShellProps = {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    eyebrowLabel?: string;
    backgroundVariant?: 'pattern' | 'banner';
};

export default function AuthBrandShell({
    children,
    title = 'Welcome to Plyant',
    subtitle = 'Food guidance and sourcing that gets more personal the more you use it.',
    backHref = '/',
    backLabel = 'Back to home',
    eyebrowLabel = 'Personal Health-Food Companion',
    backgroundVariant = 'pattern'
}: AuthBrandShellProps) {
    const bannerRows = Array.from({ length: 8 }, (_, index) => index);

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f5f3ed] px-4 py-6 sm:min-h-screen sm:px-6 sm:py-10">
            {backgroundVariant === 'banner' ? (
                <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,243,237,0.58),rgba(245,243,237,0.82))]" />
                    <div className="absolute inset-0 flex flex-col justify-between py-4 sm:py-6">
                        {bannerRows.map((row) => (
                            <div
                                key={row}
                                className="relative overflow-hidden border-y border-[#234f2e]/8 bg-white/18 py-2 backdrop-blur-[1px]"
                            >
                                <div className={`auth-logo-marquee ${row % 2 === 0 ? 'auth-logo-marquee-left' : 'auth-logo-marquee-right'}`}>
                                    {Array.from({ length: 12 }, (_, itemIndex) => (
                                        <div
                                            key={`${row}-${itemIndex}`}
                                            className="flex items-center gap-4 px-4 opacity-25 sm:px-6"
                                        >
                                            <Logo variant="dark" width={140} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('/images/logo-icon-dark.png')",
                        backgroundPosition: 'center',
                        backgroundRepeat: 'repeat',
                        backgroundSize: '104px 104px',
                        opacity: 0.22
                    }}
                />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,243,237,0.2),_rgba(245,243,237,0.92)_48%,_rgba(245,243,237,0.98)_100%)]" />
            <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-[#cfe3c4]/55 blur-3xl" />
            <div className="absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-[#f4d8b4]/45 blur-3xl" />

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="mx-auto max-w-md text-center lg:mx-0 lg:text-left">
                    <Link className="inline-flex items-center justify-center lg:justify-start" href={backHref}>
                        <Logo className="drop-shadow-[0_12px_28px_rgba(35,79,46,0.14)]" variant="dark" width={180} />
                    </Link>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-[#4c6b57]">
                        {eyebrowLabel}
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#1f2b18] sm:text-5xl">
                        {title}
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-[#5e6858] sm:text-base">
                        {subtitle}
                    </p>
                    <Link className="mt-6 inline-flex text-sm font-semibold text-[#234f2e] hover:underline" href={backHref}>
                        {backLabel}
                    </Link>
                </div>

                <div className="mx-auto flex w-full max-w-md justify-center lg:mx-0">
                    {children}
                </div>
            </div>
            <style jsx>{`
                .auth-logo-marquee {
                    display: flex;
                    width: max-content;
                }

                .auth-logo-marquee-left {
                    animation: auth-marquee-left 30s linear infinite;
                }

                .auth-logo-marquee-right {
                    animation: auth-marquee-right 30s linear infinite;
                }

                @keyframes auth-marquee-left {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }

                @keyframes auth-marquee-right {
                    from {
                        transform: translateX(-50%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}
