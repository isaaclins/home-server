import Link from "next/link";
import { useRouter } from "next/router";
import { Server, LayoutDashboard, Terminal, Code, Database, Users, Activity, Settings, Folder, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/context/AuthContext";

// Define all possible navigation items with their access requirements
const ALL_NAV_ITEMS = {
  main: [
    { icon: <LayoutDashboard />, label: "Services", path: "/services", rolesRequired: [], adminRequired: false },
    { icon: <MessageCircle />, label: "Ollama Chat", path: "/ollama-chat", rolesRequired: ['_ollama_user'], adminRequired: false, requireAdminOrRole: true },
    { icon: <Code />, label: "Git Repos", path: "/gitea-repos", rolesRequired: [], adminRequired: false },
  ],
  system: [
    { icon: <Terminal />, label: "Terminal", path: "/admin/terminal", rolesRequired: ['_web_terminal_user'], adminRequired: true, requireAdminOrRoleForAdminPages: true },
    { icon: <Users />, label: "Users", path: "/admin/users", rolesRequired: [], adminRequired: true },
    { icon: <Activity />, label: "Logs", path: "/admin/logs", rolesRequired: [], adminRequired: true },
    { icon: <Settings />, label: "Settings", path: "/settings", rolesRequired: [], adminRequired: false },
  ]
};

export default function DashboardSidebar() {
  const router = useRouter();
  const { user, isAdmin } = useAuthContext();

  const canAccessNavItem = (item) => {
    if (!user) return false;

    if (item.adminRequired && !isAdmin) return false;

    if (item.requireAdminOrRoleForAdminPages && item.adminRequired && isAdmin) {
        if (item.rolesRequired && item.rolesRequired.length > 0) {
            const userRoles = user.roles || [];
            if (item.rolesRequired.some(role => userRoles.includes(role))) return true;
        }
        return true; 
    }
    
    if (item.requireAdminOrRole) {
        if (isAdmin) return true;
        if (item.rolesRequired && item.rolesRequired.length > 0) {
            const userRoles = user.roles || [];
            return item.rolesRequired.some(role => userRoles.includes(role));
        }
        return false;
    }

    if (item.rolesRequired && item.rolesRequired.length > 0) {
      const userRoles = user.roles || [];
      return item.rolesRequired.some(role => userRoles.includes(role));
    }

    return true;
  };

  const filteredMainNavItems = ALL_NAV_ITEMS.main.filter(canAccessNavItem);
  const filteredSystemNavItems = ALL_NAV_ITEMS.system.filter(canAccessNavItem);

  if (!user) {
    return (
        <div className="flex flex-col h-screen border-r bg-sidebar border-sidebar-border w-56">
             <div className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-2 px-1">
                <Server className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sidebar-foreground">HomeServer</span>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen border-r bg-sidebar border-sidebar-border w-56">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2 px-1">
          <Server className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sidebar-foreground">HomeServer</span>
        </div>
      </div>
      <div className="flex-1 py-2 px-2 space-y-4">
        {filteredMainNavItems.length > 0 && (
          <div>
            <div className="px-3 py-1">
              <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">Main</p>
            </div>
            {filteredMainNavItems.map(item => (
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
        )}
        {filteredSystemNavItems.length > 0 && (
          <div>
            <div className="px-3 py-1">
              <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">System</p>
            </div>
            {filteredSystemNavItems.map(item => (
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
        )}
      </div>
      <div className="p-3 flex items-center">
        <div className="status-indicator status-online mr-2" />
        <span className="text-xs text-sidebar-foreground/70">System Online</span>
      </div>
    </div>
  );
} 
