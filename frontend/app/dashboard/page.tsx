"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Server, 
  Users, 
  UserPlus, 
  Key, 
  LogOut, 
  Activity,
  Clock,
  Copy,
  Check,
  Cpu,
  HardDrive,
  Wifi,
  MessageSquare,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";
import CreateUserModal from "./CreateUserModal";

interface UserInfo {
  id: number;
  username: string;
  email: string;
  admin: boolean;
  token: string;
  createdAt: string;
}

interface SystemMetrics {
  id: number;
  timestamp: string;
  cpuUsage: number;
  gpuUsage: number;
  ramUsed: number;
  ramTotal: number;
  networkBytesReceived: number;
  networkBytesSent: number;
}

interface RequestLog {
  id: number;
  timestamp: string;
  username: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [usersList, setUsersList] = useState<UserInfo[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics24h, setMetrics24h] = useState<SystemMetrics[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<SystemMetrics | null>(null);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);

  const loadMonitoringData = useCallback(async () => {
    if (!user?.token || !user?.admin) return;
    
    try {
      const response = await fetch('/api/monitoring/dashboard/data', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics24h(data.metrics24h || []);
        setLatestMetrics(data.latestMetrics);
        setRequestLogs(data.recentRequests || []);
      }
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    }
  }, [user?.token, user?.admin]);

  const refreshUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const res = await fetch(`${api}/api/users`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        const arr = await res.json();
        setUsersList(arr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        router.replace("/login");
        return;
      }
    }
  }, [router]);

  // Load monitoring data and users for admin users
  useEffect(() => {
    if (user?.admin) {
      loadMonitoringData();
      refreshUsers(); // Load users on page load for admin
      const interval = setInterval(loadMonitoringData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadMonitoringData, refreshUsers]);

  // handle countdown for invite
  useEffect(() => {
    if (!invite) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setInvite(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [invite]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
    window.location.href = "/login";
  };

  const generateInviteCode = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const res = await fetch(`${api}/api/admin/registration-codes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "changeme",
          "Authorization": `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        const j = await res.json();
        setInvite(j.code);
        setCountdown(60);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const copyInviteCode = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusCodeColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-500';
    if (statusCode >= 300 && statusCode < 400) return 'bg-blue-500';
    if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const prepareChartData = (metrics: SystemMetrics[]) => {
    return metrics.slice(-12).map(metric => ({
      timestamp: new Date(metric.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit' 
      }),
      cpu: metric.cpuUsage,
      gpu: metric.gpuUsage,
      ram: (metric.ramUsed / metric.ramTotal) * 100,
    }));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Server className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Home Server Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium">{user.username}</span>
                {user.admin && <Badge variant="secondary" className="ml-2">Admin</Badge>}
              </div>
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-8">
        {/* Available Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Available Services
            </CardTitle>
            <CardDescription>
              Access and manage your home server services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Ollama Chat Service */}
              <div className="group">
                <Button 
                  variant="outline" 
                  className="w-full justify-start p-4 h-auto hover:bg-accent transition-colors"
                  onClick={() => {
                    // TODO: Navigate to Ollama chat when implemented
                    console.log('Ollama chat service clicked - to be implemented');
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">Ollama Chat</div>
                        <div className="text-sm text-muted-foreground">AI-powered chat assistant</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Coming Soon
                      </Badge>
                      <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Button>
              </div>

              <Separator />
            </div>
          </CardContent>
        </Card>

        {/* System Metrics - Admin Only */}
        {user?.admin && latestMetrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.cpuUsage.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Real-time processing</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RAM Usage</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((latestMetrics.ramUsed / latestMetrics.ramTotal) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(latestMetrics.ramUsed)} / {formatBytes(latestMetrics.ramTotal)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Network</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div>↓ {formatBytes(latestMetrics.networkBytesReceived)}</div>
                    <div>↑ {formatBytes(latestMetrics.networkBytesSent)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">GPU Usage</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.gpuUsage.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Graphics processing</p>
                </CardContent>
              </Card>
            </div>

            {/* System Performance Charts */}
            {metrics24h.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>CPU Usage Trend</CardTitle>
                    <CardDescription>Last 12 data points</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={prepareChartData(metrics24h)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="cpu" stroke="#2563eb" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Memory Usage Trend</CardTitle>
                    <CardDescription>RAM utilization over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={prepareChartData(metrics24h)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="ram" stroke="#16a34a" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Request Logs */}
            {requestLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent API Requests</CardTitle>
                  <CardDescription>Latest HTTP requests to the server</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {requestLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center space-x-3">
                          <Badge className={`${getStatusCodeColor(log.statusCode)} text-white text-xs`}>
                            {log.statusCode}
                          </Badge>
                          <span className="font-mono text-sm">
                            [{new Date(log.timestamp).toLocaleTimeString()}] 
                            <span className="font-semibold mx-1">{log.username}</span>
                            {log.method} {log.endpoint}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{log.responseTimeMs}ms</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Admin Controls */}
        {user?.admin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Admin Controls
              </CardTitle>
              <CardDescription>
                Manage users and generate registration codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setShowModal(true)}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create New User
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={generateInviteCode}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Generate Registration Code
                </Button>
              </div>
              
              {invite && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Registration Code</p>
                      <code className="text-lg font-mono bg-background px-3 py-1 rounded border">
                        {invite}
                      </code>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyInviteCode}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {countdown}s
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        {user.admin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    Manage and view all registered users
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={refreshUsers}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users loaded. Click refresh to load users.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          {u.admin ? (
                            <Badge variant="secondary">Admin</Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {showModal && user && (
          <CreateUserModal
            onClose={() => {
              setShowModal(false);
              refreshUsers();
            }}
            token={user.token}
          />
        )}
      </div>
    </div>
  );
} 
