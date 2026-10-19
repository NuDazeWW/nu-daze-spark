import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Jobs view: history of the five-minute staged scheduled-delivery job. */
export function ScheduledRunsPanel() {
  const runs = useQuery({
    queryKey: ["publish_runs"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("publish_runs" as never).select("*").order("started_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; started_at: string; status: string; posts_processed: number; channels_staged: number; channels_skipped: number; backlog_remaining: number; error_message: string | null }[];
    },
  });
  return (
    <section className="rounded-xl border bg-card p-4 text-card-foreground">
      <h2 className="font-display text-lg font-semibold">Scheduled delivery jobs</h2>
      <p className="text-xs text-muted-foreground">Checks every five minutes and moves up to 25 due posts per run. Live sending stays off until this instance connects its own approved platform apps; channels without a connected account are marked skipped.</p>
      {runs.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading run history…</p>
      : runs.isError ? <p className="mt-3 text-sm text-destructive">Couldn't load run history. Refresh to try again.</p>
      : runs.data?.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 pr-3">Run</th><th className="pr-3">Status</th><th className="pr-3">Posts</th><th className="pr-3">Staged</th><th className="pr-3">Skipped</th><th>Still due</th></tr></thead>
            <tbody>{runs.data.map((r) => (
              <tr key={r.id} className="border-t"><td className="py-1 pr-3 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td><td className="pr-3">{r.status}{r.error_message ? ` — ${r.error_message}` : ""}</td>
                <td className="pr-3">{r.posts_processed}</td><td className="pr-3">{r.channels_staged}</td><td className="pr-3">{r.channels_skipped}</td><td>{r.backlog_remaining}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground">No runs yet. A run is recorded only when scheduled posts are due.</p>}
    </section>
  );
}
