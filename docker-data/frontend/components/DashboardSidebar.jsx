import Link from "next/link";
import { useRouter } from "next/router";
import { Server, LayoutDashboard, Terminal, Code, Database, Users, Activity, Settings, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { icon: <LayoutDashboard />, label: "Dashboard", path: "/dashboard" },
  { icon: <Server />, label: "Services", path: "/services" },
  { icon: <Terminal />, label: "Terminal", path: "/admin/terminal" },
  { icon: <Code />, label: "Git Repos", path: "/gitea-repos" },
];
const systemNavItems = [
  { icon: <Database />, label: "Storage", path: "/storage" },
  { icon: <Users />, label: "Users", path: "/admin/users" },
  { icon: <Activity />, label: "Activity", path: "/admin/logs" },
  { icon: <Settings />, label: "Settings", path: "/settings" },
  { icon: <Folder />, label: "File Browser", path: "/files" },
];

export default function DashboardSidebar() {
  const router = useRouter();
  return (
    <div className="flex flex-col h-screen border-r bg-sidebar border-sidebar-border w-56">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2 px-1">
          <Server className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sidebar-foreground">HomeServer</span>
        </div>
      </div>
      <div className="flex-1 py-2 px-2 space-y-4">
        <div>
          <div className="px-3 py-1">
            <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">Main</p>
          </div>
          {mainNavItems.map(item => (
            <Link key={item.path} href={item.path} passHref legacyBehavior>
              <Button
                as="a"
                variant="ghost"
                className={`flex items-center w-full gap-3 px-3 py-2 h-auto mb-1 ${router.pathname === item.path ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
              >
                <span className="h-5 w-5">{item.icon}</span>
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
        <div>
          <div className="px-3 py-1">
            <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">System</p>
          </div>
          {systemNavItems.map(item => (
            <Link key={item.path} href={item.path} passHref legacyBehavior>
              <Button
                as="a"
                variant="ghost"
                className={`flex items-center w-full gap-3 px-3 py-2 h-auto mb-1 ${router.pathname === item.path ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"}`}
              >
                <span className="h-5 w-5">{item.icon}</span>
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
      <div className="p-3 flex items-center">
        <div className="status-indicator status-online mr-2" />
        <span className="text-xs text-sidebar-foreground/70">System Online</span>
      </div>
    </div>
  );
} 
