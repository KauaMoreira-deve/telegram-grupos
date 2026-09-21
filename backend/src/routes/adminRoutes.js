import express from 'express';
import { approveGroupSubmission, createCategory, createGroup, createUser, deleteCategory, deleteGroup, deleteUser, getCategories, getDashboardStats, getGroup, getGroupCategories, getGroups, getGroupSubmissions, getUsers, rejectGroupSubmission, syncGroupMembers, updateCategory, updateGroup, updateOwnProfile, updateUser } from '../controllers/adminController.js';
import { requireAuth, requireSuperAdmin } from '../middlewares/authMiddleware.js';
import { noStore, validateNumericId } from '../middlewares/securityMiddleware.js';

const router = express.Router();

router.param('id', validateNumericId);
router.use(noStore, requireAuth);
router.get('/session', (req, res) => res.json({ usuario: req.admin }));
router.put('/profile', updateOwnProfile);
router.get('/stats', getDashboardStats);
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.get('/groups/:id/categories', getGroupCategories);
router.get('/groups/:id', getGroup);
router.put('/groups/:id', updateGroup);
router.post('/groups/:id/sync-members', syncGroupMembers);
router.delete('/groups/:id', deleteGroup);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/users', requireSuperAdmin, getUsers);
router.post('/users', requireSuperAdmin, createUser);
router.put('/users/:id', requireSuperAdmin, updateUser);
router.delete('/users/:id', requireSuperAdmin, deleteUser);
router.get('/group-submissions', getGroupSubmissions);
router.post('/group-submissions/:id/approve', approveGroupSubmission);
router.post('/group-submissions/:id/reject', rejectGroupSubmission);

export default router;
