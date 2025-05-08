import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserTable from "@/components/admin/UserTable";
import UserForm from "@/components/admin/UserForm";
import DeleteUserDialog from "@/components/admin/DeleteUserDialog";
import { getUserFromToken, getAuthToken } from '@/lib/auth'; // Import the auth utility and getAuthToken

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
  return response.json();
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


export default function UserManagementPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null for create, user object for edit

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null); // user object to delete

  const loadUsers = () => {
    setIsLoading(true);
    fetchUsers().then(data => {
      setUsers(data);
    }).catch(error => {
      console.error("Failed to fetch users:", error);
      toast.error(error.message || "Failed to load users. See console for details.");
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

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

  const handleOpenEditUserForm = (user) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleUserFormSubmit = async (userData) => {
    const action = editingUser ? 'update' : 'create';
    const successMessage = editingUser ? "User updated successfully!" : "User created successfully!";
    const optimisticUser = editingUser ? { ...editingUser, ...userData } : { ...userData, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() };

    // Optimistic UI update (optional, but good for UX)
    if (editingUser) {
      setUsers(prevUsers => prevUsers.map(u => u.id === editingUser.id ? optimisticUser : u));
    } else {
      setUsers(prevUsers => [optimisticUser, ...prevUsers]);
    }
    setIsUserFormOpen(false); 

    try {
      if (editingUser) {
        await updateUserAPI(editingUser.id, userData);
      } else {
        await createUserAPI(userData);
      }
      toast.success(successMessage);
      loadUsers(); // Refresh user list from server
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(error.message || `Failed to ${action} user. Changes reverted.`);
      loadUsers(); // Revert optimistic update by reloading from server
    }
  };

  const handleOpenDeleteDialog = (user) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;

    const userIdToDelete = deletingUser.id;
    // Optimistic UI update
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userIdToDelete));
    setIsDeleteDialogOpen(false);
    setDeletingUser(null);

    try {
      await deleteUserAPI(userIdToDelete);
      toast.success("User deleted successfully!");
      // loadUsers(); // Data already reflect change due to optimistic update, 
                     // but you might want to call loadUsers() if backend generates new state or for consistency
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error(error.message || "Failed to delete user. Restoring user list.");
      loadUsers(); // Revert optimistic update
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 md:px-0">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Create, view, edit, and delete user accounts.</CardDescription>
            </div>
            <Button onClick={handleOpenCreateUserForm}>Add New User</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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

      <UserForm
        key={editingUser ? editingUser.id : 'create'} // Force re-render and state reset in form
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
