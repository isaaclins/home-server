"use client";

import { useState } from "react";
import { UserPlus, User, Mail, Lock, Shield, Loader2, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function CreateUserModal({ onClose, token }: { onClose: () => void; token: string }) {
  const [form, setForm] = useState({ username: "", email: "", password: "", isAdmin: false });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsSuccess(false);
    
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const res = await fetch(`${api}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          hashedPassword: form.password,
          isAdmin: form.isAdmin,
        }),
      });
      
      if (res.status === 201) {
        setMessage("User created successfully!");
        setIsSuccess(true);
        setForm({ username: "", email: "", password: "", isAdmin: false });
      } else {
        const txt = await res.text();
        setMessage(`Failed: ${txt || res.status}`);
        setIsSuccess(false);
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error occurred");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = form.password;
    if (password.length >= 12) return { strength: "Strong", color: "bg-green-500", variant: "default" as const };
    if (password.length >= 8) return { strength: "Medium", color: "bg-yellow-500", variant: "secondary" as const };
    if (password.length >= 1) return { strength: "Weak", color: "bg-red-500", variant: "destructive" as const };
    return { strength: "", color: "", variant: "outline" as const };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with admin privileges if needed.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter temporary password"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-10"
                  required
                  autoComplete="new-password"
                />
              </div>
              {form.password && passwordStrength.strength && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ 
                        width: passwordStrength.strength === "Strong" ? "100%" : 
                               passwordStrength.strength === "Medium" ? "66%" : "33%" 
                      }}
                    />
                  </div>
                  <Badge variant={passwordStrength.variant} className="text-xs">
                    {passwordStrength.strength}
                  </Badge>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                User will be prompted to change this on first login
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  name="isAdmin"
                  checked={form.isAdmin}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                />
                <Label 
                  htmlFor="isAdmin" 
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  Admin Privileges
                </Label>
              </div>
              {form.isAdmin && (
                <Badge variant="secondary" className="ml-auto">
                  Admin User
                </Badge>
              )}
            </div>
            
            {form.isAdmin && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This user will have full administrative access to the system.
                </AlertDescription>
              </Alert>
            )}
            
            {message && (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
