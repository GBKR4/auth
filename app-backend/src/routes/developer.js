import { Router } from 'express';
import * as developerController from '../controllers/developerController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// ── API Routes (JSON) ─────────────────────────────────────────────────────────
// Upgrade own account to developer role
router.post('/register', authenticateToken, developerController.registerAsDeveloper);

// CRUD for OAuth client apps (developer or admin only)
router.post('/clients', authenticateToken, requireRole('developer', 'admin'), developerController.createClient);
router.get('/clients', authenticateToken, requireRole('developer', 'admin'), developerController.listClients);
router.post('/clients/:id/rotate', authenticateToken, requireRole('developer', 'admin'), developerController.rotateSecret);
router.delete('/clients/:id', authenticateToken, requireRole('developer', 'admin'), developerController.deleteClient);

// ── UI Routes (HTML pages) ────────────────────────────────────────────────────
router.get('/register', developerController.registerPage);
router.get('/login', developerController.loginPage);
router.get('/', developerController.dashboardPage);
router.get('/new', developerController.newClientPage);
router.get('/clients/:id', developerController.clientDetailPage);

export default router;
