import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from '@/context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading, logout } = useAuthContext();

  useEffect(() => {
    // If not loading and no user, redirect to login
    // This check is important if a user directly navigates to /dashboard
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show a loading state or a minimal message while checking auth / redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.32))] text-center p-4">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-md mb-4"></div>
          <div className="h-4 w-64 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome, {user.username}!</CardTitle>
          <CardDescription>
            This is your central hub for managing HomeServer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 border rounded-lg bg-card-foreground/5">
            <h3 className="text-xl font-semibold mb-2">Your Status</h3>
            <p className="text-muted-foreground">
              You are currently logged in as an <span className="font-medium text-primary">{isAdmin ? 'Administrator' : 'User'}</span>.
            </p>
          </div>
          
          {/* Placeholder for more dashboard widgets/cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Action 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Placeholder for a quick action or info.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">View Details</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Action 2</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Another placeholder for content.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">Learn More</Button>
              </CardFooter>
            </Card>
          </div>

        </CardContent>
        {/* The logout button is already in the main Layout header, so it might be redundant here. 
            However, keeping it for explicitness or if the header isn't always visible/used. */}
        <CardFooter className="flex justify-center border-t pt-6 mt-6">
          <Button onClick={logout} variant="destructive">
            Logout from Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
