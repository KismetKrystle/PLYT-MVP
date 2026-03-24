import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DigitalAssetAnalyticsPanel from '../../../../components/wallet/DigitalAssetAnalyticsPanel';
import { MOCK_DIGITAL_ASSETS } from '../../../../lib/mockDigitalAssets';

type PageProps = {
    params: Promise<{
        assetId: string;
    }>;
};

export default async function WalletAssetDetailPage({ params }: PageProps) {
    const { assetId } = await params;
    const asset = MOCK_DIGITAL_ASSETS.find((entry) => entry.id === assetId);

    if (!asset) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600">Digital Asset Detail</p>
                    <h1 className="mt-2 text-3xl font-bold text-gray-900">{asset.name}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-gray-500">{asset.summary}</p>
                </div>
                <Link
                    href="/wallet"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-green-300 hover:text-green-700"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to wallet
                </Link>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.05fr_1.25fr]">
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                    <div className="relative aspect-[4/5] bg-gray-100">
                        <Image src={asset.image} alt={asset.name} fill className="object-cover" />
                    </div>
                    <div className="space-y-3 border-t border-gray-100 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                {asset.type}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${asset.status === 'Listed' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                {asset.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Token Hash</p>
                            <p className="mt-1 break-all rounded-xl bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">{asset.hash}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900">Mint Details</h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Minted From</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">{asset.mintedFrom}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Uploaded On</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">{asset.uploadedAt}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Creator</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">{asset.creator}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">File Format</p>
                                <p className="mt-1 text-sm font-medium text-gray-900">{asset.fileFormat}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900">Usage Rights</h2>
                        <p className="mt-3 text-sm leading-6 text-gray-600">{asset.license}</p>
                    </div>

                    <DigitalAssetAnalyticsPanel assetId={asset.id} />

                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900">Tags</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {asset.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700">
                            Transfer / Sell
                        </button>
                        <button className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
                            Download Source
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
