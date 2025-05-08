import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      router.push('/'); // Redirect to login if no token
      return;
    }

    try {
      // Decode token to get user info (basic example, no verification here)
      // In a real app, you might want to verify the token with the backend
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      setUser({ username: decodedToken.username, isAdmin: decodedToken.isAdmin });
    } catch (error) {
      console.error("Failed to decode token:", error);
      localStorage.removeItem('jwtToken');
      router.push('/');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setUser(null);
    router.push('/');
  };

  if (!user) {
    // This will be briefly shown while redirecting or if token decoding fails
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {/* Consider adding a Shadcn Spinner or Skeleton component here for better UX */}
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to the Dashboard!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">Hello, <span className="font-semibold">{user.username}</span>!</p>
          <p className="text-md">Your admin status is: <span className="font-semibold">{user.isAdmin ? 'Administrator' : 'User'}</span>.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
