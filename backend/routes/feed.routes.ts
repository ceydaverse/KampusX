import { Router } from 'express';
import { getTrendingFeed } from '../controllers/feed.controller';

const router = Router();

router.get('/trending', getTrendingFeed);

export default router;
