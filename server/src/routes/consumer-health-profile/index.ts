import express from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { createProfile, deleteProfile, getProfile, updateProfile } from '../profileCrud';

const router = express.Router();

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

