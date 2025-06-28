"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, User, Mail, Lock, Key, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    code: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const strength = form.password.length >= 12 ? "strong" : form.password.length >= 8 ? "medium" : "weak";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const res = await fetch(`${apiBase}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage("Registration successful. You may now log in.");
        setIsSuccess(true);
        setForm({ username: "", email: "", password: "", code: "" });
      } else {
        const text = await res.text();
        setMessage(`Error: ${text || res.status}`);
        setIsSuccess(false);
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (strength) {
      case "strong":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  const getPasswordStrengthVariant = () => {
    switch (strength) {
      case "strong":
        return "default" as const;
      case "medium":
        return "secondary" as const;
      default:
        return "destructive" as const;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
          <p className="text-muted-foreground mt-2">
            Register for access to the home server
          </p>
        </div>

        {/* Registration Form */}
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Register</CardTitle>
              <CardDescription>
                Create your account using an admin-provided registration code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
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
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="pl-10"
                    required
                    autoComplete="new-password"
                  />
                </div>
                {form.password && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ 
                          width: strength === "strong" ? "100%" : strength === "medium" ? "66%" : "33%" 
                        }}
                      />
                    </div>
                    <Badge variant={getPasswordStrengthVariant()} className="text-xs">
                      {strength.charAt(0).toUpperCase() + strength.slice(1)}
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Registration Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="code"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="Enter registration code"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact an admin to get a registration code
                </p>
              </div>
              
              {message && (
                <Alert variant={isSuccess ? "default" : "destructive"}>
                  {isSuccess && <CheckCircle2 className="h-4 w-4" />}
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="font-medium text-primary hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 
