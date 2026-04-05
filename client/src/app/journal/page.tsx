'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import {
    formatJournalDate,
    getTodayIsoDate,
    JOURNAL_CATEGORIES,
    JournalCategory,
    JournalEntry,
    loadJournalEntries,
    saveJournalEntries
} from '../../lib/journal';

export default function JournalPage() {
    const { user, loading, openLoginModal } = useAuth();
    const [entryDate, setEntryDate] = useState(getTodayIsoDate());
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [category, setCategory] = useState<JournalCategory>('food');
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

    useEffect(() => {
        if (!user) {
            setEntries([]);
            return;
        }
        setEntries(loadJournalEntries(user.id));
    }, [user]);

    useEffect(() => {
        if (!user) return;
        saveJournalEntries(user.id, entries);
    }, [entries, user]);

    const handleAddEntry = () => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const normalizedImageUrl = imageUrl.trim();
        const tags = tagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        if (editingEntryId) {
            setEntries((current) =>
                current.map((entry) =>
                    entry.id === editingEntryId
                        ? {
                            ...entry,
                            entryDate,
                            content: trimmed,
                            imageUrl: normalizedImageUrl || undefined,
                            tags,
                            category
                        }
                        : entry
                )
            );
        } else {
            setEntries((current) => [
                {
                    id: Date.now(),
                    entryDate,
                    content: trimmed,
                    imageUrl: normalizedImageUrl || undefined,
                    tags,
                    category,
                    createdAt: new Date().toISOString()
                },
                ...current
            ]);
        }

        setContent('');
        setImageUrl('');
        setTagsInput('');
        setCategory('food');
        setEntryDate(getTodayIsoDate());
        setEditingEntryId(null);
    };

    const handleDeleteEntry = (id: number) => {
        setEntries((current) => current.filter((entry) => entry.id !== id));
        if (editingEntryId === id) {
            setEditingEntryId(null);
            setContent('');
            setImageUrl('');
            setTagsInput('');
            setCategory('food');
            setEntryDate(getTodayIsoDate());
        }
    };

    const handleEditEntry = (entry: JournalEntry) => {
        setEditingEntryId(entry.id);
        setEntryDate(entry.entryDate);
        setContent(entry.content);
        setImageUrl(entry.imageUrl || '');
        setTagsInput((entry.tags || []).join(', '));
        setCategory(entry.category || 'food');
    };

    const resetEditor = () => {
        setEditingEntryId(null);
        setEntryDate(getTodayIsoDate());
        setContent('');
        setImageUrl('');
        setTagsInput('');
        setCategory('food');
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50" />;
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-12">
                <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-bold text-gray-900">Journal</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                        Sign in to keep a daily timeline of notes, reflections, and progress updates.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={openLoginModal}
                            className="rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                            Sign in
                        </button>
                        <Link
                            href="/?tab=customer_profile"
                            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Back to About You
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-600">Journal</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Your progress timeline</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                            Capture quick daily notes about meals, habits, energy, wins, or anything else you want to track over time.
                        </p>
                    </div>
                    <Link
                        href="/?tab=customer_profile"
                        className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        Back to About You
                    </Link>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.4fr]">
                    <section className="rounded-3xl border border-green-100 bg-green-50/60 p-5">
                        <h2 className="text-lg font-semibold text-gray-900">Add a note</h2>
                        <p className="mt-1 text-sm text-gray-600">A quick entry is enough. This is for your own daily timeline.</p>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Date</label>
                                <input
                                    type="date"
                                    value={entryDate}
                                    onChange={(event) => setEntryDate(event.target.value)}
                                    className="w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Category</label>
                                <select
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value as JournalCategory)}
                                    className="w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400"
                                >
                                    {JOURNAL_CATEGORIES.map((option) => (
                                        <option key={option} value={option}>
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Daily note</label>
                                <textarea
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    rows={7}
                                    placeholder="What changed today? How did you feel, what did you eat, what worked, what felt hard?"
                                    className="w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400 resize-none"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Optional image URL</label>
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={(event) => setImageUrl(event.target.value)}
                                    placeholder="Paste an image URL if you want a photo on this entry"
                                    className="w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Tags</label>
                                <input
                                    type="text"
                                    value={tagsInput}
                                    onChange={(event) => setTagsInput(event.target.value)}
                                    placeholder="hydration, meal prep, energy, cravings"
                                    className="w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-green-400"
                                />
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleAddEntry}
                                    className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                                >
                                    {editingEntryId ? 'Update entry' : 'Add to timeline'}
                                </button>
                                {editingEntryId ? (
                                    <button
                                        type="button"
                                        onClick={resetEditor}
                                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Cancel edit
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-600">
                                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                            </span>
                        </div>

                        {entries.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                                <p className="text-lg font-semibold text-gray-900">No journal entries yet</p>
                                <p className="mt-2 text-sm text-gray-600">
                                    Start with a short note today so you can look back on patterns and progress later.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {entries.map((entry) => (
                                    <article key={entry.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-600">
                                                    {formatJournalDate(entry.entryDate)}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-400">
                                                    Added {new Date(entry.createdAt).toLocaleString()}
                                                </p>
                                                {entry.category ? (
                                                    <span className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700">
                                                        {entry.category}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditEntry(entry)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                                                    aria-label="Edit journal entry"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-500 transition hover:bg-red-50"
                                                    aria-label="Delete journal entry"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {entry.imageUrl ? (
                                            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                                                <div className="relative aspect-video w-full">
                                                    <Image src={entry.imageUrl} alt="Journal entry" fill className="object-cover" unoptimized />
                                                </div>
                                            </div>
                                        ) : null}
                                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{entry.content}</p>
                                        {entry.tags && entry.tags.length > 0 ? (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {entry.tags.map((tag) => (
                                                    <span key={`${entry.id}-${tag}`} className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
