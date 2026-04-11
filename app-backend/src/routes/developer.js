// Developer Portal — HTML page routes only (no auth required — pages do their
// own client-side auth check and redirect to /developer/login if needed).
// Mounted at /developer in app.js.
// API routes are in developer-api.js, mounted at /api/developer.
import { Router } from 'express';
import * as developerController from '../controllers/developerController.js';

const router = Router();

router.get('/register',     developerController.registerPage);
router.get('/login',        developerController.loginPage);
router.get('/',             developerController.dashboardPage);
router.get('/new',          developerController.newClientPage);
router.get('/clients/:id',  developerController.clientDetailPage);

export default router;
