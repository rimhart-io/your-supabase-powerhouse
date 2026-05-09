import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Sparkles, Copy } from "lucide-react";
import { getPokemonIndex, type PokemonIndexEntry } from "@/lib/pokemon-index";

const PAGE_SIZE = 24;

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out.match(/.{1,5}/g)!.join("-");
}

export function AdminPokemonBrowser() {
  const [list, setList] = useState<PokemonIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [generating, setGenerating] = useState<number | null>(null);
  const [lastCode, setLastCode] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    getPokemonIndex()
      .then((data) => setList(data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load Pokémon"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.id) === q,
    );
  }, [query, list]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const generate = async (entry: PokemonIndexEntry) => {
    setGenerating(entry.id);
    const code = genCode();
    const { error } = await supabase
      .from("redeem_codes")
      .insert({ code, coins: 0, pokemon_id: entry.id } as never);
    setGenerating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLastCode({ code, name: entry.name });
    navigator.clipboard.writeText(code).catch(() => {});
    toast.success(`Code generated for ${entry.name} (copied)`);
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-black">Pokémon catalog</h2>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name or #id"
            className="pl-9 w-64"
          />
        </div>
      </div>

      {lastCode && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            New code for <span className="font-bold capitalize">{lastCode.name}</span>:{" "}
            <span className="font-mono font-bold">{lastCode.code}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(lastCode.code);
              toast.success("Copied");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground text-sm py-10 text-center">Loading Pokémon…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slice.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-background p-3 flex flex-col items-center text-center gap-2"
              >
                <img src={p.sprite} alt={p.name} className="w-16 h-16" loading="lazy" />
                <div className="text-xs text-muted-foreground">#{p.id}</div>
                <div className="font-bold capitalize text-sm truncate w-full">{p.name}</div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => generate(p)}
                  disabled={generating === p.id}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {generating === p.id ? "…" : "Generate code"}
                </Button>
              </div>
            ))}
            {slice.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8 text-sm">
                No Pokémon match "{query}"
              </div>
            )}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <div className="text-xs text-muted-foreground">
                Page {safePage + 1} / {pageCount}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
