'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Lesson {
    id: string;
    title: string;
    content: string; // The notes content
    date: string;
}

interface LessonContextType {
    savedLessons: Lesson[];
    addLesson: (title: string, content: string) => void;
    activeLesson: Lesson | null;
    setActiveLesson: (lesson: Lesson | null) => void;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export function LessonProvider({ children }: { children: ReactNode }) {
    // Initialize with dummy data
    const [savedLessons, setSavedLessons] = useState<Lesson[]>([
        { id: '1', title: 'Nutrient Balancing', content: 'Detailed notes on N-P-K ratios...', date: new Date().toLocaleDateString() },
        { id: '2', title: 'Hydro Basics', content: 'Key insights about water pH and EC levels...', date: new Date().toLocaleDateString() },
        { id: '3', title: 'Pest Control', content: 'Organic methods for keeping pests away...', date: new Date().toLocaleDateString() },
        { id: '4', title: 'Harvest Timing', content: 'Signs to look for when ready to harvest...', date: new Date().toLocaleDateString() },
    ]);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

    const addLesson = (title: string, content: string) => {
        const newLesson: Lesson = {
            id: Date.now().toString(),
            title,
            content,
            date: new Date().toLocaleDateString()
        };
        setSavedLessons(prev => [newLesson, ...prev]);
    };

    return (
        <LessonContext.Provider value={{ savedLessons, addLesson, activeLesson, setActiveLesson }}>
            {children}
        </LessonContext.Provider>
    );
}

export function useLessons() {
    const context = useContext(LessonContext);
    if (context === undefined) {
        throw new Error('useLessons must be used within a LessonProvider');
    }
    return context;
}
