import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserTable from "@/components/admin/UserTable";
import UserForm from "@/components/admin/UserForm";
import DeleteUserDialog from "@/components/admin/DeleteUserDialog";

// Mock auth hook - replace with your actual auth logic
// const useAuth = () => {
//   // IMPORTANT: Replace this with your actual authentication logic.
//   // This should check a session, token, etc., and determine if the user is an admin.
//   // For example, using NextAuth.js:
//   // import { useSession } from "next-auth/react";
//   // const { data: session, status } = useSession();
//   // const isAdmin = session?.user?.role === 'admin';
//   // const loading = status === 'loading';
//   const [isAdmin, setIsAdmin] = useState(false); // Default to false, auth should determine
//   const [loading, setLoading] = useState(true); // Default to true until auth check completes
  
//   // useEffect(() => {
//   //   // Simulate async auth check
//   //   setTimeout(() => {
//   //     // Replace with actual check
//   //     // For now, we can toggle this for testing admin/non-admin views
//   //     setIsAdmin(true); // or false
//   //     setLoading(false);
//   //   }, 1000);
//   // }, []);

//   return { isAdmin, loading };
// };

// KEEPING MOCK FOR NOW TO ENSURE PAGE WORKS, but highlighting it needs replacement
const useAuth = () => {
  const [isAdmin, setIsAdmin] = useState(true); // Placeholder: REMOVE AND REPLACE
  const [loading, setLoading] = useState(false); // Placeholder: REMOVE AND REPLACE
  useEffect(() => {
    toast.warning("Authentication is mocked. Replace useAuth hook with actual logic.", { duration: 10000 });
  },[])
  return { isAdmin, loading };
};

// Mock API functions - replace with your actual API calls
const API_BASE_URL = '/api'; // Example, adjust to your actual API base path

const fetchUsers = async () => {
  try {
    // const response = await fetch(`${API_BASE_URL}/users`);
    // if (!response.ok) throw new Error('Failed to fetch users');
    // return await response.json();
    // Mocking a successful response for now:
    console.log("Mock API: Fetching users...");
    return new Promise(resolve => setTimeout(() => resolve([
      { id: '1', username: 'admin_user', email: 'admin@example.com', isAdmin: true, createdAt: new Date().toISOString() },
      { id: '2', username: 'normal_user', email: 'user@example.com', isAdmin: false, createdAt: new Date().toISOString() },
    ]), 100));
  } catch (error) {
    console.error("fetchUsers error:", error);
    throw error; // Re-throw to be caught by caller
  }
};

const createUserAPI = async (userData) => {
  try {
    // const response = await fetch(`${API_BASE_URL}/users`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(userData),
    // });
    // if (!response.ok) {
    //   const errorData = await response.json().catch(() => ({ message: 'Failed to create user' }));
    //   throw new Error(errorData.message || 'Failed to create user');
    // }
    // return await response.json();
    console.log("Mock API: Creating user:", userData);
    return new Promise(resolve => setTimeout(() => resolve({ ...userData, id: Date.now().toString(), createdAt: new Date().toISOString() }), 500));
  } catch (error) {
    console.error("createUserAPI error:", error);
    throw error;
  }
};

const updateUserAPI = async (userId, userData) => {
  try {
    // const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(userData),
    // });
    // if (!response.ok) {
    //   const errorData = await response.json().catch(() => ({ message: 'Failed to update user' }));
    //   throw new Error(errorData.message || 'Failed to update user');
    // }
    // return await response.json();
    console.log(`Mock API: Updating user ${userId}:`, userData);
    return new Promise(resolve => setTimeout(() => resolve({ id: userId, ...userData }), 500));
  } catch (error) {
    console.error("updateUserAPI error:", error);
    throw error;
  }
};

const deleteUserAPI = async (userId) => {
  try {
    // const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    //   method: 'DELETE',
    // });
    // if (!response.ok) {
    //   const errorData = await response.json().catch(() => ({ message: 'Failed to delete user' }));
    //   throw new Error(errorData.message || 'Failed to delete user');
    // }
    // return { id: userId }; // Or whatever your API returns on successful delete
    console.log(`Mock API: Deleting user ${userId}`);
    return new Promise(resolve => setTimeout(() => resolve({ id: userId }), 500));
  } catch (error) {
    console.error("deleteUserAPI error:", error);
    throw error;
  }
};


export default function UserManagementPage() {
  const { isAdmin, loading: authLoading } = useAuth();
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
