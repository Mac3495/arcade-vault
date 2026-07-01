import { notFound } from "next/navigation";
import { GAMES } from "@/app/data/games";
import { GamePlayer } from "@/app/components/GamePlayer";

export default async function GamePlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return (
    <main className="av-main">
      <GamePlayer game={game} />
    </main>
  );
}
