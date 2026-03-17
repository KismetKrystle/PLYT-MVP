import express from 'express';
import axios from 'axios';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { createProfile, deleteProfile, getProfile, updateProfile } from '../profileCrud';

const router = express.Router();

function extractAddressCity(result: any) {
    const components = Array.isArray(result?.address_components) ? result.address_components : [];
    const findComponent = (types: string[]) =>
        components.find((component: any) => types.some((type) => component.types?.includes(type)));

    return (
        findComponent(['locality'])?.long_name ||
        findComponent(['administrative_area_level_2'])?.long_name ||
        findComponent(['administrative_area_level_1'])?.long_name ||
        ''
    );
}

router.get('/location-suggestions/search', authenticateToken, async (req: AuthRequest, res) => {
    const query = String(req.query.q || '').trim();
    const country = String(req.query.country || '').trim().toUpperCase();
    const fallbackSuggestion = {
        placeId: '',
        description: query,
        primaryText: query,
        secondaryText: 'Use exactly what you typed'
    };

    if (query.length < 2) {
        res.json({ suggestions: [], enriched: false });
        return;
    }

    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
        res.json({
            suggestions: [fallbackSuggestion],
            enriched: false,
            providerStatus: 'MISSING_KEY'
        });
        return;
    }

    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
            params: {
                input: query,
                types: 'geocode',
                ...(country ? { components: `country:${country}` } : {}),
                key
            }
        });

        const providerStatus = String(response.data?.status || 'UNKNOWN');
        const predictions = Array.isArray(response.data?.predictions) ? response.data.predictions : [];
        const googleSuggestions = predictions.slice(0, 6).map((prediction: any) => ({
            placeId: prediction.place_id || '',
            description: prediction.description || '',
            primaryText: prediction.structured_formatting?.main_text || prediction.description || '',
            secondaryText: prediction.structured_formatting?.secondary_text || ''
        }));

        const hasFallbackAlready = googleSuggestions.some((item: { description: string }) => item.description === fallbackSuggestion.description);
        const suggestions = hasFallbackAlready
            ? googleSuggestions
            : [fallbackSuggestion, ...googleSuggestions];

        res.json({
            suggestions,
            enriched: providerStatus === 'OK',
            providerStatus
        });
    } catch (error: any) {
        res.json({
            suggestions: [fallbackSuggestion],
            enriched: false,
            providerStatus: 'REQUEST_FAILED',
            error: 'Failed to fetch location suggestions',
            details: error.message
        });
    }
});

router.get('/location-suggestions/reverse-geocode', authenticateToken, async (req: AuthRequest, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({ error: 'Valid lat and lng are required' });
        return;
    }

    const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
        res.json({
            enriched: false,
            providerStatus: 'MISSING_KEY',
            address: '',
            city: ''
        });
        return;
    }

    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                latlng: `${lat},${lng}`,
                key
            }
        });

        const providerStatus = String(response.data?.status || 'UNKNOWN');
        const first = Array.isArray(response.data?.results) ? response.data.results[0] : null;

        res.json({
            enriched: providerStatus === 'OK' && !!first,
            providerStatus,
            address: first?.formatted_address || '',
            city: extractAddressCity(first)
        });
    } catch (error: any) {
        res.json({
            enriched: false,
            providerStatus: 'REQUEST_FAILED',
            address: '',
            city: '',
            error: 'Failed to reverse geocode location',
            details: error.message
        });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    await createProfile(req, res, 'consumer_profiles');
});

router.get('/:userId', authenticateToken, async (req: AuthRequest, res) => {
    await getProfile(req, res, 'consumer_profiles');
});

router.put('/:userId', authenticateToken, async (req: AuthRequest, res) => {
    await updateProfile(req, res, 'consumer_profiles');
});

router.delete('/:userId', authenticateToken, async (req: AuthRequest, res) => {
    await deleteProfile(req, res, 'consumer_profiles');
});

export default router;

