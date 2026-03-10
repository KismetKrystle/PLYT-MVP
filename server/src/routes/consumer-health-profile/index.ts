import express from 'express';
import axios from 'axios';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { createProfile, deleteProfile, getProfile, updateProfile } from '../profileCrud';

const router = express.Router();

router.get('/location-suggestions/search', authenticateToken, async (req: AuthRequest, res) => {
    const query = String(req.query.q || '').trim();
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

