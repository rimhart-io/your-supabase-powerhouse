import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
// Tables added in db/2026-05-08_sell_and_cosmetics.sql aren't in the
// auto-generated types yet, so route writes through an untyped alias.
const sb = supabase as unknown as { from: (t: string) => any };
import { Button } from "@/components/ui/button";
import { Coins, Crown, Frame } from "lucide-react";
import { toast } from "sonner";

export interface Cosmetic {
  key: string;
  type: "badge" | "frame";
  name: string;
  description: string;
  price: number;
  value: string;
}

export function CosmeticsSection() {
  const { user, profile, refreshProfile } = useAuth();
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: cat }, { data: own }] = await Promise.all([
      sb.from("cosmetics_catalog").select("*").order("price"),
      sb.from("user_cosmetics").select("cosmetic_key").eq("user_id", user.id),
    ]);
    setCosmetics((cat as unknown as Cosmetic[]) ?? []);
    setOwned(new Set(((own as { cosmetic_key: string }[] | null) ?? []).map(r => r.cosmetic_key)));
  };

  useEffect(() => { load(); }, [user]);

  const buy = async (c: Cosmetic) => {
    if (!user || !profile || busy) return;
    if (owned.has(c.key)) { toast.info("Already owned"); return; }
    if (profile.coins < c.price) { toast.error("Not enough coins"); return; }
    setBusy(true);
    const { error: pErr } = await sb.from("profiles").update({ coins: profile.coins - c.price }).eq("id", user.id);
    if (pErr) { setBusy(false); toast.error(pErr.message); return; }
    const { error: iErr } = await sb.from("user_cosmetics").insert({ user_id: user.id, cosmetic_key: c.key });
    if (iErr) { setBusy(false); toast.error(iErr.message); return; }
    await refreshProfile();
    await load();
    setBusy(false);
    toast.success(`Acquired ${c.name}`);
  };

  const equip = async (c: Cosmetic) => {
    if (!user || !profile || busy) return;
    setBusy(true);
    const field = c.type === "badge" ? "equipped_badge" : "equipped_frame";
    const current = c.type === "badge" ? profile.equipped_badge : profile.equipped_frame;
    const next = current === c.key ? null : c.key;
    const { error } = await sb.from("profiles").update({ [field]: next }).eq("id", user.id);
    if (error) { setBusy(false); toast.error(error.message); return; }
    await refreshProfile();
    setBusy(false);
    toast.success(next ? `Equipped ${c.name}` : `Unequipped ${c.name}`);
  };

  if (!profile) return null;
  const badges = cosmetics.filter(c => c.type === "badge");
  const frames = cosmetics.filter(c => c.type === "frame");

  const renderCard = (c: Cosmetic) => {
    const isOwned = owned.has(c.key);
    const equipped = c.type === "badge" ? profile.equipped_badge === c.key : profile.equipped_frame === c.key;
    return (
      <div key={c.key} className="rounded-2xl border border-border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-2">
          {c.type === "badge" ? (
            <span className="text-3xl">{c.value}</span>
          ) : (
            <div className="w-12 h-12 rounded-xl p-[3px]" style={{ background: c.value }}>
              <div className="w-full h-full rounded-[8px] bg-card" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-black truncate">{c.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.type}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex-1 mb-3">{c.description}</div>
        {isOwned ? (
          <Button
            size="sm"
            variant={equipped ? "default" : "secondary"}
            onClick={() => equip(c)}
            disabled={busy}
          >
            {equipped ? "Equipped — tap to remove" : "Equip"}
          </Button>
        ) : (
          <Button size="sm" onClick={() => buy(c)} disabled={busy || profile.coins < c.price}>
            Buy · {c.price.toLocaleString()} <Coins className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-5 w-5 text-[var(--rarity-legendary)]" />
          <h2 className="text-2xl font-black">Profile Badges</h2>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{badges.map(renderCard)}</div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Frame className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-black">Avatar Frames</h2>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">{frames.map(renderCard)}</div>
      </div>
    </section>
  );
}
