export function escapeHtml(text: string) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function renderMarkdownToHtml(text: string) {
    let html = escapeHtml(text);

    html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">$1</a>'
    );

    html = html.replace(
        /(?<!href=")(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">$1</a>'
    );

    html = html
        .replace(/^###\s+(.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2 class="font-semibold text-lg mt-3 mb-1">$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1 class="font-bold text-xl mt-3 mb-1">$1</h1>');

    html = html
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');

    html = html.replace(/(?:^|\n)-\s+(.+)(?=\n|$)/g, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="list-disc ml-5 my-2">$1</ul>');

    html = html.replace(/\n/g, '<br />');

    html = html
        .replace(/<br \/>(<h[1-3])/g, '$1')
        .replace(/(<\/h[1-3]>)<br \/>/g, '$1')
        .replace(/<br \/>((?:<ul class="list-disc ml-5 my-2">))/g, '$1')
        .replace(/(<\/ul>)<br \/>/g, '$1');

    return html;
}

export function stripMarkdownToPlainText(text: string) {
    return String(text || '')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
        .replace(/^#{1,3}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^-+\s+/gm, '')
        .trim();
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
    if (typeof window === 'undefined') return;

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function slugifyFilename(value: string) {
    const normalized = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || 'knowledge-bank-item';
}
