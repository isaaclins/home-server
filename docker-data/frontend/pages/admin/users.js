import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserTable from "@/components/admin/UserTable";
import UserForm from "@/components/admin/UserForm";
import DeleteUserDialog from "@/components/admin/DeleteUserDialog";
import { getUserFromToken, getAuthToken } from '@/lib/auth';
import { Activity, Terminal, Users, Power, Play, StopCircle, RefreshCcw, ExternalLink } from 'lucide-react';

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
const API_BASE_URL = 'http://localhost:3001/api'; // Ensure this matches your backend port if run locally without Docker networking between services

async function handleApiResponse(response) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text
      errorData = { message: response.statusText };
    }
    const errorMessage = errorData?.message || `Request failed with status ${response.status}`;
    console.error("API Error:", errorMessage, "Full response:", errorData);
    throw new Error(errorMessage);
  }
  // If response has no content (e.g. 204 for DELETE), return a success indication
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return { success: true }; 
  }
  try {
    return response.json(); 
  } catch (e) {
    // If response.json() fails but response was ok and not empty (e.g. plain text response)
    return { success: true, data: await response.text() }; 
  }
}

const fetchUsers = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("fetchUsers error:", error);
    // toast.error(error.message || "Failed to load users."); // Toasting is done in loadUsers() function
    throw error;
  }
};

const createUserAPI = async (userData) => {
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
    return handleApiResponse(response);
  } catch (error) {
    console.error("createUserAPI error:", error);
    throw error;
  }
};

const updateUserAPI = async (userId, userData) => {
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
    return handleApiResponse(response);
  } catch (error) {
    console.error("updateUserAPI error:", error);
    throw error;
  }
};

const deleteUserAPI = async (userId) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found. Please login.");

  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("deleteUserAPI error:", error);
    throw error;
  }
};

// --- Ollama Service API Calls ---
const fetchOllamaServiceStatusAPI = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`${API_BASE_URL}/ollama/service/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleApiResponse(response);
};

const startOllamaServiceAPI = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`${API_BASE_URL}/ollama/service/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleApiResponse(response);
};

const stopOllamaServiceAPI = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  const response = await fetch(`${API_BASE_URL}/ollama/service/stop`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleApiResponse(response);
};

export default function AdminDashboardPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);

  // State for Ollama Service
  const [ollamaStatus, setOllamaStatus] = useState('UNKNOWN');
  const [isOllamaServiceBusy, setIsOllamaServiceBusy] = useState(false); // For button disabling

  const userManagementRef = useRef(null); // Ref for scrolling to User Management

  const loadUsers = useCallback(() => {
    setIsLoadingUsers(true);
    fetchUsers().then(data => {
      setUsers(data);
    }).catch(error => {
      console.error("Failed to fetch users:", error);
      toast.error(error.message || "Failed to load users. See console for details.");
    }).finally(() => {
      setIsLoadingUsers(false);
    });
  }, []);

  const fetchOllamaStatus = useCallback(async (showToast = false) => {
    if (!isAdmin) return;
    setIsOllamaServiceBusy(true);
    try {
      const data = await fetchOllamaServiceStatusAPI();
      setOllamaStatus(data.status || 'ERROR_FETCHING');
      if (showToast) toast.success(data.message || "Ollama status updated.");
    } catch (error) {
      setOllamaStatus('ERROR_FETCHING');
      if (showToast) toast.error(error.message || "Failed to get Ollama service status.");
    }
    setIsOllamaServiceBusy(false);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      fetchOllamaStatus();
      // Optional: Poll for Ollama status periodically
      // const intervalId = setInterval(fetchOllamaStatus, 10000); // every 10 seconds
      // return () => clearInterval(intervalId);
    }
  }, [isAdmin, loadUsers, fetchOllamaStatus]);

  const handleStartOllama = async () => {
    setIsOllamaServiceBusy(true);
    try {
      const response = await startOllamaServiceAPI();
      toast.success(response.message || "Ollama service start initiated.");
      setOllamaStatus('STARTING_OR_ERROR');
      setTimeout(() => fetchOllamaStatus(true), 3000);
    } catch (error) {
      toast.error(error.message || "Failed to start Ollama service.");
      fetchOllamaStatus();
    }
  };

  const handleStopOllama = async () => {
    setIsOllamaServiceBusy(true);
    try {
      const response = await stopOllamaServiceAPI();
      toast.success(response.message || "Ollama service stop initiated.");
      setOllamaStatus('STOPPED');
      setTimeout(() => fetchOllamaStatus(true), 3000);
    } catch (error) {
      toast.error(error.message || "Failed to stop Ollama service.");
      fetchOllamaStatus();
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
    const successMessage = editingUser ? "User updated successfully!" : "User created successfully!";
    setIsUserFormOpen(false); 
    try {
      if (editingUser) {
        await updateUserAPI(editingUser.id, userData);
      } else {
        await createUserAPI(userData);
      }
      toast.success(successMessage);
      loadUsers(); 
    } catch (error) {
      toast.error(error.message || `Failed to ${action} user.`);
      // loadUsers(); // Optionally reload on error too
    }
  };

  const handleOpenDeleteDialog = (userToDelete) => {
    setDeletingUser(userToDelete);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    const userIdToDelete = deletingUser.id;
    setIsDeleteDialogOpen(false);
    try {
      await deleteUserAPI(userIdToDelete);
      toast.success("User deleted successfully!");
      loadUsers(); 
    } catch (error) {
      toast.error(error.message || "Failed to delete user.");
    }
    setDeletingUser(null);
  };

  const scrollToUserManagement = () => {
    userManagementRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getStatusColor = (status) => {
    if (status === 'RUNNING') return 'border-green-500';
    if (status === 'STOPPED' || status === 'ERROR_FETCHING' || status === 'UNKNOWN') return 'border-red-500';
    return 'border-yellow-500'; // STARTING_OR_ERROR
  };
  const getStatusTextColor = (status) => {
    if (status === 'RUNNING') return 'text-green-600';
    if (status === 'STOPPED' || status === 'ERROR_FETCHING' || status === 'UNKNOWN') return 'text-red-600';
    return 'text-yellow-600';
  };

  // Placeholder log data
  const logs = [
    { time: '10/5/25 @ 02:38:13', user: 'exampleuser', action: '> POST /login' },
    { time: '10/5/25 @ 02:38:12', user: 'exampleuser', action: '> GET /login' },
    { time: '10/5/25 @ 02:38:12', user: 'exampleuser', action: '> GET /login' },
    { time: '10/5/25 @ 02:38:11', user: 'exampleuser', action: '> GET /login' },
    { time: '10/5/25 @ 02:38:11', user: 'exampleuser', action: '> GET /login' },
    { time: '10/5/25 @ 02:38:10', user: 'exampleuser', action: '> GET /login' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><ExternalLink className="mr-2 h-5 w-5" /> Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ollama-chat" passHref><Button variant="link" className="p-0 h-auto justify-start">Ollama Service (Chat)</Button></Link>
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
            <Button variant="outline" className="w-full justify-start text-muted-foreground cursor-not-allowed"><Terminal className="mr-2 h-4 w-4" /> Web Terminal (Soon)</Button>
          </CardContent>
        </Card>

        {/* Right: Service Status & Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Power className="mr-2 h-5 w-5" /> Service Control</CardTitle>
            <Button onClick={() => fetchOllamaStatus(true)} variant="ghost" size="icon" className="absolute top-4 right-4" disabled={isOllamaServiceBusy}><RefreshCcw className={`h-4 w-4 ${isOllamaServiceBusy ? 'animate-spin' : ''}`} /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Ollama Service */}
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
            {/* File Service (Placeholder) */}
             <div className="flex items-center justify-between opacity-50">
              <div><p className="font-medium">File Service</p><p className="text-xs text-gray-500">UNKNOWN</p></div>
              <div className="flex space-x-1"><Button size="icon" variant="ghost" disabled><Play className="h-5 w-5" /></Button><Button size="icon" variant="ghost" disabled><StopCircle className="h-5 w-5" /></Button></div>
            </div>
            {/* PaaS Service (Placeholder) */}
            <div className="flex items-center justify-between opacity-50">
              <div><p className="font-medium">PaaS Service</p><p className="text-xs text-gray-500">UNKNOWN</p></div>
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
            <CardDescription>Recent system and user activities.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto text-xs space-y-1 font-mono">
            {logs.map((log, index) => (
              <div key={index}>{log.time} {log.user} {log.action}</div>
            ))}
            {/* Real log data would be fetched here */}
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
            <Power className="h-8 w-8 mb-2 text-gray-400" />
            <p className="font-semibold text-sm">File Service</p>
            <p className="text-xs text-gray-400">UNKNOWN</p>
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
        key={editingUser ? editingUser.id : 'create'} 
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
