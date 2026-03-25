'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const starterChallenges = [
    {
        title: 'Hydration Daily',
        target: 'Drink 2 liters of water',
        cadence: 'Check in once a day',
    },
    {
        title: 'Anti-Inflammatory Meals',
        target: 'Eat 1 supportive meal each day',
        cadence: 'Log meals nightly',
    },
    {
        title: 'Movement Minutes',
        target: 'Walk or stretch for 20 minutes',
        cadence: 'Report your result daily',
    },
];

export default function HealthChallengesPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#f6f8f4] text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="Go back"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe4d3] bg-white text-slate-700 shadow-sm transition hover:bg-[#f3f8ef]"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-700">Health Streak</p>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Personal Health Challenges</h1>
                    </div>
                </div>

                <div className="mt-6 rounded-[2rem] border border-[#dbe4d3] bg-white p-6 shadow-[0_24px_80px_rgba(56,94,40,0.08)] md:p-8">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">Start Here</p>
                        <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-4xl">
                            Set your personal health challenges and track your progress daily.
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                            Build routines that match your goals, check in each day, and keep a simple record of what worked for your body.
                            This page is ready to become the home for self-set challenges, daily reporting, and streak tracking.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {starterChallenges.map((challenge) => (
                            <div
                                key={challenge.title}
                                className="rounded-[1.5rem] border border-[#e3ebdd] bg-[#f8fbf6] p-5"
                            >
                                <p className="text-sm font-bold text-slate-900">{challenge.title}</p>
                                <p className="mt-2 text-sm text-slate-600">{challenge.target}</p>
                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-green-700">
                                    {challenge.cadence}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[2rem] border border-[#dbe4d3] bg-white p-6 shadow-[0_16px_50px_rgba(56,94,40,0.06)]">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Daily Reporting</p>
                        <h3 className="mt-3 text-xl font-bold text-slate-900">Future Daily Check-In</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                            Users will be able to open today&apos;s check-in, report whether they completed their challenge, add a quick note,
                            and track progress over time.
                        </p>
                        <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#c9d8bf] bg-[#f6faf3] p-5 text-sm text-slate-500">
                            Today&apos;s report area will live here.
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-[#dbe4d3] bg-[#17351f] p-6 text-white shadow-[0_16px_50px_rgba(23,53,31,0.18)]">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-200">Build Next</p>
                        <h3 className="mt-3 text-xl font-bold">Suggested first actions</h3>
                        <div className="mt-5 space-y-3 text-sm text-white/80">
                            <p>Create a custom challenge.</p>
                            <p>Set how often to report results.</p>
                            <p>Track streaks and completion history.</p>
                        </div>
                        <Link
                            href="/?tab=customer_profile"
                            className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            Return to profile
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
