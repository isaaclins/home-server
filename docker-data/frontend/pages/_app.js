import '../styles/globals.css';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '@/context/AuthContext';

// Global error handler for fetch and WebSocket JWT errors
function useGlobalJwtErrorHandler() {
  const { logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // --- FETCH WRAPPER ---
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        // Try to parse error message if 401/403
        if (response.status === 401 || response.status === 403) {
          let errorMsg = '';
          try {
            const data = await response.clone().json();
            errorMsg = data?.message || data?.error || '';
          } catch (e) {
            try {
              errorMsg = await response.clone().text();
            } catch {}
          }
          if (
            errorMsg.toLowerCase().includes('jwt') ||
            errorMsg.toLowerCase().includes('token') ||
            errorMsg.toLowerCase().includes('unauthorized') ||
            errorMsg.toLowerCase().includes('expired') ||
            errorMsg.toLowerCase().includes('invalid')
          ) {
            logout();
            throw new Error('Session expired or invalid. Please log in again.');
          }
        }
        return response;
      };
    }

    // --- SOCKET.IO/WEBSOCKET PATCH (for xterm, etc) ---
    const origSocketIo = window.io;
    if (origSocketIo) {
      window.io = function (...args) {
        const socket = origSocketIo(...args);
        socket.on('connect_error', (err) => {
          if (
            err?.message?.toLowerCase().includes('jwt') ||
            err?.message?.toLowerCase().includes('token') ||
            err?.message?.toLowerCase().includes('unauthorized') ||
            err?.message?.toLowerCase().includes('expired') ||
            err?.message?.toLowerCase().includes('invalid')
          ) {
            logout();
          }
        });
        return socket;
      };
    }

    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined' && window.fetch && window.fetch._isWrapped) {
        window.fetch = window.fetch._originalFetch;
      }
      if (window.io && window.io._isWrapped) {
        window.io = window.io._originalIo;
      }
    };
  }, [logout, router]);
}

// New component to ensure context is available
function GlobalJwtErrorHandler() {
  useGlobalJwtErrorHandler();
  return null;
}

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <GlobalJwtErrorHandler />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <Layout>
          <Toaster richColors position="top-right" />
          <Component {...pageProps} />
        </Layout>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default MyApp; 
