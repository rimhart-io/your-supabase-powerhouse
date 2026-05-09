import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { fetchPokemonCard } from "@/lib/pokemon";
import { cardToInsert } from "@/lib/card-mapper";

interface CodeRow {
  code: string;
  coins: number;
  pokemon_id: number | null;
  used_by: string | null;
}

export function RedeemCodeForm({ onRedeemed }: { onRedeemed?: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return toast.error("Enter a code");
    setBusy(true);

    try {
      // Cast around generated types — pokemon_id was added in a later migration.
      const codes = supabase.from("redeem_codes") as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: CodeRow | null; error: Error | null }>;
          };
        };
        update: (vals: Record<string, unknown>) => {
          eq: (col: string, val: string) => {
            is: (col: string, val: null) => {
              select: (cols: string) => {
                maybeSingle: () => Promise<{ data: { code: string } | null; error: Error | null }>;
              };
            };
          };
        };
      };

      const { data: codeRow, error: fetchErr } = await codes
        .select("code, coins, pokemon_id, used_by")
        .eq("code", trimmed)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!codeRow) {
        toast.error("Invalid code");
        return;
      }
      if (codeRow.used_by) {
        toast.error("This code has already been redeemed");
        return;
      }

      const pokemonId = codeRow.pokemon_id ?? null;
      const coinAmount = Number(codeRow.coins) || 0;

      if (!pokemonId && coinAmount <= 0) {
        toast.error("This code has no reward attached. Ask the admin to regenerate it.");
        return;
      }

      // If the code grants a pokémon, fetch + insert the card BEFORE claiming the code,
      // so any failure (network, RLS) doesn't burn the code.
      if (pokemonId) {
        const card = await fetchPokemonCard(pokemonId);
        const { error: cardErr } = await supabase
          .from("cards")
          .insert(cardToInsert(card, user.id));
        if (cardErr) throw cardErr;

        const { data: claimed, error: claimErr } = await codes
          .update({ used_by: user.id, used_at: new Date().toISOString() })
          .eq("code", trimmed)
          .is("used_by", null)
          .select("code")
          .maybeSingle();
        if (claimErr) throw claimErr;
        if (!claimed) {
          toast.error("Code was just claimed by someone else");
          return;
        }
        toast.success(`You received ${card.name}!`);
      } else {
        // Coins-only code
        const { data: claimed, error: claimErr } = await codes
          .update({ used_by: user.id, used_at: new Date().toISOString() })
          .eq("code", trimmed)
          .is("used_by", null)
          .select("code")
          .maybeSingle();
        if (claimErr) throw claimErr;
        if (!claimed) {
          toast.error("Code was just claimed by someone else");
          return;
        }
        if (profile) {
          const { error: profErr } = await supabase
            .from("profiles")
            .update({ coins: profile.coins + coinAmount })
            .eq("id", user.id);
          if (profErr) throw profErr;
          toast.success(`+${coinAmount} coins`);
        }
      }

      setCode("");
      await refreshProfile();
      onRedeemed?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to redeem";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-card border border-border p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h2 className="font-black">Redeem a code</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Got a code from an admin? Enter it to claim coins or a special Pokémon.
      </p>
      <div className="space-y-2">
        <Label htmlFor="redeem-code">Code</Label>
        <Input
          id="redeem-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCDE-12345"
          autoComplete="off"
          maxLength={32}
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Redeeming…" : "Redeem"}
      </Button>
    </form>
  );
}
