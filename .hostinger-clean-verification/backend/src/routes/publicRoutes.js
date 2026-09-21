import express from 'express';
import { createGroupSubmission, getFooterCatalog, getGroupLikeStatus, getPublicCategories, getPublicGroupById, getPublicGroups, getPublicStats, getSitemap, getSubmissionCategories, registerGroupAccess, registerGroupLike } from '../controllers/publicController.js';
import { createRateLimiter, validateNumericId } from '../middlewares/securityMiddleware.js';

const router = express.Router();
const submissionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Limite de envios atingido. Tente novamente mais tarde.',
});
const accessLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Muitos acessos registrados. Aguarde um momento.',
});
const likeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Muitas solicitações de curtida. Aguarde um momento.',
});

router.param('id', validateNumericId);
router.get('/sitemap.xml', getSitemap);
router.get('/groups', getPublicGroups);
router.get('/groups/:id', getPublicGroupById);
router.get('/categories', getPublicCategories);
router.get('/submission-categories', getSubmissionCategories);
router.get('/footer-catalog', getFooterCatalog);
router.get('/stats', getPublicStats);
router.post('/groups/:id/access', accessLimiter, registerGroupAccess);
router.get('/groups/:id/like-status', getGroupLikeStatus);
router.post('/groups/:id/like', likeLimiter, registerGroupLike);
router.post('/group-submissions', submissionLimiter, createGroupSubmission);

export default router;
