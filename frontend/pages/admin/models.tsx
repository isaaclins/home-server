import React, { useContext, useEffect, useState } from 'react';
import withAuth from '../../src/components/withAuth';
import { AuthContext } from '../../src/context/AuthContext';

interface OllamaModel {
  name: string;
  size?: number;
  modified?: string;
}

const ModelsPage: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [remoteModel, setRemoteModel] = useState('');
  const [loading, setLoading] = useState(false);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const loadModels = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ollama/models`, {
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        // Ollama returns { models: [...] }
        setModels(json.models || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pullModel = async () => {
    if (!remoteModel.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ollama/models/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ name: remoteModel.trim() }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      alert('Pull initiated');
      setRemoteModel('');
      await loadModels();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteModel = async (name: string) => {
    if (!confirm(`Delete model ${name}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ollama/models/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      await loadModels();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Model Manager</h1>

      {/* Pull model */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="model:tag"
          value={remoteModel}
          onChange={(e) => setRemoteModel(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={pullModel} disabled={loading} className="bg-blue-500 text-white px-4 py-2">
          Pull
        </button>
      </div>

      {/* List installed models */}
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border">Name</th>
            <th className="py-2 px-4 border">Size</th>
            <th className="py-2 px-4 border">Modified</th>
            <th className="py-2 px-4 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.name} className="border-t">
              <td className="py-2 px-4 border">{m.name}</td>
              <td className="py-2 px-4 border">{m.size ?? '-'}</td>
              <td className="py-2 px-4 border">{m.modified ?? '-'}</td>
              <td className="py-2 px-4 border">
                <button onClick={() => deleteModel(m.name)} className="bg-red-500 text-white px-3 py-1">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default withAuth(ModelsPage); 
