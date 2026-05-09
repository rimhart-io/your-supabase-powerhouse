import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Coins, Copy, Shield, LogOut } from "lucide-react";
import { AdminPokemonBrowser } from "@/components/AdminPokemonBrowser";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — PokéClash" }] }),
  component: AdminPage,
});

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";
const ADMIN_KEY = "pokeclash_admin";

interface RedeemCode {
  code: string;
  coins: number;
  pokemon_id: number | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out.match(/.{1,5}/g)!.join("-");
}

function AdminPage() {
  const { user, loading } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(ADMIN_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.setItem(ADMIN_KEY, "1");
      setAuthed(true);
      toast.success("Welcome, admin");
    } else {
      toast.error("Wrong credentials. Use admin / 1234");
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_KEY);
    setAuthed(false);
  };

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</main>;
  }

  // Must be signed in to a normal account too — RLS needs an authenticated session.
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
        <div className="w-full max-w-sm bg-card p-8 rounded-2xl border border-border shadow-2xl space-y-4 text-center">
          <Shield className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-black">Sign in first</h1>
          <p className="text-sm text-muted-foreground">
            Admin uses the database, so you need to be logged into a player account before opening the admin panel.
          </p>
          <Link to="/login"><Button className="w-full">Go to login</Button></Link>
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
        <form onSubmit={login} className="w-full max-w-sm bg-card p-8 rounded-2xl border border-border shadow-2xl space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black">Admin login</h1>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            Default credentials: <span className="font-mono font-bold text-foreground">admin</span> / <span className="font-mono font-bold text-foreground">1234</span>
          </div>
          <div className="space-y-2"><Label>Username</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" required /></div>
          <div className="space-y-2"><Label>Password</Label>
            <Input type="password" value={pass} onChange={e => setPass(e.target.value)} required /></div>
          <Button type="submit" className="w-full">Log in</Button>
        </form>
      </main>
    );
  }

  return <AdminDashboard onLogout={logout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [coins, setCoins] = useState(500);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("redeem_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { toast.error(error.message); return; }
    setCodes((data as RedeemCode[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (coins <= 0) return toast.error("Enter coin amount");
    setLoading(true);
    const code = genCode();
    const { error } = await supabase.from("redeem_codes").insert({ code, coins });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Generated ${code}`);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black">
            <Shield className="h-5 w-5 text-primary" /> ADMIN PANEL
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="h-4 w-4 mr-1" /> Log out</Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-black">Generate redeem code</h2>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2">
              <Label>Coins</Label>
              <Input type="number" min={1} value={coins} onChange={e => setCoins(parseInt(e.target.value) || 0)} className="w-32" />
            </div>
            <Button onClick={generate} disabled={loading}>
              <Coins className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>
        </section>

        <AdminPokemonBrowser />

        <section>
          <h2 className="text-xl font-black mb-3">Recent codes</h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {codes.length === 0 && <div className="p-6 text-muted-foreground text-sm">No codes yet.</div>}
            {codes.map(c => (
              <div key={c.code} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-mono font-bold">{c.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.pokemon_id ? `Pokémon #${c.pokemon_id}` : `${c.coins} coins`} · {c.used_by ? "USED" : "Available"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}