import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AuthLayout } from "@/components/AuthLayout";
import { Mail, Lock, LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — PokéClash" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    nav({ to: "/dashboard" });
  };

  return (
    <AuthLayout>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black">Welcome back, Trainer</h2>
          <p className="text-sm text-muted-foreground">Log in to continue your journey.</p>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9" placeholder="ash@pallet.town" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
          </div>
        </div>
        <Button type="submit" className="w-full font-bold" disabled={loading}>
          <LogIn className="h-4 w-4 mr-2" />
          {loading ? "Logging in…" : "Log in"}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          No account? <Link to="/signup" className="text-primary font-semibold underline-offset-4 hover:underline">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}