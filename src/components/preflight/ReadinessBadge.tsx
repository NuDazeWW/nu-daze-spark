import { useReadiness } from '@/hooks/useReadiness';
import type { PostCard } from '@/hooks/usePostCards';
import { ShieldCheck } from 'lucide-react';
export function ReadinessBadge({ card }: { card: PostCard }) {
  const r = useReadiness(card);
  return <p className={`flex items-center gap-1.5 text-xs break-words ${r.data?.tone === 'blocked' ? 'text-destructive' : 'text-muted-foreground'}`}><ShieldCheck className="h-3.5 w-3.5 shrink-0" />{r.isError ? 'Checks unavailable' : r.data?.label ?? 'Checks pending'}</p>;
}
