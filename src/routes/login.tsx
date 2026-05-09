import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-card p-8 rounded-2xl border border-border shadow-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-black">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Log in to your trainer account.</p>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in…" : "Log in"}</Button>
        <p className="text-sm text-center text-muted-foreground">
          No account? <Link to="/signup" className="text-primary underline">Sign up</Link>
        </p>
      </form>
    </main>
  );
}