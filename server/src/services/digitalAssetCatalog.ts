type CatalogAsset = {
    id: string;
    name: string;
    assetType: 'Recipe NFT' | 'Book NFT' | 'Research NFT';
    imageUrl: string;
    chainHash: string;
    status: 'Minted' | 'Listed';
    uploadedAt: string;
    mintedFrom: string;
    creatorName: string;
    fileFormat: string;
    usageLicense: string;
    summary: string;
    tags: string[];
};

const DIGITAL_ASSET_CATALOG: CatalogAsset[] = [
    {
        id: 'nft-001',
        name: 'Cooling Garden Bowl',
        assetType: 'Recipe NFT',
        imageUrl: '/assets/images/gallery/cherry_tomatoes.png',
        chainHash: '0x71C...9A23',
        status: 'Minted',
        uploadedAt: '2026-03-08',
        mintedFrom: 'Uploaded recipe',
        creatorName: 'Kismet',
        fileFormat: 'PDF recipe card',
        usageLicense: 'Personal + collector resale',
        summary: 'A chilled plant-forward bowl recipe built around tomatoes, herbs, citrus, and mineral-rich toppings.',
        tags: ['recipe', 'raw food', 'cooling meals']
    },
    {
        id: 'nft-002',
        name: 'The Neighborhood Food Library',
        assetType: 'Book NFT',
        imageUrl: '/assets/images/gallery/community_garden.png',
        chainHash: '0x82B...1B44',
        status: 'Minted',
        uploadedAt: '2026-03-12',
        mintedFrom: 'Uploaded book',
        creatorName: 'Kismet',
        fileFormat: 'EPUB + PDF bundle',
        usageLicense: 'Collector access',
        summary: 'A community knowledge book capturing local sourcing notes, food stories, and foundational kitchen practices.',
        tags: ['book', 'community', 'food knowledge']
    },
    {
        id: 'nft-003',
        name: 'Local Greens Micronutrient Study',
        assetType: 'Research NFT',
        imageUrl: '/assets/images/gallery/indoor_garden.png',
        chainHash: '0x94D...7F18',
        status: 'Listed',
        uploadedAt: '2026-03-19',
        mintedFrom: 'Uploaded research paper',
        creatorName: 'Kismet',
        fileFormat: 'Research PDF',
        usageLicense: 'Read + cite',
        summary: 'A structured research upload comparing micronutrient density across several locally grown leafy greens.',
        tags: ['research', 'nutrition', 'local produce']
    }
];

export function findCatalogAsset(assetId: string) {
    return DIGITAL_ASSET_CATALOG.find((asset) => asset.id === assetId) || null;
}
