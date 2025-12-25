import { Router } from 'express';
import { handleSearch } from '../controllers/search.controller';

const router = Router();

// GET /api/search?q=...&limit=10
router.get('/', handleSearch);

export default router;



