import { Router } from 'express';
import { handleGetCategories } from '../controllers/categories.controller';

const router = Router();

router.get('/', handleGetCategories);

export default router;

