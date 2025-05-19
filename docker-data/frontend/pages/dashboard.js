import DashboardShell from "@/components/DashboardShell";
import SystemStats from "@/components/SystemStats";
import ResourceChart from "@/components/ResourceChart";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, Activity, HardDrive, Wifi, MessageCircle, GitBranch, Terminal } from "lucide-react";
import Link from "next/link";

const API_BASE_URL = "http://localhost:3002/api";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch(`${API_BASE_URL}/system/stats`);
      const data = await res.json();
      setStats(data);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardShell>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      {/* Stat cards */}
      <SystemStats />
      {/* Resource charts */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
          <ResourceChart title="CPU Usage" data={stats.cpu} color="#3b82f6" />
          <ResourceChart title="Memory Usage" data={stats.memory} color="#10b981" />
          <ResourceChart title="Network Activity" data={stats.network} color="#8b5cf6" />
          <ResourceChart title="Storage Usage" data={stats.storage} color="#f97316" />
        </div>
      )}
      {/* Active Services */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Active Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /><CardTitle className="text-base">Ollama Chat</CardTitle></div>
              <span className="inline-block rounded-full bg-green-500/20 text-green-600 text-xs px-2 py-0.5">Online</span>
            </CardHeader>
            <CardContent>
              <div className="text-sm mb-3 text-muted-foreground">Local AI chat interface powered by Ollama.</div>
              <Link href="/ollama-chat" passHref legacyBehavior>
                <Button variant="outline" className="w-full">Go to Chat</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" /><CardTitle className="text-base">Git Repositories</CardTitle></div>
              <span className="inline-block rounded-full bg-green-500/20 text-green-600 text-xs px-2 py-0.5">Online</span>
            </CardHeader>
            <CardContent>
              <div className="text-sm mb-3 text-muted-foreground">Self-hosted Git repositories accessed via Gitea.</div>
              <Link href="/gitea-repos" passHref legacyBehavior>
                <Button variant="outline" className="w-full">View Repos</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2"><Terminal className="h-5 w-5 text-primary" /><CardTitle className="text-base">Web Terminal</CardTitle></div>
              <span className="inline-block rounded-full bg-yellow-500/20 text-yellow-700 text-xs px-2 py-0.5">Warning</span>
            </CardHeader>
            <CardContent>
              <div className="text-sm mb-3 text-muted-foreground">Browser-based terminal access (admin only).</div>
              <Link href="/admin/terminal" passHref legacyBehavior>
                <Button variant="outline" className="w-full">Open Terminal</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
} 
