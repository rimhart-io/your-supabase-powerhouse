import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setup — PokéClash" }] }),
  component: Onboard,
});

const AVATARS = [25, 1, 4, 7, 133, 39, 143, 94];

function Onboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(25);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
    if (profile?.username) nav({ to: "/pack/open" });
  }, [user, profile, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, username: username.trim(), avatar_id: avatar, coins: 100, starter_claimed: false,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    nav({ to: "/pack/open" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--gradient-hero)" }}>
      <form onSubmit={submit} className="w-full max-w-md bg-card p-8 rounded-2xl border border-border shadow-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-black">Choose your trainer</h1>
          <p className="text-sm text-muted-foreground">Pick an avatar and trainer name.</p>
        </div>
        <div className="space-y-2"><Label>Trainer name</Label>
          <Input required minLength={2} maxLength={20} value={username} onChange={e => setUsername(e.target.value)} /></div>
        <div className="space-y-2"><Label>Avatar</Label>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map(id => (
              <button type="button" key={id} onClick={() => setAvatar(id)}
                className={cn("aspect-square rounded-xl bg-secondary border-2 flex items-center justify-center overflow-hidden",
                  avatar === id ? "border-primary ring-2 ring-primary" : "border-transparent")}>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Continue to your free pack"}</Button>
      </form>
    </main>
  );
}