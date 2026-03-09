import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as userApi from '../api/user.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const PASSWORD_HINT =
  'Min 8 chars, one uppercase, one lowercase, one number, one special character (@$!%*?&)';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // ── Profile edit state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ first_name: '', last_name: '' });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // ── Password change state ─────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  // ── Delete account state ──────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load profile on mount
  useEffect(() => {
    userApi
      .getProfile()
      .then(({ data }) => {
        setProfile({ first_name: data.first_name || '', last_name: data.last_name || '' });
      })
      .catch(() => {
        setProfile({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
      })
      .finally(() => setProfileLoading(false));
  }, []);

  // ── Profile submit ────────────────────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const { data } = await userApi.updateProfile(profile);
      updateUser(data);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Password submit ───────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(pwForm.newPassword)) {
      setPwMsg({ type: 'error', text: PASSWORD_HINT });
      return;
    }

    setPwLoading(true);
    try {
      await userApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setPwMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password',
      });
    } finally {
      setPwLoading(false);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await userApi.deleteAccount();
      await logout();
      navigate('/login');
    } catch (err) {
      setShowDeleteConfirm(false);
      setDeleteLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile…" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>

      {/* ── Profile Info ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>

        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Username</p>
            <p className="text-sm font-medium text-gray-800">{user?.username}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Role</p>
            <p className="text-sm font-medium text-gray-800 capitalize">{user?.role}</p>
          </div>
        </div>

        {profileMsg.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            profileMsg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                placeholder="John"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Doe"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {profileSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </section>

      {/* ── Change Password ───────────────────────────────────────────────── */}
      <section id="change-password" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

        {pwMsg.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            pwMsg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {pwMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">{PASSWORD_HINT}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Deleting your account is permanent and cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-medium text-red-700 mb-3">
              Are you absolutely sure? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
