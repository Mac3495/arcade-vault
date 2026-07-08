import { createClient } from "@/app/lib/supabase/server";
import { GamesBrowser } from "./GamesBrowser";
import type { GameWithBest } from "@/app/lib/supabase/types";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("*").order("title");
  const { data: scores } = await supabase.from("scores").select("game_id, score");

  const bestByGame = new Map<string, number>();
  for (const row of scores ?? []) {
    if ((bestByGame.get(row.game_id) ?? 0) < row.score) {
      bestByGame.set(row.game_id, row.score);
    }
  }

  const gamesWithBest: GameWithBest[] = (games ?? []).map((g) => ({
    ...g,
    best: bestByGame.get(g.id) ?? 0,
  }));

  return <GamesBrowser games={gamesWithBest} />;
}
