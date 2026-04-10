import axios from 'axios';
import { hydratePlacesWithProfileData, inferPlaceKind, searchManagedPlaceProfiles } from './placeProfiles';
import type { LocaleCode } from './categoryResolver';

export interface UserLocation {
    lat: number;
    lng: number;
}

export interface PlacesResult {
    id: string;
    name: string;
    address: string;
    phone?: string;
    rating?: number | null;
    reviewsCount?: number;
    website?: string;
    mapsUrl: string;
    image?: string | null;
    distance_km: number | null;
    types?: string[];
    place_kind?: string;
    network_status?: string;
    source: 'premium' | 'google';
    search_priority?: number;
    menu_context?: string;
    raw_inventory_context?: string;
}

export interface PlacesSearchResponse {
    premiumResults: PlacesResult[];
    googleResults: PlacesResult[];
    combinedResults: PlacesResult[];
    fallbackMessage: string | null;
}

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

function distanceKm(a: UserLocation, b: UserLocation) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.lat - a.lat);
    const dLng = toRadians(b.lng - a.lng);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);

    const haversine =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function detectProduceBias(searchTerms: string[]) {
    return searchTerms.some((term) => /(produce|fruit|vegetable|market|farm|farmstand|grocery|organic|herb|juice|fermented|supplement|vitamin)/i.test(term));
}

function typeFitBoost(place: any, searchTerms: string[]) {
    const placeKind = inferPlaceKind(place);
    const produceBias = detectProduceBias(searchTerms);

    if (produceBias) {
        if (['farm', 'farm_stand', 'grocery', 'natural_food_store', 'distributor'].includes(placeKind)) return 2.5;
        if (placeKind === 'juice_bar') return 1.5;
        if (placeKind === 'restaurant') return -1.25;
        if (placeKind === 'cafe') return -0.75;
    }

    if (/(restaurant|cafe|takeout|ready to eat|meal)/i.test(searchTerms.join(' '))) {
        if (placeKind === 'restaurant') return 1.5;
        if (placeKind === 'cafe') return 1;
    }

    return 0;
}

function buildSearchKey(place: any) {
    return String(place?.place_profile_id || place?.id || `${place?.name || ''}-${place?.address || ''}-${place?.mapsUrl || ''}`).trim();
}

function rankPlaces(places: PlacesResult[], origin: UserLocation | null, searchTerms: string[]) {
    return [...places].sort((a, b) => {
        const aDistance = typeof a.distance_km === 'number' ? a.distance_km : null;
        const bDistance = typeof b.distance_km === 'number' ? b.distance_km : null;
        const aScore = (aDistance != null ? -aDistance : -999) + typeFitBoost(a, searchTerms);
        const bScore = (bDistance != null ? -bDistance : -999) + typeFitBoost(b, searchTerms);

        if (bScore !== aScore) return bScore - aScore;
        if (aDistance == null && bDistance == null) return 0;
        if (aDistance == null) return 1;
        if (bDistance == null) return -1;
        return aDistance - bDistance;
    });
}

async function searchGooglePlacesByTerms(params: {
    searchTerms: string[];
    userLocation: UserLocation | null;
    radiusMeters: number;
    locale: LocaleCode;
}) {
    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key || !params.userLocation) return [];

    const region = params.locale.toLowerCase();
    const collected = new Map<string, any>();

    for (const searchTerm of params.searchTerms) {
        try {
            const nearbySearch = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
                params: {
                    keyword: searchTerm,
                    location: `${params.userLocation.lat},${params.userLocation.lng}`,
                    rankby: 'distance',
                    key
                }
            });

            const nearbyResults = Array.isArray(nearbySearch.data?.results) ? nearbySearch.data.results : [];
            for (const result of nearbyResults) {
                if (!result?.place_id || collected.has(result.place_id)) continue;
                collected.set(result.place_id, result);
                if (collected.size >= 20) break;
            }

            if (collected.size >= 20) {
                continue;
            }

            const textSearch = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
                params: {
                    query: searchTerm,
                    location: `${params.userLocation.lat},${params.userLocation.lng}`,
                    radius: params.radiusMeters,
                    region,
                    key
                }
            });

            const results = Array.isArray(textSearch.data?.results) ? textSearch.data.results : [];
            for (const result of results) {
                if (!result?.place_id || collected.has(result.place_id)) continue;
                collected.set(result.place_id, result);
            }
        } catch {
            // Skip failed term and continue aggregating.
        }
    }

    const shortlist = Array.from(collected.values()).slice(0, 20);
    const enriched = await Promise.all(shortlist.map(async (result: any) => {
        try {
            const details = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                params: {
                    place_id: result.place_id,
                    fields: 'name,formatted_address,formatted_phone_number,rating,user_ratings_total,website,photos,url,geometry,types',
                    key
                }
            });

            const detail = details.data?.result || {};
            const photoRef = detail?.photos?.[0]?.photo_reference;
            const image = photoRef
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photo_reference=${encodeURIComponent(photoRef)}&key=${encodeURIComponent(key)}`
                : null;

            const placeCoords = Number.isFinite(detail?.geometry?.location?.lat) && Number.isFinite(detail?.geometry?.location?.lng)
                ? { lat: detail.geometry.location.lat, lng: detail.geometry.location.lng }
                : null;
            const km = params.userLocation && placeCoords ? distanceKm(params.userLocation, placeCoords) : null;

            const place = {
                id: String(result.place_id),
                name: detail.name || result.name || params.searchTerms[0] || 'Nearby option',
                address: detail.formatted_address || result.formatted_address || '',
                phone: detail.formatted_phone_number || '',
                rating: typeof detail.rating === 'number' ? detail.rating : (typeof result.rating === 'number' ? result.rating : null),
                reviewsCount: Number.isFinite(detail.user_ratings_total) ? detail.user_ratings_total : (result.user_ratings_total || 0),
                website: detail.website || '',
                mapsUrl: detail.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.name || result.name || params.searchTerms[0] || '')}`,
                image,
                distance_km: km,
                types: Array.isArray(detail.types) ? detail.types : (Array.isArray(result.types) ? result.types : []),
                place_kind: inferPlaceKind({
                    name: detail.name || result.name || '',
                    address: detail.formatted_address || result.formatted_address || '',
                    website: detail.website || '',
                    types: Array.isArray(detail.types) ? detail.types : (Array.isArray(result.types) ? result.types : [])
                }),
                source: 'google' as const
            };

            return place;
        } catch {
            return null;
        }
    }));

    return enriched.filter(Boolean) as PlacesResult[];
}

export async function searchPlacesForTerms(params: {
    searchTerms: string[];
    userLocation?: UserLocation | null;
    radiusMeters?: number;
    locale: LocaleCode;
    limit?: number;
}) : Promise<PlacesSearchResponse> {
    const uniqueTerms = Array.from(new Set(
        params.searchTerms
            .map((term) => String(term || '').trim())
            .filter(Boolean)
    )).slice(0, 8);

    if (uniqueTerms.length === 0) {
        return {
            premiumResults: [],
            googleResults: [],
            combinedResults: [],
            fallbackMessage: 'No search terms were available for this request.'
        };
    }

    const requestedLimit = Number.isFinite(Number(params.limit)) ? Math.max(1, Math.min(20, Number(params.limit))) : 5;
    const premiumResults = (await searchManagedPlaceProfiles(uniqueTerms, requestedLimit))
        .map((place) => ({ ...place, source: 'premium' as const }));

    const googleResultsRaw = await searchGooglePlacesByTerms({
        searchTerms: uniqueTerms,
        userLocation: params.userLocation || null,
        radiusMeters: Number.isFinite(Number(params.radiusMeters)) ? Math.max(1000, Number(params.radiusMeters)) : 5000,
        locale: params.locale
    });
    const hydratedGoogle = await hydratePlacesWithProfileData(googleResultsRaw);
    const googleResults = hydratedGoogle.map((place) => ({ ...place, source: 'google' as const })) as PlacesResult[];

    const combinedMap = new Map<string, PlacesResult>();
    [...premiumResults, ...googleResults].forEach((place) => {
        const key = buildSearchKey(place);
        if (!combinedMap.has(key)) {
            combinedMap.set(key, place);
        }
    });

    const combinedResults = rankPlaces(
        Array.from(combinedMap.values()),
        params.userLocation || null,
        uniqueTerms
    ).slice(0, requestedLimit);

    return {
        premiumResults: rankPlaces(premiumResults as PlacesResult[], params.userLocation || null, uniqueTerms).slice(0, requestedLimit),
        googleResults: rankPlaces(googleResults, params.userLocation || null, uniqueTerms).slice(0, requestedLimit),
        combinedResults,
        fallbackMessage: combinedResults.length === 0 ? 'No nearby matches found yet. Try broadening the area or refining the request.' : null
    };
}
