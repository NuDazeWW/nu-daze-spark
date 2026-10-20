export const DELIVERY_LABELS: Record<string, string> = {
  idle: 'Not scheduled', scheduled: 'Scheduled', staged: 'Staged — not sent',
  sending: 'Sending', platform_confirmed: 'Published live (confirmed)', manual_confirmed: 'Marked as posted by hand',
  awaiting_confirmation: 'Awaiting platform confirmation', failed: 'Failed', skipped: 'Skipped', partial: 'Partial · check channel results',
  published: 'Delivery recorded · verification unavailable', publishing: 'Sending',
};
export function deliveryLabel(status: string) { return DELIVERY_LABELS[status] ?? status; }
export function deliveryGroup(status: string): 'upcoming' | 'published' | 'failed' | null {
  if (['scheduled', 'sending', 'publishing', 'awaiting_confirmation'].includes(status)) return 'upcoming';
  if (['staged', 'platform_confirmed', 'manual_confirmed', 'published'].includes(status)) return 'published';
  if (['failed', 'skipped', 'partial'].includes(status)) return 'failed';
  return null;
}
