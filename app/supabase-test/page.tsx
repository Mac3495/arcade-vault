import { createClient } from "@/app/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Supabase connection test</h1>
      {error ? (
        <p style={{ color: "red" }}>[FAIL] {error.message}</p>
      ) : (
        <p style={{ color: "green" }}>[OK] Supabase client responded without error.</p>
      )}
    </main>
  );
}
