import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Cookies were set by the server during the OAuth callback.
    // AuthContext will automatically fetch /user/profile on mount.
    navigate('/dashboard', { replace: true });
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Completing sign-in…" />
    </div>
  );
}
