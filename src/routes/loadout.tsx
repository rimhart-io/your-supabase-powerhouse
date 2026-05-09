import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { GameTopBar } from "@/components/GameTopBar";
import { PokemonCardView } from "@/components/PokemonCard";
import { Button } from "@/components/ui/button";
import type { PokemonCard } from "@/lib/pokemon";
import { rowToCard, type CardRow } from "@/lib/card-mapper";
import { toast } from "sonner";

export const Route = createFileRoute("/loadout")({
  head: () => ({ meta: [{ title: "Loadout — PokéClash" }] }),
  component: Loadout,
});

function Loadout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [cards, setCards] = useState<(PokemonCard & { id: string })[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("cards").select("*").eq("owner_id", user.id).order("obtained_at", { ascending: false });
      setCards(((data as CardRow[] | null) ?? []).map(rowToCard));
      const { data: l } = await supabase.from("loadouts").select("card_ids").eq("user_id", user.id).maybeSingle();
      if (l?.card_ids) setSelected(l.card_ids as string[]);
    })();
  }, [user]);

  const toggle = (id: string) => {
    setSelected(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (s.length >= 3) { toast("Pick exactly 3 cards"); return s; }
      return [...s, id];
    });
  };

  const save = async () => {
    if (!user) return;
    if (selected.length !== 3) { toast.error("Select 3 cards"); return; }
    setSaving(true);
    const { error } = await supabase.from("loadouts").upsert({ user_id: user.id, card_ids: selected }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Loadout saved!");
    nav({ to: "/battle" });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <GameTopBar title="Loadout" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black">Build loadout</h1>
            <p className="text-muted-foreground">Pick 3 cards to bring into battle. ({selected.length}/3)</p>
          </div>
          <Button onClick={save} disabled={selected.length !== 3 || saving}>Save loadout</Button>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No cards yet. Open a pack from the shop first.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
            {cards.map(c => (
              <PokemonCardView
                key={c.id}
                card={c}
                size="sm"
                selected={selected.includes(c.id)}
                onClick={() => toggle(c.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}