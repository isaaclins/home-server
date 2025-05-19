import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Cpu, Activity, HardDrive, Wifi } from "lucide-react";

const API_BASE_URL = "http://localhost:3002/api";

function formatStorage(bytes) {
  const TB = 1024 * 1024 * 1024 * 1024;
  const GB = 1024 * 1024 * 1024;
  if (bytes >= TB) return (bytes / TB).toFixed(2) + "TB";
  if (bytes >= GB) return (bytes / GB).toFixed(1) + "GB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

export default function SystemStats() {
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

  if (!stats) return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">Loading...</div>;

  const cpu = stats.cpu[stats.cpu.length - 1] || {};
  const mem = stats.memory[stats.memory.length - 1] || {};
  const storage = stats.storage[stats.storage.length - 1] || {};
  const net = stats.network[stats.network.length - 1] || {};

  return (
    <>
      <div className="mb-6 text-muted-foreground text-lg">Monitor and manage your home server services.</div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Load</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cpu.value ? cpu.value.toFixed(1) + "%" : "-"}</div>
            <p className="text-xs text-muted-foreground">
              {stats.meta?.cpu?.cores || "-"} cores{stats.meta?.cpu?.model ? ` @ ${stats.meta.cpu.model}` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mem.used && mem.total ? `${(mem.used / 1024 / 1024 / 1024).toFixed(1)}GB / ${(mem.total / 1024 / 1024 / 1024).toFixed(1)}GB` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {mem.value ? mem.value.toFixed(1) : "-"}% utilization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storage.used && storage.total ? `${formatStorage(storage.used)} / ${formatStorage(storage.total)}` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {storage.value ? storage.value.toFixed(1) : "-"}% capacity used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{net.value ? net.value.toFixed(2) + " MB/s" : "-"}</div>
            <p className="text-xs text-muted-foreground">Current throughput</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 
