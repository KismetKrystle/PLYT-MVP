import { SupplementEntry } from './types';

export function normalizeSupplementEntry(raw: any, fallbackId: number): SupplementEntry | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }

    const title = String(raw.title || '').trim();
    if (!title) {
        return null;
    }

    const nutrients = Array.isArray(raw.nutrients)
        ? raw.nutrients.map((value: unknown) => String(value).trim()).filter(Boolean)
        : [];

    const benefits = Array.isArray(raw.benefits)
        ? raw.benefits.map((value: unknown) => String(value).trim()).filter(Boolean)
        : [];

    return {
        id: Number(raw.id) || fallbackId,
        title,
        image: String(raw.image || '/assets/images/gallery/user_avatar.png').trim() || '/assets/images/gallery/user_avatar.png',
        nutrients,
        benefits,
        notes: String(raw.notes || '').trim() || undefined
    };
}

export function normalizeSupplements(raw: any): SupplementEntry[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map((item, index) => normalizeSupplementEntry(item, Date.now() + index))
        .filter((item): item is SupplementEntry => Boolean(item));
}

export function truncateText(value: string, maxLength = 90) {
    const normalized = value.trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
