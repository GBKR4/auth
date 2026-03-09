import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as authApi from '../api/auth.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(({ data }) => {
        setMessage(data.message || 'Email verified successfully. You can now log in.');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(
          err.response?.data?.error ||
            'Verification failed. The link may have expired.'
        );
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {status === 'loading' && (
            <>
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-500">Verifying your email…</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <div className="space-y-2">
                <ResendVerification />
                <Link to="/login" className="block text-sm text-blue-600 hover:underline mt-2">
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResendVerification() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleResend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      await authApi.resendVerification(email);
      setSent(true);
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <p className="text-sm text-green-600">Verification email sent! Check your inbox.</p>;
  }

  return (
    <form onSubmit={handleResend} className="flex flex-col gap-2">
      <p className="text-sm text-gray-500 mb-1">Resend verification email:</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="your@email.com"
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={loading}
        className="py-2 px-4 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Sending…' : 'Resend Email'}
      </button>
    </form>
  );
}
