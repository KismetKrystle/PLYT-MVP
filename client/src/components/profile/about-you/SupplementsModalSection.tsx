import Image from 'next/image';
import { SupplementEntry } from './types';

type Props = {
    isOwner: boolean;
    selectedSupplement: SupplementEntry | null;
    isEditingSupplements: boolean;
    editingSupplementId: number | null;
    newSupplementTitle: string;
    setNewSupplementTitle: (value: string) => void;
    newSupplementImage: string;
    setNewSupplementImage: (value: string) => void;
    newSupplementNutrients: string;
    setNewSupplementNutrients: (value: string) => void;
    newSupplementBenefits: string;
    setNewSupplementBenefits: (value: string) => void;
    newSupplementNotes: string;
    setNewSupplementNotes: (value: string) => void;
    resetSupplementEditor: () => void;
    toggleSupplementEditor: () => void;
    handleAddSupplement: () => void;
    handleRemoveSupplement: (id: number) => void;
    filteredSupplements: SupplementEntry[];
    supplementSearch: string;
    setSupplementSearch: (value: string) => void;
    visibleSupplements: SupplementEntry[];
    setSelectedSupplement: (item: SupplementEntry) => void;
    handleEditSupplement: (item: SupplementEntry) => void;
    showMoreSupplements: () => void;
    hasMoreSupplements: boolean;
};

export default function SupplementsModalSection({
    isOwner,
    selectedSupplement,
    isEditingSupplements,
    editingSupplementId,
    newSupplementTitle,
    setNewSupplementTitle,
    newSupplementImage,
    setNewSupplementImage,
    newSupplementNutrients,
    setNewSupplementNutrients,
    newSupplementBenefits,
    setNewSupplementBenefits,
    newSupplementNotes,
    setNewSupplementNotes,
    resetSupplementEditor,
    toggleSupplementEditor,
    handleAddSupplement,
    handleRemoveSupplement,
    filteredSupplements,
    supplementSearch,
    setSupplementSearch,
    visibleSupplements,
    setSelectedSupplement,
    handleEditSupplement,
    showMoreSupplements,
    hasMoreSupplements
}: Props) {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                <p className="text-sm font-semibold text-gray-900">Supplement shelf</p>
                <p className="mt-1 text-sm text-gray-600">Keep track of the supplements you currently use, why you keep them around, and the details you want to remember.</p>
            </div>

            {selectedSupplement ? (
                <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Supplement snapshot</p>
                            <h3 className="mt-2 text-2xl font-bold text-gray-900">{selectedSupplement.title}</h3>
                            <p className="mt-2 text-sm text-gray-600">{selectedSupplement.notes || 'A quick look at what this supplement offers and why it may be part of your routine.'}</p>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
                        <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100">
                            <Image src={selectedSupplement.image} alt={selectedSupplement.title} fill className="object-cover" />
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Key nutrients</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedSupplement.nutrients.map((nutrient) => (
                                        <span key={`${selectedSupplement.id}-${nutrient}`} className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                            {nutrient}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Benefits</p>
                                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                                    {selectedSupplement.benefits.map((benefit) => (
                                        <li key={`${selectedSupplement.id}-${benefit}`} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
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
                    No supplement selected yet. Pick one from the shelf below to open its detail view.
                </div>
            )}

            {isOwner ? (
                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Manage your supplement shelf</p>
                            <p className="mt-1 text-sm text-gray-500">Add something new or edit an existing item when your routine changes.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditingSupplements ? (
                                <button
                                    type="button"
                                    onClick={resetSupplementEditor}
                                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={toggleSupplementEditor}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50"
                                aria-label="Add a supplement"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {isEditingSupplements ? (
                        <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <input
                                type="text"
                                value={newSupplementTitle}
                                onChange={(e) => setNewSupplementTitle(e.target.value)}
                                placeholder="Supplement name"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                            />
                            <input
                                type="text"
                                value={newSupplementImage}
                                onChange={(e) => setNewSupplementImage(e.target.value)}
                                placeholder="Optional image URL"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                            />
                            <input
                                type="text"
                                value={newSupplementNutrients}
                                onChange={(e) => setNewSupplementNutrients(e.target.value)}
                                placeholder="Key nutrients separated by commas"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                            />
                            <textarea
                                value={newSupplementBenefits}
                                onChange={(e) => setNewSupplementBenefits(e.target.value)}
                                rows={3}
                                placeholder="Benefits, one per line"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 resize-none"
                            />
                            <textarea
                                value={newSupplementNotes}
                                onChange={(e) => setNewSupplementNotes(e.target.value)}
                                rows={2}
                                placeholder="Optional notes about timing, form, or how you use it"
                                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400 resize-none"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleAddSupplement}
                                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                                >
                                    {editingSupplementId ? 'Update Supplement' : 'Add Supplement'}
                                </button>
                                {editingSupplementId ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleRemoveSupplement(editingSupplementId);
                                            resetSupplementEditor();
                                        }}
                                        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50"
                                    >
                                        Delete Supplement
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
                        <p className="text-sm font-semibold text-gray-900">Browse your supplement shelf</p>
                        <p className="mt-1 text-sm text-gray-500">You can keep this lightweight for now and expand it later as the platform grows.</p>
                    </div>
                    <div className="w-full md:max-w-sm">
                        <label htmlFor="supplement-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Search supplements
                        </label>
                        <input
                            id="supplement-search"
                            type="text"
                            value={supplementSearch}
                            onChange={(event) => setSupplementSearch(event.target.value)}
                            placeholder="Search magnesium, omega, bone health..."
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-emerald-400"
                        />
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    <span>{filteredSupplements.length} match{filteredSupplements.length === 1 ? '' : 'es'}</span>
                    {supplementSearch ? (
                        <button
                            type="button"
                            onClick={() => setSupplementSearch('')}
                            className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-bold tracking-normal text-gray-600 transition hover:bg-gray-50"
                        >
                            Clear search
                        </button>
                    ) : null}
                </div>

                {visibleSupplements.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
                        {visibleSupplements.map((item) => (
                            <div key={item.id} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSupplement(item)}
                                    className={`group w-full rounded-2xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                                        selectedSupplement?.id === item.id
                                            ? 'border-emerald-300 ring-2 ring-emerald-100'
                                            : 'border-gray-100 hover:border-emerald-200'
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
                                        onClick={() => handleEditSupplement(item)}
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
                        No supplements match that search yet.
                    </div>
                )}

                {hasMoreSupplements ? (
                    <div className="mt-5 flex justify-center">
                        <button
                            type="button"
                            onClick={showMoreSupplements}
                            className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                        >
                            Show more supplements
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
