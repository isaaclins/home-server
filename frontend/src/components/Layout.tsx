import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const { token, setToken } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = () => {
    setToken(null);
    router.push('/login');
  };

  // Pages where we don't show the nav (e.g., public auth screens)
  const hideNavRoutes = ['/login', '/password-change'];

  const showNav = !hideNavRoutes.includes(router.pathname);

  return (
    <div>
      {showNav && (
        <nav className="bg-gray-800 text-white px-4 py-3 flex items-center space-x-4">
          {token && (
            <>
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <Link href="/chat" className="hover:underline">
                Chat
              </Link>
              <Link href="/admin/users" className="hover:underline">
                Admin
              </Link>
              <button onClick={handleLogout} className="ml-auto hover:underline">
                Logout
              </button>
            </>
          )}
          {!token && (
            <Link href="/login" className="ml-auto hover:underline">
              Login
            </Link>
          )}
        </nav>
      )}
      <main className="min-h-screen">{children}</main>
    </div>
  );
} 
