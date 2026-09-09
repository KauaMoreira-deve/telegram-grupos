import express from 'express';
import { getDashboardStats, getGroups, getCategories, getUsers } from '../controllers/adminController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/groups', getGroups);
router.get('/categories', getCategories);
router.get('/users', getUsers);

export default router;
