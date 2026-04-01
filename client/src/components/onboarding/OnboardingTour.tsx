'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TOUR_STORAGE_KEY = 'hasSeenTourV2';

const TOUR_STEPS = [
    {
        eyebrow: 'Welcome',
        title: 'PLYT helps you find what fits you',
        content: 'Ask naturally about meals, ingredients, nearby places, or what to eat when your body needs something specific.',
        accent: 'from-emerald-500 to-teal-500'
    },
    {
        eyebrow: 'How Search Works',
        title: 'Search starts with your health context',
        content: 'PLYT uses the profile information you share to quietly filter ideas before suggesting food, recipes, or ready-to-eat places.',
        accent: 'from-teal-500 to-cyan-500'
    },
    {
        eyebrow: 'Local Discovery',
        title: 'Nearby place suggestions appear automatically',
        content: 'When your question needs local results, PLYT searches near your current or saved location and shows matching places in the suggestions panel.',
        accent: 'from-green-500 to-emerald-500'
    },
    {
        eyebrow: 'Save What Works',
        title: 'Keep places and log your experiences',
        content: 'Save a place you want to remember, then add visit notes about what you ate, how you felt, and whether you would go back.',
        accent: 'from-lime-500 to-emerald-500'
    }
];

export default function OnboardingTour() {
    const [stepIndex, setStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
        if (hasSeenTour) {
            return;
        }

        const timeoutId = window.setTimeout(() => setIsVisible(true), 1200);
        return () => window.clearTimeout(timeoutId);
    }, []);

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    };

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex((current) => current + 1);
            return;
        }

        handleComplete();
    };

    if (!isVisible) {
        return null;
    }

    const currentStep = TOUR_STEPS[stepIndex];

    return (
        <AnimatePresence>
            {isVisible ? (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.42 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9000] bg-[#112014]"
                        onClick={handleComplete}
                    />

                    <div className="fixed inset-0 z-[9001] flex items-center justify-center px-4 pointer-events-none">
                        <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, y: 18, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -12, scale: 0.96 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                            className="pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-[32px] border border-white/50 bg-white shadow-[0_35px_100px_rgba(17,32,20,0.26)]"
                        >
                            <div className={`h-2 w-full bg-gradient-to-r ${currentStep.accent}`} />
                            <div className="relative p-6 md:p-7">
                                <div className="absolute -top-16 right-0 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />
                                <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-lime-100/50 blur-3xl" />

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                                                {currentStep.eyebrow}
                                            </p>
                                            <h3 className="mt-3 text-2xl font-bold leading-tight text-gray-900 md:text-[2rem]">
                                                {currentStep.title}
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleComplete}
                                            className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                        >
                                            Skip
                                        </button>
                                    </div>

                                    <p className="mt-5 max-w-xl text-sm leading-7 text-gray-600 md:text-[15px]">
                                        {currentStep.content}
                                    </p>

                                    <div className="mt-8 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            {TOUR_STEPS.map((step, index) => (
                                                <div
                                                    key={step.title}
                                                    className={`rounded-full transition-all duration-300 ${
                                                        index === stepIndex
                                                            ? `h-2.5 w-8 bg-gradient-to-r ${currentStep.accent}`
                                                            : 'h-2.5 w-2.5 bg-gray-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="rounded-full bg-gray-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
                                        >
                                            {stepIndex === TOUR_STEPS.length - 1 ? 'Start Exploring' : 'Next'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            ) : null}
        </AnimatePresence>
    );
}
