import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * DDI Cross-Launch Handoff Receiver
 *
 * Supports receiving context from NuDaze Decision Clarity OS via URL params:
 *   ?from=ddi            — marks this session as DDI-originated
 *   &entityId=<uuid>     — canonical entity the decision relates to
 *   &assessmentId=<id>   — optional assessment / decision context
 *   &surface=<name>      — which DDI surface launched the handoff (e.g. "signal-hub")
 *
 * Returns parsed context or null if the user arrived organically.
 * Shows a toast on first DDI-origin arrival so the user has feedback.
 */

export interface DdiHandoffContext {
  from: "ddi";
  entityId: string;
  assessmentId: string | null;
  surface: string | null;
}

export function useDdiHandoff(): DdiHandoffContext | null {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const context = useMemo<DdiHandoffContext | null>(() => {
    const from = searchParams.get("from");
    if (from !== "ddi") return null;

    const entityId = searchParams.get("entityId");
    if (!entityId) return null; // entityId is required for a valid handoff

    return {
      from: "ddi",
      entityId,
      assessmentId: searchParams.get("assessmentId"),
      surface: searchParams.get("surface"),
    };
  }, [searchParams]);

  useEffect(() => {
    if (context) {
      toast({
        title: "Arriving from Decision Clarity OS",
        description: `Entity ${context.entityId.slice(0, 8)}… loaded. You can generate content linked to this decision context.`,
      });
    }
    // Only fire once on mount with valid context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.entityId]);

  return context;
}
