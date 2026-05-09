import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { GameTopBar } from "@/components/GameTopBar";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { rowToCard, type CardRow } from "@/lib/card-mapper";
import type { PokemonCard } from "@/lib/pokemon";

export const Route = createFileRoute("/items")({
  head: () => ({ meta: [{ title: "Items — PokéClash" }] }),
  component: Items,
});

interface Item { key: string; name: string; description: string; price: number; icon: string }
interface InvRow { item_key: string; qty: number }

function Items() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [inv, setInv] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<(PokemonCard & { id: string })[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const [{ data: it }, { data: iv }, { data: c }] = await Promise.all([
      supabase.from("items_catalog").select("*"),
      supabase.from("inventory").select("item_key, qty").eq("user_id", user.id),
      supabase.from("cards").select("*").eq("owner_id", user.id).order("obtained_at", { ascending: false }),
    ]);
    setItems(((it as Item[]) ?? []).filter(i => i.key !== "evolution_stone"));
    const map: Record<string, number> = {};
    for (const r of (iv as InvRow[] | null) ?? []) map[r.item_key] = r.qty;
    setInv(map);
    setCards(((c as CardRow[] | null) ?? []).map(rowToCard));
  };

  useEffect(() => { load(); }, [user]);

  const buy = async (it: Item) => {
    if (!user || !profile || busy) return;
    if (profile.coins < it.price) { toast.error("Not enough coins"); return; }
    setBusy(true);
    await supabase.from("profiles").update({ coins: profile.coins - it.price }).eq("id", user.id);
    const cur = inv[it.key] ?? 0;
    if (cur > 0) {
      await supabase.from("inventory").update({ qty: cur + 1 }).eq("user_id", user.id).eq("item_key", it.key);
    } else {
      await supabase.from("inventory").insert({ user_id: user.id, item_key: it.key, qty: 1 });
    }
    await refreshProfile();
    await load();
    setBusy(false);
    toast.success(`Bought ${it.name}`);
  };

  const equip = async (cardId: string, itemKey: string | null) => {
    if (!user || busy) return;
    setBusy(true);
    const card = cards.find(c => c.id === cardId);
    const oldItem = card?.held_item ?? null;
    // return old item to inventory
    if (oldItem) {
      const cur = inv[oldItem] ?? 0;
      if (cur > 0) await supabase.from("inventory").update({ qty: cur + 1 }).eq("user_id", user.id).eq("item_key", oldItem);
      else await supabase.from("inventory").insert({ user_id: user.id, item_key: oldItem, qty: 1 });
    }
    // consume new item
    if (itemKey) {
      const cur = inv[itemKey] ?? 0;
      if (cur <= 0) { toast.error("Out of stock"); setBusy(false); return; }
      if (cur === 1) await supabase.from("inventory").delete().eq("user_id", user.id).eq("item_key", itemKey);
      else await supabase.from("inventory").update({ qty: cur - 1 }).eq("user_id", user.id).eq("item_key", itemKey);
    }
    await supabase.from("cards").update({ held_item: itemKey }).eq("id", cardId);
    await load();
    setBusy(false);
  };

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <section>
          <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
            <div>
              <h1 className="text-3xl font-black">Item shop</h1>
              <p className="text-muted-foreground">Held items grant battle bonuses. One per Pokémon.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary font-bold">
              <Coins className="h-4 w-4 text-[var(--rarity-legendary)]" /> {profile.coins}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {items.map(it => (
              <div key={it.key} className="rounded-2xl border border-border bg-card p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{it.icon}</span>
                  <span className="font-black">{it.name}</span>
                  {(inv[it.key] ?? 0) > 0 && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-secondary">x{inv[it.key]}</span>}
                </div>
                <div className="text-xs text-muted-foreground flex-1">{it.description}</div>
                <Button className="mt-3" onClick={() => buy(it)} disabled={busy || profile.coins < it.price}>
                  Buy · {it.price} <Coins className="h-3.5 w-3.5 ml-1"/>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-3">Equip held items</h2>
          {cards.length === 0 ? (
            <p className="text-muted-foreground text-sm">Open packs to get Pokémon you can equip.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {cards.map(c => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3">
                  <img src={c.image_url} alt="" className="w-14 h-14 object-contain"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold capitalize truncate">{c.name} <span className="text-xs opacity-60">L{c.level}</span></div>
                    <select
                      className="w-full mt-1 text-xs bg-secondary rounded px-2 py-1 border border-border"
                      value={c.held_item ?? ""}
                      onChange={e => equip(c.id, e.target.value || null)}
                      disabled={busy}
                    >
                      <option value="">— No item —</option>
                      {items.map(it => {
                        const owned = inv[it.key] ?? 0;
                        const isCurrent = c.held_item === it.key;
                        return (
                          <option key={it.key} value={it.key} disabled={!isCurrent && owned <= 0}>
                            {it.icon} {it.name}{isCurrent ? " (equipped)" : owned > 0 ? ` · x${owned}` : " · 0"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
