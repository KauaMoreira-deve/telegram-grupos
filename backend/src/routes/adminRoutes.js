import express from 'express';
import { approveGroupSubmission, createCategory, createGroup, createUser, deleteCategory, deleteGroup, deleteUser, getCategories, getDashboardStats, getGroup, getGroupCategories, getGroups, getGroupSubmissions, getSiteSettings, getUsers, rejectGroupSubmission, syncGroupMembers, updateCategory, updateGroup, updateOwnProfile, updateSiteSettings, updateUser } from '../controllers/adminController.js';
import { requireAuth, requireSuperAdmin } from '../middlewares/authMiddleware.js';
import { noStore, validateNumericId } from '../middlewares/securityMiddleware.js';
import { invalidateCache } from '../utils/cache.js';

const router = express.Router();

router.param('id', validateNumericId);
router.use(noStore, requireAuth);
// Alterações feitas no painel limpam o cache das rotas públicas.
router.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => invalidateCache('public:'));
  next();
});
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
router.get('/site-settings', requireSuperAdmin, getSiteSettings);
router.put('/site-settings', requireSuperAdmin, updateSiteSettings);
router.get('/group-submissions', getGroupSubmissions);
router.post('/group-submissions/:id/approve', approveGroupSubmission);
router.post('/group-submissions/:id/reject', rejectGroupSubmission);

export default router;
