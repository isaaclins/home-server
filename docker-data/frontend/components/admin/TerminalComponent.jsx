import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { AttachAddon } from 'xterm-addon-attach';
import { FitAddon } from 'xterm-addon-fit';
import io from 'socket.io-client';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'sonner';
import 'xterm/css/xterm.css'; // Import xterm CSS

// Define the WebSocket URL (should match backend)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api';
const wsRootUrl = API_BASE_URL.substring(0, API_BASE_URL.indexOf('/api'));
const wsUrl = wsRootUrl.replace(/^http/, 'ws');
const terminalSocketUrl = `${wsUrl}/terminal`;

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null); // To hold the xterm instance
  const fitAddonRef = useRef(null); // To hold the fit addon instance
  const socketRef = useRef(null); // To hold the socket instance
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const fitTerminal = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      try {
         fitAddonRef.current.fit();
         // Optionally inform the backend of the resize
         const dims = fitAddonRef.current.proposeDimensions();
         if (socketRef.current && socketRef.current.connected && dims) {
             socketRef.current.emit('terminal.resize', { cols: dims.cols, rows: dims.rows });
         }
      } catch (e) {
         console.error("Error fitting terminal:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) {
      // Don't initialize if ref is not ready or already initialized
      return;
    }

    console.log("Initializing xterm...");
    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'monospace',
      theme: {
        background: '#000000',
        foreground: '#FFFFFF',
        cursor: '#FFFFFF'
      }
    });
    xtermRef.current = term;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit(); // Initial fit

    console.log(`Attempting to connect WebSocket to ${terminalSocketUrl}`);
    const token = getAuthToken();
    if (!token) {
        setError('Authentication token not found. Cannot connect terminal.');
        toast.error('Authentication token not found.');
        term.write('\r\n\x1b[31mError: Authentication token not found.\x1b[0m\r\n');
        return; 
    }

    const socket = io(terminalSocketUrl, {
        auth: { token }, // Send token for backend verification
        reconnectionAttempts: 3, // Limit reconnection attempts
        timeout: 5000, // Connection timeout
    });
    socketRef.current = socket;

    const attachAddon = new AttachAddon(socket);
    term.loadAddon(attachAddon);

    socket.on('connect', () => {
        console.log('Terminal WebSocket connected.');
        setIsConnected(true);
        setError(null);
        toast.success('Terminal connected.', { duration: 2000 });
        term.write('\r\n\x1b[32mConnected to server terminal.\x1b[0m\r\n');
        // Fit again on connect and maybe inform backend
        fitTerminal();
    });

    socket.on('disconnect', (reason) => {
        console.log(`Terminal WebSocket disconnected: ${reason}`);
        setIsConnected(false);
        setError(`Disconnected: ${reason}`);
        toast.error(`Terminal disconnected: ${reason}`, { duration: 3000 });
        term.write(`\r\n\x1b[31mDisconnected: ${reason}\x1b[0m\r\n`);
    });

    socket.on('connect_error', (err) => {
        console.error('Terminal WebSocket connection error:', err.message);
        setError(`Connection Error: ${err.message}`);
        toast.error(`Terminal connection error: ${err.message}`);
        term.write(`\r\n\x1b[31mConnection Error: ${err.message}\x1b[0m\r\n`);
    });

    // Add resize listener
    window.addEventListener('resize', fitTerminal);

    // Focus the terminal
    term.focus();

    // Cleanup on component unmount
    return () => {
        console.log("Cleaning up terminal component...");
        window.removeEventListener('resize', fitTerminal);
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (xtermRef.current) {
            xtermRef.current.dispose();
            xtermRef.current = null;
        }
        fitAddonRef.current = null;
    };
  }, [fitTerminal]); // Add fitTerminal to dependency array

  return (
      <div 
          ref={terminalRef} 
          className="w-full h-[calc(100vh-40px)]" // Adjust height to leave space for title
          style={{ backgroundColor: '#000000' }} // Ensure background is black
      >
          {!isConnected && error && (
              <div className="text-red-500 p-2">Error: {error}</div>
          )}
      </div>
  );
};

export default TerminalComponent; 
