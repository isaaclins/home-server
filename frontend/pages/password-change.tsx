import { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../src/context/AuthContext';

export default function PasswordChange() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const res = await fetch(`${apiBase}/api/auth/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (res.ok) {
      setMessage('Password changed, please login again');
      router.push('/login');
    } else {
      const text = await res.text();
      setMessage(`Error: ${text}`);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="p-8 rounded shadow-md w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center">Change Password</h1>
        {message && <p className="text-sm text-red-500">{message}</p>}
        <input
          type="password"
          className="w-full border p-2"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full border p-2"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">
          Change
        </button>
      </form>
    </div>
  );
} 
