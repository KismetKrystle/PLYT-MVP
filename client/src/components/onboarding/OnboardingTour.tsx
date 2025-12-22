'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOUR_STEPS = [
    {
        target: 'body', // Fallback center
        title: 'Welcome to PLYT',
        content: 'Experience the app freely! Connect with local food systems, grow your own, and track your impact.',
        position: 'center'
    },
    {
        target: 'find_produce', // Should match an ID I will add or existing element
        title: 'Find Fresh Produce',
        content: 'Chat with our AI to find the best local produce near you.',
        position: 'bottom'
    },
    {
        target: 'pick_system',
        title: 'Start Growing',
        content: 'Design your own hydroponic system tailored to your space.',
        position: 'bottom'
    },
    {
        target: 'impact_tab',
        title: 'Track Impact',
        content: 'See how your choices save water and reduce food miles.',
        position: 'top'
    }
];

export default function OnboardingTour() {
    const [stepIndex, setStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTourV1');
        if (!hasSeenTour) {
            // Small delay to ensure render
            setTimeout(() => setIsVisible(true), 1500);
        }
    }, []);

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenTourV1', 'true');
    };

    if (!isVisible) return null;

    const currentStep = TOUR_STEPS[stepIndex];

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-[9000] pointer-events-auto"
                        onClick={handleComplete} // Click outside to skip
                    />

                    {/* Popover */}
                    <div className="fixed inset-0 z-[9001] pointer-events-none flex items-center justify-center">
                        <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white/90 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto relative"
                        >
                            {/* Floating decorative elements */}
                            <div className="absolute -top-10 -left-10 w-20 h-20 bg-green-400/30 rounded-full blur-xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-blue-400/30 rounded-full blur-xl animate-pulse delay-700"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{currentStep.title}</h3>
                                    <button
                                        onClick={handleComplete}
                                        className="text-gray-400 hover:text-gray-600 text-xs font-semibold uppercase tracking-wider"
                                    >
                                        Skip
                                    </button>
                                </div>

                                <p className="text-gray-600 mb-6 leading-relaxed">
                                    {currentStep.content}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1">
                                        {TOUR_STEPS.map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-green-500' : 'w-1.5 bg-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleNext}
                                        className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition shadow-lg active:scale-95"
                                    >
                                        {stepIndex === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
