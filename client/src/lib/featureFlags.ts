export const PROFILE_PREVIEWS_ENABLED = process.env.NEXT_PUBLIC_PROFILE_PREVIEWS_ENABLED !== 'false';

export function isRestrictedProfileMode(mode: string | null | undefined): mode is 'business' | 'expert' {
    return mode === 'business' || mode === 'expert';
}

export function isProfilePreviewLocked(mode: string | null | undefined) {
    return !PROFILE_PREVIEWS_ENABLED && isRestrictedProfileMode(mode);
}

export const PROFILE_PREVIEW_BADGE = 'Private preview';
export const PROFILE_PREVIEW_HINT = 'Available in local preview only while we finish the experience.';
