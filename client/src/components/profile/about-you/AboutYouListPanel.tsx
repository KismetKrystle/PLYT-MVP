import type { RefObject } from 'react';
import { AboutListSection } from './types';

type Props = {
    viewMode: 'cards' | 'list';
    onViewModeChange: (mode: 'cards' | 'list') => void;
    selectedListSection: string | null;
    onSelectListSection: (sectionId: string | null) => void;
    aboutYouListSections: AboutListSection[];
    favoritesSectionRef: RefObject<HTMLDivElement>;
};

export default function AboutYouListPanel({
    viewMode,
    onViewModeChange,
    selectedListSection,
    onSelectListSection,
    aboutYouListSections,
    favoritesSectionRef
}: Props) {
    return (
        <>
            <div className="mx-auto mb-4 max-w-7xl">
                <div className="flex items-center justify-between gap-3 md:gap-4">
                    <div className="min-w-0 flex-1">
                        <h2 className="whitespace-nowrap text-[1.15rem] font-extrabold uppercase tracking-[0.02em] text-gray-900 sm:text-2xl md:text-[1.7rem]">Your Living Library</h2>
                    </div>
                    <div className="inline-flex shrink-0 rounded-2xl border border-gray-200 bg-gray-50 p-0.5">
                        <button
                            type="button"
                            onClick={() => onViewModeChange('cards')}
                            className={`flex h-8 w-8 items-center justify-center rounded-2xl transition sm:h-10 sm:w-10 ${
                                viewMode === 'cards'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="Card view"
                            title="Card view"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7v6H4V5zm9 0h7v6h-7V5zM4 13h7v6H4v-6zm9 0h7v6h-7v-6z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange('list')}
                            className={`flex h-8 w-8 items-center justify-center rounded-2xl transition sm:h-10 sm:w-10 ${
                                viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="List view"
                            title="List view"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="max-w-5xl mx-auto">
                    {aboutYouListSections.map((section) => (
                        <div
                            key={section.id}
                            ref={section.id === 'favorites' ? favoritesSectionRef : undefined}
                            className="border-b border-gray-200 py-1"
                        >
                            <button
                                type="button"
                                onClick={() => onSelectListSection(selectedListSection === section.id ? null : section.id)}
                                className={`flex w-full items-center justify-between px-1 py-4 text-left transition ${
                                    selectedListSection === section.id
                                        ? 'text-green-900'
                                        : 'text-gray-900 hover:text-green-800'
                                }`}
                            >
                                <span className="text-base font-bold">{section.title}</span>
                                <svg
                                    className={`h-5 w-5 text-gray-400 transition-transform ${
                                        selectedListSection === section.id ? 'rotate-90' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            {selectedListSection === section.id ? (
                                <div className="mt-1 space-y-1 border-t border-gray-100 pt-3">
                                    <p className="px-1 pb-2 text-sm text-gray-500">{section.description}</p>
                                    {section.items.length > 0 ? section.items.map((item) => {
                                        const row = (
                                            <div className={`flex items-start justify-between gap-4 border-b border-gray-100 px-1 py-3 text-left transition ${
                                                item.onClick ? 'hover:text-green-800' : ''
                                            }`}>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-bold text-gray-900">{item.title}</p>
                                                        {item.kind ? (
                                                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                                                                {item.kind}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {item.subtitle ? (
                                                        <p className="mt-1 text-sm leading-5 text-gray-500">{item.subtitle}</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    {item.meta ? (
                                                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                                            {item.meta}
                                                        </span>
                                                    ) : null}
                                                    {item.onClick ? (
                                                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );

                                        return item.onClick ? (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={item.onClick}
                                                className="block w-full"
                                            >
                                                {row}
                                            </button>
                                        ) : (
                                            <div key={item.id}>
                                                {row}
                                            </div>
                                        );
                                    }) : (
                                        <div className="px-1 py-6 text-sm text-gray-500">
                                            {section.emptyState || 'Nothing has been saved here yet.'}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}
        </>
    );
}
