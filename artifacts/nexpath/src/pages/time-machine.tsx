import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Gauge, ListChecks, Minus, Rocket, Sprout } from 'lucide-react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { useGetScenarios, getGetScenariosQueryKey, useListOccupations, getListOccupationsQueryKey } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { PageHeader, ErrorState, Shimmer, NextStep } from '@/components/common';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Mode = 'gradual' | 'rapid';
const TREND = {
  rise: { icon: ArrowUpRight, label: 'Rises', cls: 'text-teal', bar: 'from-[hsl(186_70%_40%)] to-[hsl(168_70%_50%)]' },
  hold: { icon: Minus, label: 'Holds', cls: 'text-sky-300', bar: 'from-[hsl(205_60%_45%)] to-[hsl(200_70%_60%)]' },
  decline: { icon: ArrowDownRight, label: 'Declines', cls: 'text-amber', bar: 'from-[hsl(30_85%_45%)] to-[hsl(40_90%_58%)]' },
} as const;

export default function TimeMachinePage() {
  const { targetId } = useStore();
  const occ = useListOccupations({ query: { queryKey: getListOccupationsQueryKey(), staleTime: Infinity } });
  const [id, setId] = useState<string>(targetId ?? '');
  const [mode, setMode] = useState<Mode>('gradual');
  useEffect(() => { if (!id && occ.data?.length) setId(targetId ?? occ.data[0].id); }, [occ.data, id, targetId]);
  const sc = useGetScenarios(id, { query: { enabled: !!id, queryKey: getGetScenariosQueryKey(id) } });
  const data = sc.data;
  const max = useMemo(() => Math.max(1, ...(data?.skills ?? []).flatMap((s) => [s.baseline, s.gradual, s.rapid])), [data]);
  const sorted = useMemo(() => [...(data?.skills ?? [])].sort((a, b) => b[mode] - b.baseline - (a[mode] - a.baseline)), [data, mode]);
  const radar = useMemo(() => (data?.skills ?? []).slice(0, 8).map((s) => ({ skill: s.name.length > 16 ? s.name.slice(0, 15) + '.' : s.name, Today: s.baseline, Scenario: s[mode] })), [data, mode]);
  const counts = useMemo(() => {
    const c = { rise: 0, hold: 0, decline: 0 };
    (data?.skills ?? []).forEach((s) => { c[mode === 'gradual' ? s.gradualTrend : s.rapidTrend]++; });
    return c;
  }, [data, mode]);
  const detail = data?.[mode];
  const rapid = mode === 'rapid';

  return (
    <div>
      <PageHeader eyebrow="Explore Me / Career Time Machine" title="Career Time Machine"
        description="Pick a career, then shift between two planning scenarios to see which skills rise, hold or decline in priority." />

      <div className="relative overflow-hidden rounded-[2rem] bg-navy text-white shadow-2xl shadow-primary/20">
        <motion.svg className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] opacity-25" viewBox="0 0 200 200" animate={{ rotate: rapid ? 140 : 0 }} transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }} aria-hidden>
          {[30, 45, 60, 75, 90].map((r, i) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="hsl(172 62% 60%)" strokeWidth=".4" strokeDasharray={i % 2 ? '2 4' : '0'} />)}
          {Array.from({ length: 24 }).map((_, i) => <line key={i} x1="100" y1="8" x2="100" y2={i % 6 ? 13 : 18} stroke="hsl(172 62% 70%)" strokeWidth=".6" transform={`rotate(${i * 15} 100 100)`} />)}
          <path d="M100 100 L100 20" stroke="hsl(36 90% 60%)" strokeWidth="1.2" />
        </motion.svg>
        <motion.div className="pointer-events-none absolute inset-0" animate={{ opacity: rapid ? 1 : 0 }} transition={{ duration: 0.8 }}
          style={{ background: 'radial-gradient(circle at 80% 20%, hsl(30 85% 50% / .18), transparent 50%)' }} />

        <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sidebar-primary">Destination career</p>
            {occ.isLoading ? <Shimmer className="h-11 w-72 opacity-20" /> : (
              <Select value={id} onValueChange={setId}>
                <SelectTrigger className="h-12 w-full max-w-sm rounded-2xl border-white/15 bg-white/5 font-display text-lg text-white" data-testid="select-career"><SelectValue placeholder="Choose a career" /></SelectTrigger>
                <SelectContent>{(occ.data ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.title}{o.id === targetId ? ' (your target)' : ''}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          <div className="relative flex rounded-full bg-white/10 p-1.5" role="tablist">
            <motion.span layout className={cn('absolute inset-y-1.5 w-[calc(50%-6px)] rounded-full', rapid ? 'left-[calc(50%+0px)] bg-amber' : 'left-1.5 bg-sidebar-primary')} transition={{ type: 'spring', stiffness: 320, damping: 30 }} />
            {(['gradual', 'rapid'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} role="tab" aria-selected={mode === m} data-testid={`button-scenario-${m}`}
                className={cn('relative z-10 flex w-40 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors', mode === m ? 'text-navy' : 'text-white/70 hover:text-white')}>
                {m === 'gradual' ? <Sprout className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                {m === 'gradual' ? 'A: Gradual' : 'B: Rapid'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-6 mb-2 flex items-center gap-2 rounded-xl border border-amber/30 bg-amber/10 px-4 py-2.5 text-sm text-amber md:mx-8" data-testid="text-scenario-label">
          <Gauge className="h-4 w-4 shrink-0" /> <strong className="font-semibold">Illustrative planning scenarios, not forecasts of job loss.</strong>
        </div>

        {sc.isError && <div className="p-8"><ErrorState onRetry={() => sc.refetch()} /></div>}
        {(sc.isLoading || (!data && !sc.isError)) && <div className="grid gap-3 p-8">{[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} className="h-8 opacity-15" />)}</div>}

        {data && detail && (
          <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <div className="mb-5 flex items-baseline justify-between">
                <AnimatePresence mode="wait">
                  <motion.h2 key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="font-display text-2xl font-bold md:text-3xl" data-testid="text-scenario-title">{detail.label}</motion.h2>
                </AnimatePresence>
              </div>
              <div className="mb-5 flex gap-2 text-xs">
                {(Object.keys(TREND) as (keyof typeof TREND)[]).map((k) => {
                  const T = TREND[k];
                  return <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 ring-1 ring-white/10"><T.icon className={cn('h-3.5 w-3.5', T.cls)} />{counts[k]} {T.label.toLowerCase()}</span>;
                })}
              </div>
              <motion.ul layout className="space-y-3.5">
                {sorted.map((s) => {
                  const tr = mode === 'gradual' ? s.gradualTrend : s.rapidTrend;
                  const T = TREND[tr];
                  const v = s[mode];
                  const delta = v - s.baseline;
                  return (
                    <motion.li layout key={s.skillId} transition={{ type: 'spring', stiffness: 260, damping: 30 }} data-testid={`row-skill-${s.skillId}`}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><T.icon className={cn('h-4 w-4', T.cls)} />{s.name}</span>
                        <span className={cn('font-mono text-xs', T.cls)}>{delta > 0 ? '+' : ''}{Math.round(delta)}</span>
                      </div>
                      <div className="relative h-3 rounded-full bg-white/8">
                        <motion.div className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', T.bar)} animate={{ width: `${(v / max) * 100}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
                        <span className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-white/80" style={{ left: `${(s.baseline / max) * 100}%` }} title="Today" />
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ul>
              <p className="mt-4 flex items-center gap-2 text-xs text-white/50"><span className="inline-block h-3 w-0.5 bg-white/80" /> marks today's relative priority</p>
            </div>

            <div className="space-y-5">
              <div className="h-64 rounded-3xl bg-white/5 p-2 ring-1 ring-white/10">
                <ResponsiveContainer>
                  <RadarChart data={radar} outerRadius="70%">
                    <PolarGrid stroke="hsl(200 40% 40% / .5)" />
                    <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(190 30% 80%)', fontSize: 10 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, max]} />
                    <Radar name="Today" dataKey="Today" stroke="hsl(190 30% 80%)" fill="hsl(190 30% 80%)" fillOpacity={0.08} strokeDasharray="4 4" />
                    <Radar name="Scenario" dataKey="Scenario" stroke={rapid ? 'hsl(36 90% 55%)' : 'hsl(172 62% 50%)'} fill={rapid ? 'hsl(36 90% 55%)' : 'hsl(172 62% 50%)'} fillOpacity={0.3} isAnimationActive animationDuration={700} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }} className="space-y-4">
                  <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">Explicit assumptions</p>
                    <ul className="space-y-1.5 text-sm text-white/85">{detail.assumptions.map((a, i) => <li key={i} className="flex gap-2"><span className="font-mono text-white/40">{String.fromCharCode(97 + i)}.</span>{a}</li>)}</ul>
                  </div>
                  <div className={cn('rounded-3xl p-5', rapid ? 'bg-amber/15 ring-1 ring-amber/30' : 'bg-sidebar-primary/15 ring-1 ring-sidebar-primary/30')}>
                    <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]"><ListChecks className="h-3.5 w-3.5" /> Recommended preparation</p>
                    <ul className="space-y-2 text-sm">{detail.actions.map((a, i) => <li key={i} className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />{a}</li>)}</ul>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
        {data && <p className="relative px-6 pb-6 text-xs text-white/50 md:px-8">{data.disclaimer}</p>}
      </div>
      <NextStep href="/app/roadmap" hint="Optional detour" label="Continue to Roadmap" />
    </div>
  );
}
