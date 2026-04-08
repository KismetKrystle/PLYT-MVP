export const PUBLIC_APP_HOME_PATH = '/?tab=chat';

export function resolveAuthRedirectPath(value: string | null | undefined) {
    const trimmedValue = String(value || '').trim();
    return trimmedValue || PUBLIC_APP_HOME_PATH;
}
