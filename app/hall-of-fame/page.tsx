import { createClient } from "@/app/lib/supabase/server";
import { HallOfFameClient } from "./HallOfFameClient";

export default async function HallOfFamePage() {
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("*").order("title");

  return <HallOfFameClient games={games ?? []} />;
}
