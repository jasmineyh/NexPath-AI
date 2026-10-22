import { useMemo } from 'react';
import { useBuildRoadmap, type RoadmapRequest } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { useAutoMutation } from '@/hooks/use-auto-mutation';

export function useRoadmap() {
  const { profile, targetId } = useStore();
  const m = useBuildRoadmap();
  const payload = useMemo<RoadmapRequest | null>(() => (profile && targetId ? { occupationId: targetId, profile } : null), [profile, targetId]);
  const retry = useAutoMutation(m.mutate, payload);
  return { roadmap: m.data, isPending: m.isPending || (m.isIdle && !!payload), isError: m.isError, retry };
}
