import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useAuthContext } from '@/context/AuthContext';
import { getAuthToken } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

// Assuming handleApiResponse and API_BASE_URL are defined elsewhere or passed in.
// For simplicity here, we redefine a basic version.
// const API_BASE_URL = 'http://localhost:3001/api'; // Old URL
const API_BASE_URL = 'http://localhost:3002/api';

// Re-use the timestamp formatter from dashboard
const formatLogTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} @ ${hours}:${minutes}:${seconds}`;
};

// Simplified API handler for this page - includes logout logic
async function handleLogsApiResponse(response, logoutCallback) {
  if (!response.ok) {
    let errorData;
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      errorData = await response.json();
      errorMessage = errorData?.message || errorMessage;
    } catch (e) {
      errorData = { message: response.statusText };
      errorMessage = response.statusText || errorMessage;
    }
    console.error("API Error:", errorMessage, "Full response:", errorData);
    if ((response.status === 401 || response.status === 403) && logoutCallback) {
      console.warn("JWT validation error fetching logs. Logging out.");
      logoutCallback();
      throw new Error("Session expired or invalid. Please log in again.");
    }
    throw new Error(errorMessage);
  }
  // Only expect JSON array for logs
  return response.json(); 
}

const fetchAllLogsAPI = async (logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/logs`, { // Assumes GET /api/logs endpoint
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleLogsApiResponse(response, logoutCallback);
  } catch (error) {
    console.error("fetchAllLogsAPI error:", error);
    if (error.message !== "Session expired or invalid. Please log in again.") {
       toast.error(error.message || "Failed to load logs.");
    }
    throw error;
  }
};

export default function LogsPage() {
  const { user, isAdmin, loading: authLoading, logout } = useAuthContext();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const loadLogs = useCallback(() => {
    setIsLoadingLogs(true);
    fetchAllLogsAPI(logout)
      .then(data => {
        // Check if data is an array before sorting
        if (Array.isArray(data)) {
          const sortedData = data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setLogs(sortedData);
        } else {
           console.warn("Received non-array data from logs API:", data);
           toast.info("No logs available to display."); // Inform user appropriately
           setLogs([]); // Ensure logs state is an empty array
        }
      })
      .catch(error => {
        // Error toast is handled in fetchAllLogsAPI or by logout
        console.error("Failed to load logs:", error);
        setLogs([]); // Clear logs on error
      })
      .finally(() => {
        setIsLoadingLogs(false);
      });
  }, [logout]);

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
        return;
    }
    if (!authLoading && user && !isAdmin) {
        toast.error("Access Denied: You do not have permission to view this page.");
        router.push('/dashboard'); // Redirect non-admins back to dashboard
        return;
    }
    if (!authLoading && isAdmin) {
      loadLogs();
    }
  }, [authLoading, user, isAdmin, router, loadLogs]);

  if (authLoading || (!isAdmin && !authLoading && user)) { // Show loading if auth is loading OR if user is loaded but not admin (before redirect kicks in)
    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
             <Skeleton className="h-8 w-32 mb-6" /> 
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48 mb-2" /> 
                    <Skeleton className="h-4 w-64" /> 
                </CardHeader>
                <CardContent className="space-y-2">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                </CardContent>
             </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <Link href="/dashboard" passHref>
        <Button variant="outline" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Full Activity Logs</CardTitle>
          <CardDescription>Complete history of recorded system and user activities.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] md:h-[70vh] border rounded-md p-4">
                <div className="text-xs space-y-1 font-mono">
                {isLoadingLogs ? (
                    <p className="text-gray-500 italic">Loading logs...</p>
                ) : logs.length === 0 ? (
                    <p className="text-gray-500 italic">No logs found.</p>
                ) : (
                    logs.map((logEntry, index) => (
                        <div key={logEntry.id || index}> {/* Use a unique ID from backend if available */} 
                            {formatLogTimestamp(logEntry.timestamp)} {logEntry.username} &gt; {logEntry.method} {logEntry.path}
                        </div>
                    ))
                )}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 
