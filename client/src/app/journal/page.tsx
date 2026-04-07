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
    const [isComposerOpen, setIsComposerOpen] = useState(false);

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
        setIsComposerOpen(false);
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
        setIsComposerOpen(true);
    };

    const resetEditor = () => {
        setEditingEntryId(null);
        setEntryDate(getTodayIsoDate());
        setContent('');
        setImageUrl('');
        setTagsInput('');
        setCategory('food');
        setIsComposerOpen(false);
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
                            href="/?tab=living_library"
                            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Back to Living Library
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-6 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-10 md:py-10">
            <div className="relative rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
                <Link
                    href="/?tab=living_library"
                    className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
                    aria-label="Close journal"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </Link>
                <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 pr-14 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-600">Journal</p>
                        <h1 className="mt-2 text-3xl font-bold text-gray-900">Your journal collection</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                            Review your posts as a personal gallery of notes, reflections, meals, and progress over time.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (isComposerOpen) {
                                    resetEditor();
                                } else {
                                    setIsComposerOpen(true);
                                }
                            }}
                            className="inline-flex items-center rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                            {isComposerOpen ? 'Close composer' : 'Add entry'}
                        </button>
                    </div>
                </div>

                {isComposerOpen ? (
                    <section className="mt-8 rounded-3xl border border-green-100 bg-green-50/60 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{editingEntryId ? 'Edit entry' : 'Add a note'}</h2>
                                <p className="mt-1 text-sm text-gray-600">A quick entry is enough. This is for your own timeline and collection.</p>
                            </div>
                            {editingEntryId ? (
                                <button
                                    type="button"
                                    onClick={resetEditor}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Cancel edit
                                </button>
                            ) : null}
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Daily note</label>
                                <textarea
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    rows={6}
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
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleAddEntry}
                                className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                            >
                                {editingEntryId ? 'Update entry' : 'Add to collection'}
                            </button>
                            {!editingEntryId ? (
                                <button
                                    type="button"
                                    onClick={() => setIsComposerOpen(false)}
                                    className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                <section className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Collection</h2>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-600">
                            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                    </div>

                    {entries.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                            <p className="text-lg font-semibold text-gray-900">No journal posts yet</p>
                            <p className="mt-2 text-sm text-gray-600">
                                Start with a short note when you are ready, and your collection will begin to grow here.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsComposerOpen(true)}
                                className="mt-5 inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                            >
                                Add your first entry
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                            {entries.map((entry) => (
                                <article key={entry.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                                    {entry.imageUrl ? (
                                        <div className="relative aspect-[4/3] w-full">
                                            <Image src={entry.imageUrl} alt="Journal entry" fill className="object-cover" unoptimized />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">
                                                        {formatJournalDate(entry.entryDate)}
                                                    </p>
                                                    {entry.category ? (
                                                        <span className="mt-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                                                            {entry.category}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditEntry(entry)}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 transition hover:bg-white"
                                                        aria-label="Edit journal entry"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-500 transition hover:bg-white"
                                                        aria-label="Delete journal entry"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="p-5">
                                        {!entry.imageUrl ? (
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
                                        ) : null}

                                        <p className={`${entry.imageUrl ? 'mt-0' : 'mt-4'} whitespace-pre-wrap text-sm leading-7 text-gray-700`}>
                                            {entry.content}
                                        </p>
                                        {entry.tags && entry.tags.length > 0 ? (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {entry.tags.map((tag) => (
                                                    <span key={`${entry.id}-${tag}`} className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
