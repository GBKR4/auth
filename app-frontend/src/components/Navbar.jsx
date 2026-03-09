import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">AuthApp</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Dashboard
                </Link>
                <Link to="/profile" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Profile
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin/users" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                    Users
                  </Link>
                )}
                <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
                  <span className="text-sm text-gray-500">
                    {user?.username}
                    {user?.role === 'admin' && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">admin</span>
                    )}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
