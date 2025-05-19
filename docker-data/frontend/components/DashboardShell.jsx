import DashboardSidebar from "./DashboardSidebar";

export default function DashboardShell({ children }) {
  return (
    <div className="flex h-screen w-full bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
} 
