import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useBuildImpact, useListSdgs, getListSdgsQueryKey, type ImpactRequest, type ImpactNode, type ImpactLink } from '@workspace/api-client-react';
import { useStore, completedIds } from '@/lib/store';
import { useAutoMutation } from '@/hooks/use-auto-mutation';
import { PageHeader, ErrorState, Shimmer, LockedPrompt, Disclaimer, NextStep } from '@/components/common';
import { cn } from '@/lib/utils';

const W = 900;
const COLX = { career: 120, skill: 450, sdg: 780 } as const;

export default function ImpactPage() {
  const { profile, targetId, progress } = useStore();
  const sdgs = useListSdgs({ query: { queryKey: getListSdgsQueryKey(), staleTime: Infinity } });
  const m = useBuildImpact();
  const done = useMemo(() => completedIds(progress), [progress]);
  const payload = useMemo<ImpactRequest | null>(() => (profile ? { occupationId: targetId, completedSkillIds: done } : null), [profile, targetId, done]);
  const retry = useAutoMutation(m.mutate, payload);
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<ImpactLink | null>(null);
  const g = m.data;
  const color = (n?: number | null) => sdgs.data?.find((s) => s.number === n)?.color ?? 'hsl(200 80% 35%)';

  const layout = useMemo(() => {
    if (!g) return null;
    const cols: Record<string, ImpactNode[]> = { career: [], skill: [], sdg: [] };
    g.nodes.forEach((n) => cols[n.kind].push(n));
    const rows = Math.max(...Object.values(cols).map((c) => c.length), 1);
    const H = Math.max(320, rows * 58 + 40);
    const pos: Record<string, { x: number; y: number; n: ImpactNode }> = {};
    (Object.keys(cols) as (keyof typeof COLX)[]).forEach((k) => {
      const list = cols[k];
      const gap = H / (list.length + 1);
      list.forEach((n, i) => { pos[n.id] = { x: COLX[k], y: gap * (i + 1), n }; });
    });
    return { pos, H };
  }, [g]);

  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Impact mapping connects your career and completed skills to the UN Sustainable Development Goals." href="/app/understand" cta="Go to Understand Me" />;
  const userSdgs = new Set(g?.userSdgs ?? []);
  const occSdgs = new Set(g?.occupationSdgs ?? []);

  return (
    <div>
      <PageHeader eyebrow="Impact / SDG Impact" title="Your SDG record" description="How your target career and completed skills could connect to the Sustainable Development Goals. Hover a link to read its justification." />
      {m.isError && <ErrorState onRetry={retry} />}
      {m.isPending && <Shimmer className="h-96" />}
      {g && layout && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
            <div className="rounded-3xl bg-navy px-7 py-5 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-sidebar-primary">Your skills contribute to</p>
              <p className="font-display text-5xl font-bold" data-testid="text-sdg-count">{g.userSdgs.length} <span className="text-2xl font-semibold">SDG{g.userSdgs.length === 1 ? '' : 's'}</span></p>
            </div>
            <p className="text-sm text-muted-foreground">{done.length === 0 ? 'Complete roadmap steps to grow your personal SDG record. Occupation-level links are shown in the meantime.' : `Based on ${done.length} completed roadmap skill${done.length === 1 ? '' : 's'}${targetId ? ' and your target career' : ''}.`}</p>
          </div>

          <div className="overflow-x-auto rounded-3xl border bg-card p-4">
            <div className="mb-2 grid min-w-[760px] grid-cols-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"><span>Career</span><span>Skills</span><span>SDGs</span></div>
            <svg viewBox={`0 0 ${W} ${layout.H}`} className="min-w-[760px] w-full" data-testid="chart-impact">
              {g.links.map((l, i) => {
                const a = layout.pos[l.source]; const b = layout.pos[l.target];
                if (!a || !b) return null;
                const active = hover ? l.source === hover || l.target === hover : sel === l;
                const dim = (hover || sel) && !active;
                const mx = (a.x + b.x) / 2;
                const tgtColor = color(b.n.sdgNumber);
                return (
                  <g key={i} onMouseEnter={() => setSel(l)} onClick={() => setSel(l)} className="cursor-pointer">
                    <motion.path d={`M${a.x + 70},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x - 70},${b.y}`} fill="none"
                      stroke={l.level === 'occupation' ? 'hsl(200 80% 35%)' : tgtColor} strokeWidth={active ? 4 : 2.2}
                      className={l.level === 'occupation' ? 'flow-dash' : ''} opacity={dim ? 0.12 : 0.7}
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.04 }} />
                    <path d={`M${a.x + 70},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x - 70},${b.y}`} fill="none" stroke="transparent" strokeWidth={14} />
                  </g>
                );
              })}
              {Object.values(layout.pos).map(({ x, y, n }) => {
                const isSdg = n.kind === 'sdg';
                const fill = isSdg ? color(n.sdgNumber) : n.kind === 'career' ? 'hsl(206 58% 13%)' : n.completed ? 'hsl(174 64% 38%)' : 'hsl(188 42% 92%)';
                const txt = n.kind === 'skill' && !n.completed ? 'hsl(204 60% 18%)' : '#fafcfc';
                return (
                  <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} className="cursor-pointer" data-testid={`node-${n.id}`}>
                    <motion.rect x={x - 70} y={y - 19} width={140} height={38} rx={19} fill={fill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${x}px ${y}px` }}
                      stroke={isSdg && userSdgs.has(n.sdgNumber ?? -1) ? 'hsl(206 58% 13%)' : 'none'} strokeWidth={2.5} />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="11.5" fontWeight={600} fill={txt} fontFamily="Geist, sans-serif">
                      {(isSdg ? `SDG ${n.sdgNumber}` : n.label).slice(0, 22)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 border-t-2 border-dashed border-primary" /> occupation-level mapping</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 bg-teal" /> skill-level mapping</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-teal" /> completed skill</span>
            </div>
          </div>

          <motion.div key={sel ? sel.source + sel.target : 'none'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border-l-4 border-teal bg-accent/40 p-4 text-sm" data-testid="text-justification">
            {sel ? <><span className="mr-2 rounded bg-card px-1.5 py-0.5 font-mono text-[10px] uppercase">{sel.level}-level</span>{sel.justification}</> : 'Hover or tap a link to read why it connects.'}
          </motion.div>

          <h2 className="mb-4 mt-10 text-xl font-bold">SDG badge grid</h2>
          {sdgs.isLoading ? <Shimmer className="h-40" /> : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-9">
              {(sdgs.data ?? []).map((s, i) => {
                const mine = userSdgs.has(s.number); const occ = occSdgs.has(s.number);
                return (
                  <motion.div key={s.number} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className={cn('relative flex aspect-square flex-col justify-between rounded-2xl p-2.5 text-white transition', !mine && !occ && 'opacity-25 grayscale', mine && 'ring-4 ring-offset-2 ring-offset-background ring-navy/80 scale-[1.03]')}
                    style={{ background: s.color }} title={s.name} data-testid={`badge-sdg-${s.number}`}>
                    <span className="font-display text-2xl font-bold leading-none">{s.number}</span>
                    <span className="text-[9.5px] font-semibold leading-tight line-clamp-3">{s.name}</span>
                    {mine && <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-[8px] font-bold text-navy">YOU</span>}
                  </motion.div>
                );
              })}
            </div>
          )}
          {sdgs.isError && <ErrorState onRetry={() => sdgs.refetch()} />}
          <div className="mt-6 space-y-2"><Disclaimer>Potential contributions, not measured impact.</Disclaimer>{g.disclaimer && <p className="text-xs text-muted-foreground">{g.disclaimer}</p>}</div>
        </>
      )}
      <NextStep href="/app/understand" hint="Loop back" label="Refine your profile and recalculate" />
    </div>
  );
}
