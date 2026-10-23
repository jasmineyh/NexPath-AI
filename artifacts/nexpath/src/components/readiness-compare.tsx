import { useEffect, useMemo, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'wouter';
import { CheckSquare, ListChecks, Sparkles, Square, TrendingUp } from 'lucide-react';
import { useMatchCareers, type ScenarioSkill } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { useAutoMutation } from '@/hooks/use-auto-mutation';
import { Shimmer } from '@/components/common';
import { cn } from '@/lib/utils';

type Mode = 'gradual' | 'rapid';
interface Row { skillId: string; name: string; importance: number; weight: number; before: number; isGap: boolean }

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `${Math.round(v)}`);
  useEffect(() => { const c = animate(mv, value, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }); return () => c.stop(); }, [value, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

function Gauge({ value, label, tone, testid }: { value: number; label: string; tone: 'muted' | 'teal'; testid: string }) {
  const r = 70;
  const len = Math.PI * r;
  return (
    <div className="flex flex-col items-center" data-testid={testid}>
      <div className="relative h-[100px] w-[170px]">
        <svg viewBox="0 0 170 100" className="h-full w-full">
          <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="hsl(var(--secondary))" strokeWidth="14" strokeLinecap="round" />
          <motion.path d="M15 90 A70 70 0 0 1 155 90" fill="none" strokeWidth="14" strokeLinecap="round" stroke={tone === 'teal' ? 'hsl(172 62% 42%)' : 'hsl(200 25% 55%)'}
            strokeDasharray={len} initial={false} animate={{ strokeDashoffset: len - (Math.max(0, Math.min(100, value)) / 100) * len }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center font-display text-4xl font-bold leading-none"><AnimatedNumber value={value} /><span className="text-lg">%</span></div>
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
    </div>
  );
}

export function ReadinessCompare({ occupationId, mode, scenarioSkills }: { occupationId: string; mode: Mode; scenarioSkills?: ScenarioSkill[] }) {
  const { profile, progress } = useStore();
  const m = useMatchCareers();
  const retry = useAutoMutation(m.mutate, profile);
  void retry;
  const result = useMemo(() => m.data?.results.find((r) => r.occupation.id === occupationId), [m.data, occupationId]);
  const threshold = m.data?.mode === 'embedding' ? 0.5 : 0.6;

  const rows = useMemo<Row[]>(() => {
    if (!result) return [];
    const pri = new Map((scenarioSkills ?? []).map((s) => [s.skillId, s[mode]]));
    const weigh = (id: string, imp: number) => imp * Math.max(0.05, (pri.get(id) ?? 50) / 100);
    const matched = result.matchedSkills.map((s) => ({ skillId: s.skillId, name: s.name, importance: s.importance, weight: weigh(s.skillId, s.importance), before: 1, isGap: false }));
    const missing = result.missingSkills.map((s) => ({ skillId: s.skillId, name: s.name, importance: s.importance, weight: weigh(s.skillId, s.importance), before: Math.min(0.5, (s.similarity / threshold) * 0.5), isGap: true }));
    return [...matched, ...missing];
  }, [result, scenarioSkills, mode, threshold]);

  // 0..1 share of each gap skill planned to be completed.
  const [plan, setPlan] = useState<Record<string, number>>({});
  useEffect(() => { setPlan({}); }, [occupationId]);
  const gaps = rows.filter((r) => r.isGap);

  const totalW = rows.reduce((a, r) => a + r.weight, 0) || 1;
  const afterOf = (r: Row) => (r.isGap ? r.before + (1 - r.before) * (plan[r.skillId] ?? 0) : r.before);
  const today = (rows.reduce((a, r) => a + r.weight * r.before, 0) / totalW) * 100;
  const after = (rows.reduce((a, r) => a + r.weight * afterOf(r), 0) / totalW) * 100;
  const diff = Math.round(after) - Math.round(today);
  const boosts = gaps.map((r) => ({ name: r.name, gain: ((r.weight * (1 - r.before)) / totalW) * 100 })).sort((a, b) => b.gain - a.gain);

  const toggle = (id: string) => setPlan((p) => ({ ...p, [id]: (p[id] ?? 0) > 0 ? 0 : 1 }));
  const useProgress = () => setPlan(Object.fromEntries(gaps.map((g) => {
    const p = progress[g.skillId];
    return [g.skillId, p?.status === 'completed' ? 1 : p?.status === 'in-progress' ? Math.min(1, (p.percent ?? 0) / 100) : 0];
  })));
  const planAll = () => setPlan(Object.fromEntries(gaps.map((g) => [g.skillId, 1])));
  const clear = () => setPlan({});

  const prompt = (text: string, href: string, cta: string) => (
    <section className="mb-6 rounded-3xl border border-dashed bg-card p-6 text-center" data-testid="panel-readiness-empty">
      <p className="font-display text-lg font-semibold">Your readiness: before vs after</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      <Link href={href} className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{cta}</Link>
    </section>
  );
  if (!profile) return prompt('Add your profile first so we can compare the skills you have today with the skills this career needs.', '/app/understand', 'Go to Understand Me');
  if (!occupationId) return prompt('Choose a career first, then see how reskilling could change your readiness.', '/app/explore/market', 'Open Career Market');
  if (m.isError) return prompt('We could not calculate readiness just now. Please reload the page to try again.', '/app/explore/market', 'Open Career Market');
  if (!result) return <Shimmer className="mb-6 h-64" />;

  return (
    <section className="mb-6 rounded-3xl border bg-card p-5 md:p-7" data-testid="panel-readiness">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold md:text-2xl"><TrendingUp className="h-5 w-5 text-teal" /> Your readiness: before vs after</h2>
          <p className="mt-1 text-sm text-muted-foreground">Weighted coverage of {result.occupation.title} skills, using {mode === 'gradual' ? 'Scenario A (gradual)' : 'Scenario B (rapid)'} priorities.</p>
        </div>
        <span className="rounded-full bg-amber/15 px-3 py-1 text-xs font-medium text-[hsl(30_80%_30%)]" data-testid="text-readiness-label">Prototype readiness indicator, not a prediction or guarantee</span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[auto_1fr]">
        <div className="space-y-5">
          <div className="flex items-end justify-center gap-6">
            <Gauge value={today} label="Today" tone="muted" testid="gauge-today" />
            <Gauge value={after} label="After reskilling" tone="teal" testid="gauge-after" />
          </div>
          <p className={cn('text-center font-display text-2xl font-bold', diff > 0 ? 'text-teal' : 'text-muted-foreground')} data-testid="text-readiness-diff">{diff > 0 ? '+' : ''}{diff} points</p>
          {boosts.length > 0 && (
            <p className="flex items-start gap-2 rounded-2xl bg-accent/50 px-4 py-3 text-sm" data-testid="text-biggest-boost">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <span><strong>Biggest boost:</strong> {boosts.slice(0, 3).map((b) => `${b.name} (+${Math.round(b.gain)})`).join(', ')}</span>
            </p>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-primary" /> Roadmap skills to plan</p>
            <span className="flex-1" />
            <button onClick={useProgress} className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:border-primary/40" data-testid="button-use-progress">Use my actual progress</button>
            <button onClick={planAll} className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:border-primary/40" data-testid="button-plan-everything">Plan everything</button>
            <button onClick={clear} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground" data-testid="button-clear-plan">Clear</button>
          </div>
          {gaps.length === 0 ? <p className="rounded-2xl bg-secondary/60 p-4 text-sm">No skill gaps found for this career, so there is nothing to add.</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {gaps.map((g) => {
                const f = plan[g.skillId] ?? 0;
                return (
                  <li key={g.skillId}>
                    <button onClick={() => toggle(g.skillId)} aria-pressed={f > 0} data-testid={`toggle-skill-${g.skillId}`}
                      className={cn('flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition', f >= 1 ? 'border-teal bg-teal/10' : f > 0 ? 'border-teal/50 bg-teal/5' : 'bg-background hover:border-primary/40')}>
                      {f > 0 ? <CheckSquare className="h-4 w-4 shrink-0 text-teal" /> : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="flex-1">{g.name}</span>
                      {f > 0 && f < 1 && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold text-teal">{Math.round(f * 100)}% credit</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-7">
        <p className="mb-3 text-sm font-semibold">Per-skill comparison</p>
        <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2" data-testid="list-skill-compare">
          {[...rows].sort((a, b) => b.weight - a.weight).map((r) => {
            const a = afterOf(r);
            return (
              <li key={r.skillId} data-testid={`compare-${r.skillId}`}>
                <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium">{r.name}</span><span className="font-mono text-muted-foreground">{Math.round(r.before * 100)}% to {Math.round(a * 100)}%</span></div>
                <div className="space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-[hsl(200_25%_55%)]" initial={false} animate={{ width: `${r.before * 100}%` }} transition={{ duration: 0.6 }} /></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-teal" initial={false} animate={{ width: `${a * 100}%` }} transition={{ duration: 0.6 }} /></div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded bg-[hsl(200_25%_55%)]" /> Today</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded bg-teal" /> After</span></p>
      </div>
    </section>
  );
}
