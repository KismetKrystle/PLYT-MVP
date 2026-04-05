'use client';

export const JOURNAL_CATEGORIES = ['videos', 'food', 'supplements', 'herbs', 'recipes'] as const;

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

export type JournalEntry = {
    id: number;
    entryDate: string;
    content: string;
    imageUrl?: string;
    tags?: string[];
    category?: JournalCategory;
    createdAt: string;
};

export function getJournalStorageKey(userId: string | number | undefined) {
    return `plyt-journal:${userId ?? 'guest'}`;
}

export function getTodayIsoDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatJournalDate(value: string) {
    if (!value) return 'Undated';
    try {
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(new Date(`${value}T00:00:00`));
    } catch {
        return value;
    }
}

export function loadJournalEntries(userId: string | number | undefined): JournalEntry[] {
    if (typeof window === 'undefined') return [];

    try {
        const raw = localStorage.getItem(getJournalStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveJournalEntries(userId: string | number | undefined, entries: JournalEntry[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getJournalStorageKey(userId), JSON.stringify(entries));
}
