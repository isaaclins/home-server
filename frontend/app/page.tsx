"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Server } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-6">
          <Server className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}
