export type ReportingConnection = {
  provider: string;
  enabled: boolean;
  key_prefix: string | null;
  last_used_at: string | null;
};

// Issuing a feed key is setup, not evidence that an external tool connected.
export function isVerifiedReportingConnection(row: ReportingConnection): boolean {
  return row.enabled && Boolean(row.key_prefix) && Boolean(row.last_used_at);
}