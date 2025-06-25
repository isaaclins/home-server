import React, { useContext, useEffect, useState } from 'react';
import withAuth from '../../src/components/withAuth';
import { AuthContext } from '../../src/context/AuthContext';

interface UsageRecord {
  id: number;
  userId: number;
  containers: number;
  ramMb: number;
  diskMb: number;
  bandwidthMb: number;
  ts: string;
}

const UsagePage: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setRecords(await res.json());
      } catch (e: any) {
        setError(e.message);
      }
    };
    fetchData();
  }, [token]);

  if (error) return <p>Error: {error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Resource Usage (Mock)</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border">User ID</th>
            <th className="py-2 px-4 border">Containers</th>
            <th className="py-2 px-4 border">RAM (MB)</th>
            <th className="py-2 px-4 border">Disk (MB)</th>
            <th className="py-2 px-4 border">Bandwidth (MB)</th>
            <th className="py-2 px-4 border">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2 px-4 border">{r.userId}</td>
              <td className="py-2 px-4 border">{r.containers}</td>
              <td className="py-2 px-4 border">{r.ramMb}</td>
              <td className="py-2 px-4 border">{r.diskMb}</td>
              <td className="py-2 px-4 border">{r.bandwidthMb}</td>
              <td className="py-2 px-4 border">{new Date(r.ts).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default withAuth(UsagePage); 
