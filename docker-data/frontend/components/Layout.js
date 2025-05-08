import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext'; // Import the context hook
import { Button } from '@/components/ui/button';

export default function Layout({ children }) {
  const { user, isAdmin, logout, loading } = useAuthContext(); // Use context

  // Optional: Add a loading state for the header if needed
  // if (loading) {
  //   return <div>Loading Application...</div>; // Or a spinner in the header
  // }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4 shadow-md">
        <nav className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold hover:text-gray-300">
              HomeServer
            </Link>
            <Link href="/dashboard" className="hover:text-gray-300">
              Dashboard
            </Link>
            {/* Use isAdmin from context */}
            {isAdmin && (
              <Link href="/admin/users" className="hover:text-gray-300">
                User Management
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Use user and logout from context */}
            {user ? (
              <>
                <span className="text-sm">Welcome, {user.username}!</span>
                <Button variant="outline" size="sm" onClick={logout} className="text-white border-white hover:bg-gray-700">
                  Logout
                </Button>
              </>
            ) : (
              // Show login only if not loading auth state
              !loading && (
                <Link href="/login" className="hover:text-gray-300">
                  Login
                </Link>
              )
            )}
          </div>
        </nav>
      </header>
      <main className="flex-grow container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-200 text-center p-4 text-sm text-gray-700">
        © {new Date().getFullYear()} HomeServer Project
      </footer>
    </div>
  );
} 
