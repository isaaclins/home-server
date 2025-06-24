import React, { useContext, useEffect, useState } from 'react';
import withAuth from '../../src/components/withAuth';
import { AuthContext } from '../../src/context/AuthContext';

interface User {
  id: number;
  username: string;
  enabled: boolean;
  mustChangePwd: boolean;
  roles: string[];
}

const UsersPage: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleEnabled = async (user: User) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${user.id}/enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !user.enabled }),
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const createUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }
      setNewUsername('');
      setNewPassword('');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      {/* Create user */}
      <div className="mb-6">
        <h2 className="text-xl mb-2">Create User</h2>
        <input
          type="text"
          placeholder="Username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          className="border p-2 mr-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={createUser} className="bg-blue-500 text-white px-4 py-2">
          Create
        </button>
      </div>

      {/* List users */}
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border">Username</th>
            <th className="py-2 px-4 border">Enabled</th>
            <th className="py-2 px-4 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="py-2 px-4 border">{u.username}</td>
              <td className="py-2 px-4 border">{u.enabled ? 'Yes' : 'No'}</td>
              <td className="py-2 px-4 border">
                <button
                  onClick={() => toggleEnabled(u)}
                  className={`px-3 py-1 ${u.enabled ? 'bg-red-500' : 'bg-green-500'} text-white`}
                >
                  {u.enabled ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default withAuth(UsersPage); 
