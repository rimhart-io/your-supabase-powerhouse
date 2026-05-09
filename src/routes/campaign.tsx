import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { GameTopBar } from "@/components/GameTopBar";
import { PageBackground } from "@/components/PageBackground";
import bgCampaign from "@/assets/bg-campaign.jpg";
import { Trophy, Lock, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campaign")({
  head: () => ({ meta: [{ title: "Campaign — PokéClash" }] }),
  component: Campaign,
});

const STAGES = Array.from({ length: 12 }, (_, i) => ({
  stage: i + 1,
  name: [
    "Rookie Path", "Forest Trainer", "Beach Brawler", "Cave Captain",
    "Mountain Sage", "Ghost Whisperer", "Dragon Knight", "Elite Cinder",
    "Elite Tide", "Elite Quake", "Elite Storm", "Champion",
  ][i],
  reward: 60 + (i + 1) * 15,
}));

function Campaign() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  if (!user || !profile) return null;

  const progress = profile.campaign_progress;

  return (
    <div className="min-h-screen">
      <PageBackground src={bgCampaign} dim={0.55} />
      <GameTopBar title="Campaign" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-1">Campaign</h1>
        <p className="text-muted-foreground mb-8">Climb the ladder. Each trainer is tougher and pays more.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {STAGES.map(s => {
            const unlocked = s.stage <= progress + 1;
            const cleared = s.stage <= progress;
            return (
              <Link
                key={s.stage}
                to="/battle"
                search={{ stage: s.stage }}
                disabled={!unlocked}
                className={cn(
                  "rounded-2xl border p-4 transition",
                  unlocked ? "hover:border-primary border-border bg-card" : "opacity-50 pointer-events-none border-border bg-card",
                  cleared && "ring-1 ring-primary/40"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Stage {s.stage}</span>
                  {cleared ? <Trophy className="h-4 w-4 text-[var(--rarity-legendary)]"/> : !unlocked ? <Lock className="h-4 w-4"/> : <Swords className="h-4 w-4"/>}
                </div>
                <div className="font-black text-lg">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-1">Reward · {s.reward} coins</div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
