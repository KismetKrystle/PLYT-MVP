export type BusinessType = 'farmer' | 'distributor';
export type BusinessMembershipRole = 'owner' | 'admin' | 'member';

export type BusinessRecord = {
    id: string;
    business_type: BusinessType;
    name: string;
    description: string;
    primary_location: string;
    service_region: string;
    profile_data?: Record<string, any>;
    membership_role: BusinessMembershipRole;
    membership_status: string;
    created_at?: string;
    updated_at?: string;
};

export type PublicBusinessRecord = {
    id: string;
    business_type: BusinessType;
    name: string;
    description: string;
    primary_location: string;
    service_region: string;
    business_image_url?: string;
    product_types?: string[];
    trust_signals?: string[];
    fulfillment_notes?: string;
    sourcing_story?: string;
    operator_count?: number;
    inventory_count?: number;
    created_at?: string;
    updated_at?: string;
};

export type BusinessMember = {
    user_id: string;
    name: string;
    email: string;
    role: BusinessMembershipRole;
    status: string;
    created_at?: string;
};

export type BusinessInventoryItem = {
    id: string;
    business_id: string;
    name: string;
    description: string;
    category?: string | null;
    price_fiat?: number | string | null;
    quantity?: number | string | null;
    unit?: string | null;
    image_url?: string | null;
    source_type?: string | null;
    external_source?: string | null;
    external_item_id?: string | null;
    enrichment_data?: {
        fulfillment_notes?: string;
        service_region?: string;
        consumer_tags?: string[];
    };
    updated_at?: string;
};

export type PublicBusinessProfileResponse = {
    business: PublicBusinessRecord;
    items: BusinessInventoryItem[];
};

export type BusinessCsvPreviewRow = {
    index: number;
    normalized: {
        name: string;
        description: string;
        category: string;
        price_fiat: number;
        quantity: number;
        unit: string;
        image_url: string;
        external_source: string | null;
        external_item_id: string | null;
        enrichment_data: {
            fulfillment_notes: string;
            service_region: string;
            consumer_tags: string[];
        };
    };
    errors: string[];
};
