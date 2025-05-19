import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Terminal as TerminalIcon } from 'lucide-react';

// Dynamically import the TerminalComponent to ensure it only runs client-side
const TerminalComponent = dynamic(() => import('@/components/admin/TerminalComponent'), {
  ssr: false,
  loading: () => <p>Loading Terminal...</p> // Optional loading state
});

export default function AdminTerminalPage() {
  const { user, isAdmin, loading: authLoading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Authentication required.");
      router.push('/login?redirect=/admin/terminal');
      return;
    }
    if (!authLoading && user && !isAdmin) {
      toast.error("Access Denied: Administrator privileges required.");
      router.push('/dashboard'); // Redirect non-admins
      return;
    }
  }, [authLoading, user, isAdmin, router]);

  // Show loading state while authentication check is in progress or if user is not admin yet
  if (authLoading || !isAdmin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading or Verifying Access...</p>
      </div>
    );
  }

  // Render the terminal component only if user is authenticated and is an admin
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TerminalIcon className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Admin Web Terminal</CardTitle>
              <CardDescription>Run shell commands securely in your browser. Admins only.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-between">
              <Link href="/dashboard" passHref legacyBehavior>
                <Button variant="outline">&larr; Back to Dashboard</Button>
              </Link>
              <Button variant="destructive" onClick={logout}>Logout</Button>
            </div>
            <div className="rounded-lg overflow-hidden border border-muted bg-black" style={{ minHeight: 400 }}>
              <TerminalComponent />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
