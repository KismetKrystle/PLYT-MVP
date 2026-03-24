export type DigitalAsset = {
    id: string;
    name: string;
    type: 'Recipe NFT' | 'Book NFT' | 'Research NFT';
    image: string;
    hash: string;
    status: 'Minted' | 'Listed';
    uploadedAt: string;
    mintedFrom: string;
    creator: string;
    fileFormat: string;
    license: string;
    summary: string;
    tags: string[];
};

export const MOCK_DIGITAL_ASSETS: DigitalAsset[] = [
    {
        id: 'nft-001',
        name: 'Cooling Garden Bowl',
        type: 'Recipe NFT',
        image: '/assets/images/gallery/cherry_tomatoes.png',
        hash: '0x71C...9A23',
        status: 'Minted',
        uploadedAt: '2026-03-08',
        mintedFrom: 'Uploaded recipe',
        creator: 'Kismet',
        fileFormat: 'PDF recipe card',
        license: 'Personal + collector resale',
        summary: 'A chilled plant-forward bowl recipe built around tomatoes, herbs, citrus, and mineral-rich toppings.',
        tags: ['recipe', 'raw food', 'cooling meals']
    },
    {
        id: 'nft-002',
        name: 'The Neighborhood Food Library',
        type: 'Book NFT',
        image: '/assets/images/gallery/community_garden.png',
        hash: '0x82B...1B44',
        status: 'Minted',
        uploadedAt: '2026-03-12',
        mintedFrom: 'Uploaded book',
        creator: 'Kismet',
        fileFormat: 'EPUB + PDF bundle',
        license: 'Collector access',
        summary: 'A community knowledge book capturing local sourcing notes, food stories, and foundational kitchen practices.',
        tags: ['book', 'community', 'food knowledge']
    },
    {
        id: 'nft-003',
        name: 'Local Greens Micronutrient Study',
        type: 'Research NFT',
        image: '/assets/images/gallery/indoor_garden.png',
        hash: '0x94D...7F18',
        status: 'Listed',
        uploadedAt: '2026-03-19',
        mintedFrom: 'Uploaded research paper',
        creator: 'Kismet',
        fileFormat: 'Research PDF',
        license: 'Read + cite',
        summary: 'A structured research upload comparing micronutrient density across several locally grown leafy greens.',
        tags: ['research', 'nutrition', 'local produce']
    }
];
