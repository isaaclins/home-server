import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'sonner';
import dynamic from 'next/dynamic'; // Import dynamic for client-side only components

// Dynamically import the TerminalComponent to ensure it only runs client-side
const TerminalComponent = dynamic(() => import('@/components/admin/TerminalComponent'), {
  ssr: false,
  loading: () => <p>Loading Terminal...</p> // Optional loading state
});

export default function AdminTerminalPage() {
  console.log("AdminTerminalPage component rendering..."); // Add this log
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
    <div className="h-screen w-screen bg-black text-white p-1">
      <h1 className="text-center text-sm mb-1">Admin Web Terminal</h1>
      {/* Pass necessary props like token and socket URL */}
      <TerminalComponent /> 
    </div>
  );
} 
