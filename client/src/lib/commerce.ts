export type SupplierRole = 'Farmer' | 'Distributor' | 'Expert';
export type CommerceCategory = 'Produce' | 'Products' | 'Services';

export type CommerceItemProfile = {
    id: string;
    name: string;
    category: CommerceCategory;
    price: number;
    quantity: number;
    unit: string;
    image?: string;
    supplierName: string;
    supplierRole: SupplierRole;
    supplierBusinessId?: string | null;
    supplierLocation: string;
    description: string;
    supplierBio: string;
    trustSignals: string[];
    fulfillment: string;
    story: string;
};

export function getSupplierPreviewRoute(role: SupplierRole, businessId?: string | null) {
    if (businessId && role !== 'Expert') {
        return `/business/${businessId}`;
    }
    return role === 'Expert' ? '/?tab=about_you&profile=expert' : '/?tab=about_you&profile=business';
}

export function inferSupplierRole(name: string) {
    const normalized = String(name || '').toLowerCase();
    if (/(farm|farmer|grower|collective|harvest)/.test(normalized)) return 'Farmer' as const;
    if (/(expert|coach|nutrition|doctor|advisor)/.test(normalized)) return 'Expert' as const;
    if (/(distribution|distributor|marketplace|hub|route)/.test(normalized)) return 'Distributor' as const;
    return 'Farmer' as const;
}
