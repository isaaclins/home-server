import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserTable from "@/components/admin/UserTable";
import UserForm from "@/components/admin/UserForm";
import DeleteUserDialog from "@/components/admin/DeleteUserDialog";
import { getUserFromToken, getAuthToken, removeAuthToken } from '@/lib/auth';
import { useAuthContext } from '@/context/AuthContext';
import { Activity, Terminal, Users, Power, Play, StopCircle, RefreshCcw, ExternalLink, FileText } from 'lucide-react';
import io from 'socket.io-client';

// Actual useAuth Hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromToken();
    setUser(userData);
    setLoading(false);
    if (!userData) {
      toast.error("You are not logged in or your session has expired. Please login.");
    } else if (!userData.isAdmin) {
      toast.error("You do not have administrative privileges.");
    }
  }, []);

  return { user, isAdmin: user?.isAdmin || false, loading };
};

// Mock API functions - replace with your actual API calls
const API_BASE_URL = 'http://localhost:3002/api'; // Ensure this matches your backend port

async function handleApiResponse(response, logoutCallback) {
  if (!response.ok) {
    let errorData;
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      errorData = await response.json();
      errorMessage = errorData?.message || errorMessage; // Use message from JSON if available
    } catch (e) {
      // If response is not JSON, use status text
      errorData = { message: response.statusText };
      errorMessage = response.statusText || errorMessage;
    }
    console.error("API Error:", errorMessage, "Full response:", errorData);

    // Check for JWT/Auth errors (e.g., 401 Unauthorized, 403 Forbidden)
    if ((response.status === 401 || response.status === 403) && logoutCallback) {
        console.warn("JWT validation error detected. Logging out.");
        logoutCallback(); 
        throw new Error("Session expired or invalid. Please log in again."); 
    }

    throw new Error(errorMessage); 
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return { success: true }; 
  }
  try {
    return response.json(); 
  } catch (e) {
    return { success: true, data: await response.text() }; 
  }
}

const fetchUsers = async (logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleApiResponse(response, logoutCallback);
  } catch (error) {
    console.error("fetchUsers error:", error);
    if (error.message !== "Session expired or invalid. Please log in again.") {
    }
    throw error; 
  }
};

const createUserAPI = async (userData, logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    return handleApiResponse(response, logoutCallback);
  } catch (error) {
    console.error("createUserAPI error:", error);
    if (error.message !== "Session expired or invalid. Please log in again.") {
        toast.error(error.message || "Failed to create user.");
    }
    throw error;
  }
};

const updateUserAPI = async (userId, userData, logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    return handleApiResponse(response, logoutCallback);
  } catch (error) {
    console.error("updateUserAPI error:", error);
     if (error.message !== "Session expired or invalid. Please log in again.") {
        toast.error(error.message || "Failed to update user.");
    }
    throw error;
  }
};

const deleteUserAPI = async (userId, logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleApiResponse(response, logoutCallback);
  } catch (error) {
    console.error("deleteUserAPI error:", error);
     if (error.message !== "Session expired or invalid. Please log in again.") {
        toast.error(error.message || "Failed to delete user.");
    }
    throw error;
  }
};

// --- Ollama Service API Calls ---
const fetchOllamaServiceStatusAPI = async (logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`${API_BASE_URL}/ollama/service/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleApiResponse(response, logoutCallback);
};

const startOllamaServiceAPI = async (logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`${API_BASE_URL}/ollama/service/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleApiResponse(response, logoutCallback);
};

const stopOllamaServiceAPI = async (logoutCallback) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`${API_BASE_URL}/ollama/service/stop`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleApiResponse(response, logoutCallback);
};

const MAX_RECENT_LOGS = 20; // Max number of logs to display in recent activity

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

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading, logout } = useAuthContext();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  const [ollamaStatus, setOllamaStatus] = useState('UNKNOWN');
  const [isOllamaServiceBusy, setIsOllamaServiceBusy] = useState(false);

  const [recentLogs, setRecentLogs] = useState([]); // State for real-time logs
  const socketRef = useRef(null); // Ref to store the socket instance

  const userManagementRef = useRef(null);

  const loadUsers = useCallback(() => {
    setIsLoadingUsers(true);
    fetchUsers(logout).then(data => {
      setUsers(data);
    }).catch(error => {
      if (error.message !== "Session expired or invalid. Please log in again.") {
          console.error("Failed to fetch users:", error);
          toast.error(error.message || "Failed to load users. See console for details.");
      }
    }).finally(() => {
      setIsLoadingUsers(false);
    });
  }, [logout]);

  const fetchOllamaStatus = useCallback(async (showToast = false) => {
    if (!isAdmin) return;
    setIsOllamaServiceBusy(true);
    try {
      const data = await fetchOllamaServiceStatusAPI(logout);
      setOllamaStatus(data.status || 'ERROR_FETCHING');
      if (showToast) toast.success(data.message || "Ollama status updated.");
    } catch (error) {
       if (error.message !== "Session expired or invalid. Please log in again.") {
         setOllamaStatus('ERROR_FETCHING');
         if (showToast) toast.error(error.message || "Failed to get Ollama service status.");
       }
    }
    setIsOllamaServiceBusy(false);
  }, [isAdmin, logout]);

  useEffect(() => {
    // Add logging here
    console.log('Dashboard useEffect - Auth Loading:', authLoading, 'User:', user, 'IsAdmin:', isAdmin);

    if (!authLoading && !user) {
        router.push('/login');
        return;
    }
    if (!authLoading && user && !isAdmin) {
        toast.error("Access Denied: You do not have administrative privileges.");
        router.push('/');
        return;
    }

    if (!authLoading && isAdmin) {
      // Add log here too
      console.log('Dashboard useEffect - Admin access confirmed, loading data...');
      loadUsers();
      fetchOllamaStatus();

      // Initialize WebSocket connection if admin
      // Assuming WebSocket server is at the same base URL as API, but with ws://
      // And on the same port as the backend (3001 typically for this project)
      // const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws'); // OLD: Connects to ws://host:port/api
      // Corrected: Connect directly to the root path where Socket.IO server listens
      const wsRootUrl = API_BASE_URL.substring(0, API_BASE_URL.indexOf('/api')); // Extracts http://host:port
      const wsUrl = wsRootUrl.replace(/^http/, 'ws'); // Converts to ws://host:port
      
      socketRef.current = io(wsUrl, { // Use wsUrl instead of wsBaseUrl
          // Add auth token if your WebSocket server requires it
          // query: { token: getAuthToken() } 
          // Ensure your WebSocket server handles authentication for 'new_log'
      });
      
      socketRef.current.on('connect', () => {
        console.log('Connected to WebSocket server for logs.');
        toast.success("Live activity log connected.", { duration: 2000});
      });

      socketRef.current.on('new_log', (logEntry) => {
        // logEntry expected: { timestamp: number, username: string, method: string, path: string }
        console.log("Received new log:", logEntry);
        setRecentLogs(prevLogs => {
          const newLog = `${formatLogTimestamp(logEntry.timestamp)} ${logEntry.username} > ${logEntry.method} ${logEntry.path}`;
          const updatedLogs = [newLog, ...prevLogs];
          return updatedLogs.slice(0, MAX_RECENT_LOGS);
        });
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from WebSocket server for logs.');
        toast.error("Live activity log disconnected.", { duration: 2000 });
      });
      
      socketRef.current.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err);
        toast.error(`Log connection error: ${err.message}`, { duration: 3000 });
      });

      // Cleanup on component unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [authLoading, user, isAdmin, loadUsers, fetchOllamaStatus, router, logout]); // Added logout to deps

  const handleStartOllama = async () => {
    setIsOllamaServiceBusy(true);
    try {
      const response = await startOllamaServiceAPI(logout);
      toast.success(response.message || "Ollama service start initiated.");
      setOllamaStatus('STARTING_OR_ERROR');
      setTimeout(() => fetchOllamaStatus(true), 3000);
    } catch (error) {
       if (error.message !== "Session expired or invalid. Please log in again.") {
           toast.error(error.message || "Failed to start Ollama service.");
           fetchOllamaStatus();
       }
    }
  };

  const handleStopOllama = async () => {
    setIsOllamaServiceBusy(true);
    try {
      const response = await stopOllamaServiceAPI(logout);
      toast.success(response.message || "Ollama service stop initiated.");
      setOllamaStatus('STOPPED');
      setTimeout(() => fetchOllamaStatus(true), 3000);
    } catch (error) {
       if (error.message !== "Session expired or invalid. Please log in again.") {
           toast.error(error.message || "Failed to stop Ollama service.");
           fetchOllamaStatus();
       }
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading session...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleOpenCreateUserForm = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleOpenEditUserForm = (userToEdit) => {
    setEditingUser(userToEdit);
    setIsUserFormOpen(true);
  };

  const handleUserFormSubmit = async (userData) => {
    const action = editingUser ? 'update' : 'create';
    const apiCall = editingUser
      ? updateUserAPI(editingUser._id, userData, logout)
      : createUserAPI(userData, logout);

    try {
      const result = await apiCall;
      toast.success(`User ${action}d successfully!`);
      setIsUserFormOpen(false);
      loadUsers();
    } catch (error) {
       console.error(`Failed to ${action} user:`, error);
       if (error.message === "Session expired or invalid. Please log in again.") {
            setIsUserFormOpen(false);
       }
    }
  };

  const handleOpenDeleteDialog = (userToDelete) => {
    setDeletingUser(userToDelete);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      await deleteUserAPI(deletingUser._id, logout);
      toast.success(`User ${deletingUser.username} deleted successfully.`);
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
       if (error.message === "Session expired or invalid. Please log in again.") {
            setIsDeleteDialogOpen(false);
            setDeletingUser(null);
       }
    }
  };

  const scrollToUserManagement = () => {
    userManagementRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStatusColor = (status) => {
    if (status === 'RUNNING') return 'border-green-500';
    if (status === 'STOPPED' || status === 'ERROR_FETCHING' || status === 'UNKNOWN') return 'border-red-500';
    return 'border-yellow-500';
  };
  const getStatusTextColor = (status) => {
    if (status === 'RUNNING') return 'text-green-600';
    if (status === 'STOPPED' || status === 'ERROR_FETCHING' || status === 'UNKNOWN') return 'text-red-600';
    return 'text-yellow-600';
  };

  // Log isAdmin value on every render
  console.log("--- Dashboard Render ---");
  console.log("Auth Loading:", authLoading);
  console.log("User:", user);
  console.log("IsAdmin:", isAdmin);
  console.log("----------------------");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><ExternalLink className="mr-2 h-5 w-5" /> Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ollama-chat" passHref><Button variant="link" className="p-0 h-auto justify-start">Ollama Service (Chat)</Button></Link>
            {isAdmin && ( // Only show Full Logs link to admins
              <Link href="/admin/logs" passHref>
                <Button variant="link" className="p-0 h-auto justify-start flex items-center">
                  <FileText className="mr-2 h-4 w-4" /> Full Activity Logs
                </Button>
              </Link>
            )}
            <Button variant="link" className="p-0 h-auto justify-start text-muted-foreground cursor-not-allowed">File Service (Soon)</Button>
            <Button variant="link" className="p-0 h-auto justify-start text-muted-foreground cursor-not-allowed">PaaS Service (Soon)</Button>
          </CardContent>
        </Card>

        {/* Center: Welcome & Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user?.username || 'Admin'}!</CardTitle>
            <CardDescription>Manage your Home Server.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={scrollToUserManagement} variant="outline" className="w-full justify-start"><Users className="mr-2 h-4 w-4"/> Manage Users</Button>
            {isAdmin ? (
                <Link href="/admin/terminal" passHref>
                    <Button variant="outline" className="w-full justify-start"><Terminal className="mr-2 h-4 w-4" /> Web Terminal</Button>
                </Link>
            ) : (
                 <Button variant="outline" className="w-full justify-start text-muted-foreground cursor-not-allowed" disabled><Terminal className="mr-2 h-4 w-4" /> Web Terminal (Admin Only)</Button>
            )}
          </CardContent>
        </Card>

        {/* Right: Service Status & Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Power className="mr-2 h-5 w-5" /> Service Control</CardTitle>
            <Button onClick={() => fetchOllamaStatus(true)} variant="ghost" size="icon" className="absolute top-4 right-4" disabled={isOllamaServiceBusy}><RefreshCcw className={`h-4 w-4 ${isOllamaServiceBusy ? 'animate-spin' : ''}`} /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ollama AI Service</p>
                <p className={`text-xs ${getStatusTextColor(ollamaStatus)}`}>{ollamaStatus.replace('_',' ')}</p>
              </div>
              <div className="flex space-x-1">
                <Button onClick={handleStartOllama} disabled={isOllamaServiceBusy || ollamaStatus === 'RUNNING' || ollamaStatus === 'STARTING_OR_ERROR'} size="icon" variant="ghost"><Play className="h-5 w-5 text-green-600" /></Button>
                <Button onClick={handleStopOllama} disabled={isOllamaServiceBusy || ollamaStatus === 'STOPPED' || ollamaStatus === 'UNKNOWN' || ollamaStatus === 'ERROR_FETCHING'} size="icon" variant="ghost"><StopCircle className="h-5 w-5 text-red-600" /></Button>
              </div>
            </div>
             <div className="flex items-center justify-between opacity-50">
              <div><p className="font-medium">File Service</p><p className="text-xs text-muted-foreground">UNKNOWN</p></div>
              <div className="flex space-x-1"><Button size="icon" variant="ghost" disabled><Play className="h-5 w-5" /></Button><Button size="icon" variant="ghost" disabled><StopCircle className="h-5 w-5" /></Button></div>
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div><p className="font-medium">PaaS Service</p><p className="text-xs text-muted-foreground">UNKNOWN</p></div>
              <div className="flex space-x-1"><Button size="icon" variant="ghost" disabled><Play className="h-5 w-5" /></Button><Button size="icon" variant="ghost" disabled><StopCircle className="h-5 w-5" /></Button></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity Logs */}
        <Card className="lg:col-span-2 h-[300px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5" /> Activity Logs</CardTitle>
            <CardDescription>Recent system and user activities (real-time).</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto text-xs space-y-1 font-mono">
            {recentLogs.length === 0 && (
              <p className="text-muted-foreground italic">No activity yet. Waiting for real-time updates...</p>
            )}
            {recentLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </CardContent>
        </Card>

        {/* Right: Service Status Cards (2x2 Grid) */}
         <div className="grid grid-cols-2 grid-rows-2 gap-4">
          <Card className={`flex flex-col items-center justify-center p-4 border-2 ${getStatusColor(ollamaStatus)}`}>
            <Power className={`h-8 w-8 mb-2 ${getStatusTextColor(ollamaStatus)}`} />
            <p className="font-semibold text-sm">Ollama</p>
            <p className={`text-xs ${getStatusTextColor(ollamaStatus)}`}>{ollamaStatus.replace('_',' ')}</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 border-2 border-gray-300 opacity-60">
            <Power className="h-8 w-8 mb-2 text-muted-foreground" />
            <p className="font-semibold text-sm">File Service</p>
            <p className="text-xs text-muted-foreground">UNKNOWN</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 border-2 border-red-500 opacity-60">
            <Power className="h-8 w-8 mb-2 text-red-500" />
            <p className="font-semibold text-sm">PaaS</p>
            <p className="text-xs text-red-500">STOPPED</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 border-2 border-red-500 opacity-60">
            <Power className="h-8 w-8 mb-2 text-red-500" />
            <p className="font-semibold text-sm">TBD</p>
            <p className="text-xs text-red-500">UNKNOWN</p>
          </Card>
        </div>
      </div>

      {/* User Management Section (existing card) */}
      <div ref={userManagementRef}>
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Create, view, edit, and delete user accounts.</CardDescription>
              </div>
              <Button onClick={handleOpenCreateUserForm}><Users className="mr-2 h-4 w-4" />Add New User</Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <p>Loading users...</p>
            ) : (
              <UserTable 
                users={users} 
                onEditUser={handleOpenEditUserForm} 
                onDeleteUser={handleOpenDeleteDialog} 
              />
            )}
          </CardContent>
        </Card>
      </div>

      <UserForm
        key={editingUser ? editingUser._id : 'create'} 
        open={isUserFormOpen}
        onOpenChange={setIsUserFormOpen}
        onSubmit={handleUserFormSubmit}
        initialData={editingUser}
      />

      <DeleteUserDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDeleteUser}
        userName={deletingUser?.username}
      />
    </div>
  );
} 
