import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function GoogleCallbackPage() {
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // Guard against double-run in strict mode
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userRaw      = params.get('user');

    if (!accessToken || !refreshToken || !userRaw) {
      navigate('/login?error=auth_failed', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      loginWithTokens(accessToken, refreshToken, user);
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Completing sign-in…" />
    </div>
  );
}
