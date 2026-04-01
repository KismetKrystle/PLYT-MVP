import Image from 'next/image';
import { SupplementEntry } from './types';

type Props = {
    isOwner: boolean;
    selectedHerb: SupplementEntry | null;
    isEditingHerbs: boolean;
    editingHerbId: number | null;
    newHerbTitle: string;
    setNewHerbTitle: (value: string) => void;
    newHerbImage: string;
    setNewHerbImage: (value: string) => void;
    newHerbNutrients: string;
    setNewHerbNutrients: (value: string) => void;
    newHerbBenefits: string;
    setNewHerbBenefits: (value: string) => void;
    newHerbNotes: string;
    setNewHerbNotes: (value: string) => void;
    resetHerbEditor: () => void;
    toggleHerbEditor: () => void;
    handleAddHerb: () => void;
    handleRemoveHerb: (id: number) => void;
    filteredHerbs: SupplementEntry[];
    herbSearch: string;
    setHerbSearch: (value: string) => void;
    visibleHerbs: SupplementEntry[];
    setSelectedHerb: (item: SupplementEntry) => void;
    handleEditHerb: (item: SupplementEntry) => void;
    showMoreHerbs: () => void;
    hasMoreHerbs: boolean;
};

export default function HerbsModalSection({
    isOwner,
    selectedHerb,
    isEditingHerbs,
    editingHerbId,
    newHerbTitle,
    setNewHerbTitle,
    newHerbImage,
    setNewHerbImage,
    newHerbNutrients,
    setNewHerbNutrients,
    newHerbBenefits,
    setNewHerbBenefits,
    newHerbNotes,
    setNewHerbNotes,
    resetHerbEditor,
    toggleHerbEditor,
    handleAddHerb,
    handleRemoveHerb,
    filteredHerbs,
    herbSearch,
    setHerbSearch,
    visibleHerbs,
    setSelectedHerb,
    handleEditHerb,
    showMoreHerbs,
    hasMoreHerbs
}: Props) {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-lime-100 bg-lime-50/70 p-5">
                <p className="text-sm font-semibold text-gray-900">Herb shelf</p>
                <p className="mt-1 text-sm text-gray-600">Keep track of the herbs you use, why they matter to you, and the details you want to remember.</p>
            </div>

            {selectedHerb ? (
                <div className="rounded-3xl border border-lime-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-600">Herb snapshot</p>
                            <h3 className="mt-2 text-2xl font-bold text-gray-900">{selectedHerb.title}</h3>
                            <p className="mt-2 text-sm text-gray-600">{selectedHerb.notes || 'A quick look at why this herb is part of your routine.'}</p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
                        <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100">
                            <Image src={selectedHerb.image} alt={selectedHerb.title} fill className="object-cover" />
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Key qualities</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedHerb.nutrients.map((nutrient) => (
                                        <span key={`${selectedHerb.id}-${nutrient}`} className="rounded-full bg-lime-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-lime-700">
                                            {nutrient}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Uses and notes</p>
                                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                                    {selectedHerb.benefits.map((benefit) => (
                                        <li key={`${selectedHerb.id}-${benefit}`} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500" />
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                    No herb selected yet. Pick one from the shelf below to open its detail view.
                </div>
            )}

            {isOwner ? (
                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Manage your herb shelf</p>
                            <p className="mt-1 text-sm text-gray-500">Add something new or edit an existing herb when your routine changes.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditingHerbs ? (
                                <button
                                    type="button"
                                    onClick={resetHerbEditor}
                                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={toggleHerbEditor}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-lime-200 bg-white text-lime-600 transition hover:bg-lime-50"
                                aria-label="Add a herb"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {isEditingHerbs ? (
                        <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-lime-100 bg-lime-50/50 p-4">
                            <input
                                type="text"
                                value={newHerbTitle}
                                onChange={(e) => setNewHerbTitle(e.target.value)}
                                placeholder="Herb name"
                                className="w-full rounded-xl border border-lime-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-lime-400"
                            />
                            <input
                                type="text"
                                value={newHerbImage}
                                onChange={(e) => setNewHerbImage(e.target.value)}
                                placeholder="Optional image URL"
                                className="w-full rounded-xl border border-lime-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-lime-400"
                            />
                            <input
                                type="text"
                                value={newHerbNutrients}
                                onChange={(e) => setNewHerbNutrients(e.target.value)}
                                placeholder="Key qualities separated by commas"
                                className="w-full rounded-xl border border-lime-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-lime-400"
                            />
                            <textarea
                                value={newHerbBenefits}
                                onChange={(e) => setNewHerbBenefits(e.target.value)}
                                rows={3}
                                placeholder="Uses or benefits, one per line"
                                className="w-full rounded-xl border border-lime-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-lime-400 resize-none"
                            />
                            <textarea
                                value={newHerbNotes}
                                onChange={(e) => setNewHerbNotes(e.target.value)}
                                rows={2}
                                placeholder="Optional notes about taste, routine, or preparation"
                                className="w-full rounded-xl border border-lime-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-lime-400 resize-none"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleAddHerb}
                                    className="inline-flex items-center justify-center rounded-xl bg-lime-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-lime-700"
                                >
                                    {editingHerbId ? 'Update Herb' : 'Add Herb'}
                                </button>
                                {editingHerbId ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleRemoveHerb(editingHerbId);
                                            resetHerbEditor();
                                        }}
                                        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50"
                                    >
                                        Delete Herb
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Browse your herb shelf</p>
                        <p className="mt-1 text-sm text-gray-500">Keep it lightweight for now and expand it as your personal herb library grows.</p>
                    </div>
                    <div className="w-full md:max-w-sm">
                        <label htmlFor="herb-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Search herbs
                        </label>
                        <input
                            id="herb-search"
                            type="text"
                            value={herbSearch}
                            onChange={(event) => setHerbSearch(event.target.value)}
                            placeholder="Search tulsi, mint, tea, calming..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-lime-400"
                        />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    <span>{filteredHerbs.length} match{filteredHerbs.length === 1 ? '' : 'es'}</span>
                    {herbSearch ? (
                        <button
                            type="button"
                            onClick={() => setHerbSearch('')}
                            className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-bold tracking-normal text-gray-600 transition hover:bg-gray-50"
                        >
                            Clear search
                        </button>
                    ) : null}
                </div>

                {visibleHerbs.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
                        {visibleHerbs.map((item) => (
                            <div key={item.id} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setSelectedHerb(item)}
                                    className={`group w-full rounded-2xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                                        selectedHerb?.id === item.id
                                            ? 'border-lime-300 ring-2 ring-lime-100'
                                            : 'border-gray-100 hover:border-lime-200'
                                    }`}
                                >
                                    <div className="aspect-square relative overflow-hidden rounded-xl shadow-sm">
                                        <Image src={item.image} alt={item.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
                                    </div>
                                    <h3 className="mt-3 font-bold text-gray-900">{item.title}</h3>
                                </button>
                                {isOwner ? (
                                    <button
                                        type="button"
                                        onClick={() => handleEditHerb(item)}
                                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-gray-700 transition hover:bg-white"
                                        aria-label={`Edit ${item.title}`}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                        No herbs match that search yet.
                    </div>
                )}

                {hasMoreHerbs ? (
                    <div className="mt-5 flex justify-center">
                        <button
                            type="button"
                            onClick={showMoreHerbs}
                            className="rounded-full border border-lime-200 px-4 py-2 text-sm font-bold text-lime-700 transition hover:bg-lime-50"
                        >
                            Show more herbs
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
