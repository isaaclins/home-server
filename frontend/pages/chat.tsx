import React, { useContext, useEffect, useState, useRef } from 'react';
import withAuth from '../src/components/withAuth';
import { AuthContext } from '../src/context/AuthContext';

interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const ChatPage: React.FC = () => {
  const { token } = useContext(AuthContext);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch chat sessions for user
  const loadSessions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ollama/sessions`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // auto-select first session if none selected
        if (!selectedSession && data.length > 0) {
          setSelectedSession(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch messages for selected session
  const loadMessages = async (sess: ChatSession) => {
    if (!sess) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ollama/sessions/${sess.id}/messages`, {
        headers,
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSession?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const body: any = {
      model: 'tinyllama',
      prompt: input,
    };
    if (selectedSession) {
      body.sessionId = selectedSession.id;
    }

    // Add user message immediately
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    } as ChatMessage;
    setMessages((msgs) => [...msgs, tempUserMsg]);
    setInput('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ollama/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      // New session might be created, reload sessions afterwards
      if (!selectedSession) {
        await loadSessions();
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantContent = '';
      // placeholder assistant message
      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      } as ChatMessage;
      setMessages((msgs) => [...msgs, assistantMsg]);

      const processChunk = (chunk: string) => {
        // SSE lines start with "data: "
        chunk.split('\n').forEach((line) => {
          if (line.startsWith('data:')) {
            const data = line.replace(/^data:\s*/, '');
            assistantContent += data;
            assistantMsg.content = assistantContent;
            setMessages((msgs) => msgs.map((m) => (m.id === assistantMsg.id ? { ...assistantMsg } : m)));
          }
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          processChunk(chunk);
        }
        if (done) break;
      }

      // after stream ends reload messages for session (possibly updated)
      if (selectedSession) {
        await loadMessages(selectedSession);
      } else {
        // ensure we have new session selected after sending first message
        await loadSessions();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: 250, borderRight: '1px solid #ccc', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #ccc' }}>
          <button onClick={() => setSelectedSession(null)} style={{ width: '100%' }}>
            + New Chat
          </button>
        </div>
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelectedSession(s)}
            style={{
              padding: 12,
              cursor: 'pointer',
              backgroundColor: selectedSession?.id === s.id ? '#eee' : undefined,
            }}
          >
            {s.title}
          </div>
        ))}
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #ccc' }}>
          <textarea
            style={{ width: '100%', height: 80 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ marginTop: 8 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default withAuth(ChatPage); 
