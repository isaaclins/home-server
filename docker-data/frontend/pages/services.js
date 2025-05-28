# This is a placeholder for the file's content as we are renaming it.
# The actual content will be added in the next step when modifying services.js.
import DashboardShell from "@/components/DashboardShell";
import SystemStats from "@/components/SystemStats";
import ResourceChart from "@/components/ResourceChart";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Activity, HardDrive, Wifi, MessageCircle, GitBranch, Terminal, Settings, LogOut, FileText, ShieldCheck } from "lucide-react"; // Added more icons
import Link from "next/link";
import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { getAuthToken } from '@/lib/auth';

const API_BASE_URL = "http://localhost:3002/api";

// Define services and their required roles/admin status
// This could also come from a config file or API in a larger app
const ALL_SERVICES = [
  {
    id: 'ollama-chat',
    title: 'Ollama Chat',
    description: 'Local AI chat interface powered by Ollama.',
    href: '/ollama-chat',
    icon: MessageCircle,
    rolesRequired: ['_ollama_user'], // Example role
    adminRequired: false,
  },
  {
    id: 'gitea-repos',
    title: 'Git Repositories',
    description: 'Self-hosted Git repositories via Gitea.',
    href: '/gitea-repos',
    icon: GitBranch,
    rolesRequired: [], // Accessible to all authenticated users
    adminRequired: false,
  },
  {
    id: 'web-terminal',
    title: 'Web Terminal',
    description: 'Browser-based terminal access.',
    href: '/admin/terminal',
    icon: Terminal,
    rolesRequired: ['_web_terminal_user'], // Example role for terminal
    adminRequired: true, // Or specific role
  },
  {
    id: 'activity-logs',
    title: 'Activity Logs',
    description: 'View system and user activity logs.',
    href: '/admin/logs',
    icon: FileText,
    rolesRequired: [],
    adminRequired: true,
  },
  // Add other services here, e.g., System Management, User Management (if they become separate pages)
  // {
  //   id: 'system-stats',
  //   title: 'System Statistics',
  //   description: 'Monitor server resource usage.',
  //   href: '/admin/system-stats', // Assuming you might move stats to its own page for admins
  //   icon: Activity,
  //   adminRequired: true,
  // },
];

export default function ServicesPage() {
  const [stats, setStats] = useState(null);
  const { user, isAdmin, loading: authLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/services');
    }
  }, [user, authLoading, router]);

  // Fetch system stats (optional, could be admin-only or removed from this page)
  useEffect(() => {
    if (user && isAdmin) { // Only fetch for admin, for example
      const fetchStats = async () => {
        try {
          const token = getAuthToken();
          if (!token) return;
          const res = await fetch(`${API_BASE_URL}/system/stats`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              router.replace('/login?redirect=/services&error=session_expired');
            }
            return;
          }
          const data = await res.json();
          setStats(data);
        } catch (error) {
          console.error("Error fetching system stats:", error);
        }
      };
      fetchStats();
      const interval = setInterval(fetchStats, 5000); // Reduced frequency for stats
      return () => clearInterval(interval);
    }
  }, [user, isAdmin, router]);

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading services...</p>
      </div>
    );
  }

  const canAccessService = (service) => {
    if (service.adminRequired && !isAdmin) return false;
    if (service.rolesRequired && service.rolesRequired.length > 0) {
      const userRoles = user.roles || [];
      return service.rolesRequired.some(role => userRoles.includes(role));
    }
    // If no specific roles required and not admin-only, general authenticated users can access
    // (unless adminRequired was true and handled above)
    return true; 
  };

  const accessibleServices = ALL_SERVICES.filter(canAccessService);

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Services</h1>
        {/* Optional: Add a settings or profile button here if desired */}
      </div>

      {accessibleServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleServices.map((service) => (
            <Card key={service.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <service.icon className="h-6 w-6 text-primary" />
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                </div>
                {/* Optional: Add a status indicator here if applicable */}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                <Link href={service.href} passHref legacyBehavior>
                  <Button variant="outline" className="w-full">Go to {service.title}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">No Services Available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You currently do not have access to any services, or no services are configured.
          </p>
        </div>
      )}

      {/* System Stats for Admin Users (Optional) */}
      {isAdmin && stats && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">System Statistics (Admin View)</h2>
          <SystemStats /> {/* Assuming SystemStats component displays the cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
            <ResourceChart title="CPU Usage" data={stats.cpu} color="#3b82f6" />
            <ResourceChart title="Memory Usage" data={stats.memory} color="#10b981" />
            <ResourceChart title="Network Activity" data={stats.network} color="#8b5cf6" />
            <ResourceChart title="Storage Usage" data={stats.storage} color="#f97316" />
          </div>
        </div>
      )}
    </DashboardShell>
  );
} 
