import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext'; // Import the context hook
import { Button } from '@/components/ui/button';
import { ThemeToggle } from "@/components/theme-toggle"; // Import ThemeToggle

export default function Layout({ children }) {
  const { user, isAdmin, logout, loading } = useAuthContext(); // Use context

  // Optional: Add a loading state for the header if needed
  // if (loading) {
  //   return <div>Loading Application...</div>; // Or a spinner in the header
  // }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold">
              HomeServer
            </Link>
            {user && (
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Dashboard
              </Link>
            )}
            {user && isAdmin && (
              <Link href="/admin/users" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                User Management
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm">Welcome, {user.username}!</span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              !loading && (
                <Link href="/login">
                  <Button variant="outline" size="sm">Login</Button>
                </Link>
              )
            )}
            <ThemeToggle /> {/* Add ThemeToggle button */}
          </div>
        </nav>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-6">
        {children}
      </main>
      <footer className="border-t">
        <div className="container mx-auto py-4 px-4 md:px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} HomeServer Project
        </div>
      </footer>
    </div>
  );
} 
