import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="p-8 bg-white shadow-lg rounded-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to the Dashboard!</h1>
        <p className="text-lg mb-2">Hello, <span className="font-semibold">{user.username}</span>!</p>
        <p className="text-md mb-6">Your admin status is: <span className="font-semibold">{user.isAdmin ? 'Administrator' : 'User'}</span>.</p>
        <Button onClick={handleLogout} variant="destructive">
          Logout
        </Button>
      </div>
    </div>
  );
} 
