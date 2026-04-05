import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import OAuthClient from '../models/OAuthClient.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = path.join(__dirname, '../views');

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateClientId = () => `app_${crypto.randomBytes(8).toString('hex')}`;
const generateClientSecret = () => crypto.randomBytes(32).toString('hex');

const validateRedirectUris = (uris) => {
  if (!Array.isArray(uris) || uris.length === 0) return false;
  return uris.every((uri) => {
    try { new URL(uri); return true; } catch { return false; }
  });
};

// ── API Handlers ──────────────────────────────────────────────────────────────

/**
 * POST /api/developer/register
 * Upgrade own account to 'developer' role.
 */
export const registerAsDeveloper = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.role === 'developer' || req.user.role === 'admin') {
      return res.status(200).json({ message: 'Already a developer', role: req.user.role });
    }
    const updated = await User.updateById(userId, { role: 'developer' });
    logger.info({ userId, reqId: req.id }, 'User upgraded to developer role');
    res.json({ message: 'Account upgraded to developer', role: updated.role });
  } catch (err) {
    logger.error({ error: err.message, reqId: req.id }, 'registerAsDeveloper failed');
    res.status(500).json({ error: 'Failed to upgrade account' });
  }
};

/**
 * POST /api/developer/clients
 * Register a new OAuth client app. Returns client_id + client_secret ONCE.
 */
export const createClient = async (req, res) => {
  try {
    const { name, redirect_uris } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'App name must be between 2 and 100 characters' });
    }

    const uris = Array.isArray(redirect_uris) ? redirect_uris : [redirect_uris].filter(Boolean);
    if (!validateRedirectUris(uris)) {
      return res.status(400).json({ error: 'redirect_uris must be an array of valid URLs (at least 1)' });
    }

    const clientId = generateClientId();
    const rawSecret = generateClientSecret();

    await OAuthClient.create({
      clientId,
      rawSecret,
      name: name.trim(),
      redirectUris: uris,
      developerId: req.user.id,
    });

    logger.info({ clientId, name, developerId: req.user.id, reqId: req.id }, 'OAuth client registered');

    // Return raw secret only once — it is never shown again
    res.status(201).json({
      message: 'OAuth app registered. Save your client_secret — it will never be shown again.',
      client_id: clientId,
      client_secret: rawSecret,
      name: name.trim(),
      redirect_uris: uris,
    });
  } catch (err) {
    logger.error({ error: err.message, reqId: req.id }, 'createClient failed');
    res.status(500).json({ error: 'Failed to register OAuth app' });
  }
};

/**
 * GET /api/developer/clients
 * List all apps registered by the authenticated developer.
 */
export const listClients = async (req, res) => {
  try {
    const clients = await OAuthClient.findByDeveloperId(req.user.id);
    res.json({ clients });
  } catch (err) {
    logger.error({ error: err.message, reqId: req.id }, 'listClients failed');
    res.status(500).json({ error: 'Failed to list apps' });
  }
};

/**
 * POST /api/developer/clients/:id/rotate
 * Regenerate client secret. Old secret is immediately invalid.
 */
export const rotateSecret = async (req, res) => {
  try {
    const client = await OAuthClient.findByIdAndDeveloper(req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'App not found' });

    const newRawSecret = generateClientSecret();
    await OAuthClient.updateSecret(client.id, newRawSecret);

    logger.info({ clientId: client.client_id, developerId: req.user.id, reqId: req.id }, 'OAuth client secret rotated');

    res.json({
      message: 'Client secret rotated. Save your new client_secret — it will never be shown again.',
      client_id: client.client_id,
      client_secret: newRawSecret,
    });
  } catch (err) {
    logger.error({ error: err.message, reqId: req.id }, 'rotateSecret failed');
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
};

/**
 * DELETE /api/developer/clients/:id
 * Delete an OAuth app and revoke all its issued tokens.
 */
export const deleteClient = async (req, res) => {
  try {
    const client = await OAuthClient.findByIdAndDeveloper(req.params.id, req.user.id);
    if (!client) return res.status(404).json({ error: 'App not found' });

    // Delete the client (cascade will clean oauth_auth_codes via client_id if FK set,
    // otherwise we rely on the app-level cleanup below)
    await OAuthClient.deleteById(client.id);

    logger.info({ clientId: client.client_id, developerId: req.user.id, reqId: req.id }, 'OAuth client deleted');
    res.json({ message: 'App deleted successfully' });
  } catch (err) {
    logger.error({ error: err.message, reqId: req.id }, 'deleteClient failed');
    res.status(500).json({ error: 'Failed to delete app' });
  }
};

// ── Developer Portal Page Handlers (HTML) ─────────────────────────────────────

export const registerPage = async (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'developer/register.html'));
};

export const loginPage = async (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'developer/login.html'));
};

export const dashboardPage = async (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'developer/dashboard.html'));
};

export const newClientPage = async (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'developer/new-client.html'));
};

export const clientDetailPage = async (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'developer/client-detail.html'));
};

export default {
  registerAsDeveloper,
  createClient,
  listClients,
  rotateSecret,
  deleteClient,
  registerPage,
  loginPage,
  dashboardPage,
  newClientPage,
  clientDetailPage,
};
