import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, ExternalLink, Minus, TriangleAlert } from 'lucide-react';
import { useListTrends, getListTrendsQueryKey, useListSkills, getListSkillsQueryKey, useMatchCareers, type OutlookSkill, type Trend } from '@workspace/api-client-react';
import { useStore, completedIds } from '@/lib/store';
import { useRoadmap } from '@/hooks/use-roadmap';
import { useAutoMutation } from '@/hooks/use-auto-mutation';
import { Shimmer } from '@/components/common';
import { cn } from '@/lib/utils';

export type Evidence = 'Observed' | 'Externally forecast' | 'Illustrative';
const EV_CLS: Record<Evidence, string> = {
  Observed: 'bg-teal/15 text-teal ring-teal/30',
  'Externally forecast': 'bg-primary/10 text-primary ring-primary/30',
  Illustrative: 'bg-amber/15 text-[hsl(30_80%_30%)] ring-amber/40 border-dashed',
};
const EV_HELP: Record<Evidence, string> = {
  Observed: 'Reported from data or surveys.',
  'Externally forecast': 'A forecast published by an outside organisation.',
  Illustrative: 'Our own planning assumption, not from a source.',
};

export function EvidenceBadge({ type, className }: { type: Evidence; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', EV_CLS[type], className)} data-testid={`badge-evidence-${type.toLowerCase().replace(/ /g, '-')}`}>{type}</span>;
}

export function EvidenceLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-2xl bg-secondary/50 px-4 py-3 text-xs" data-testid="legend-evidence">
      {(Object.keys(EV_HELP) as Evidence[]).map((k) => <span key={k} className="flex items-center gap-2"><EvidenceBadge type={k} /> {EV_HELP[k]}</span>)}
    </div>
  );
}

const DIR = {
  rising: { label: 'Rising', icon: ArrowUpRight, cls: 'text-teal' },
  stable: { label: 'Stable', icon: Minus, cls: 'text-sky-600' },
  declining: { label: 'Declining', icon: ArrowDownRight, cls: 'text-amber' },
} as const;

const norm = (x: string) => x.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();

export function SkillsRadar() {
  const { profile, progress } = useStore();
  const all = useListTrends(undefined, { query: { queryKey: getListTrendsQueryKey() } });
  const catalogue = useListSkills({ query: { queryKey: getListSkillsQueryKey(), staleTime: Infinity } });
  const match = useMatchCareers();
  useAutoMutation(match.mutate, profile);
  const { roadmap } = useRoadmap();
  const [fieldId, setFieldId] = useState('');

  const fields = all.data?.fields ?? [];
  const sel = fields.find((f) => f.id === fieldId) ?? fields[0];
  const outlook = all.data?.outlook?.find((o) => o.fieldId === sel?.id)?.skills ?? [];
  const items = all.data?.items ?? [];
  const byId = useMemo(() => new Map(items.map((t) => [t.id, t])), [items]);

  // Skills the user has: profile text matched to the catalogue, matcher evidence, completed roadmap steps.
  const have = useMemo(() => {
    const s = new Set<string>();
    if (!profile) return s;
    const byName = new Map<string, string>();
    (catalogue.data ?? []).forEach((k) => [k.name, ...(k.synonyms ?? [])].forEach((n) => byName.set(norm(n), k.id)));
    [...profile.technicalSkills, ...profile.humanSkills].forEach((n) => { const id = byName.get(norm(n)); if (id) s.add(id); });
    match.data?.results.forEach((r) => r.matchedSkills.forEach((m) => s.add(m.skillId)));
    completedIds(progress).forEach((id) => s.add(id));
    return s;
  }, [profile, catalogue.data, match.data, progress]);
  const inRoadmap = useMemo(() => new Set((roadmap?.steps ?? []).map((x) => x.skillId)), [roadmap]);

  const rising = outlook.filter((o) => o.direction === 'rising');
  const covered = rising.filter((o) => have.has(o.skillId));
  const gaps = rising.filter((o) => !have.has(o.skillId));
  const fieldCards = useMemo(() => items.filter((t) => sel && (t.fields ?? []).includes(sel.id)), [items, sel]);

  if (all.isLoading) return <Shimmer className="mb-8 h-72" />;
  if (!sel) return null;

  const chip = (o: OutlookSkill) => {
    const mine = have.has(o.skillId);
    const gap = o.direction === 'rising' && !mine;
    const src = o.sourceNames.length ? o.sourceNames.join('; ') : 'No external source';
    return (
      <li key={o.skillId} className={cn('rounded-2xl border px-3 py-2.5 text-sm', mine ? 'border-teal/50 bg-teal/10' : gap ? 'border-amber/60 bg-amber/10' : 'bg-card')} data-testid={`radar-skill-${o.skillId}`} data-state={mine ? 'have' : gap ? 'gap' : 'neutral'}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{o.name}</span>
          <EvidenceBadge type={o.evidenceType as Evidence} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{src}</p>
        {mine && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-teal"><CheckCircle2 className="h-3.5 w-3.5" /> You have this</p>}
        {gap && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[hsl(30_80%_30%)]"><TriangleAlert className="h-3.5 w-3.5" /> Rising skill you're missing</p>}
      </li>
    );
  };

  return (
    <section className="mb-10 rounded-3xl border bg-card p-5 md:p-7" data-testid="panel-radar">
      <h2 className="font-display text-xl font-bold md:text-2xl">Skill demand by field</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose a field to see which skills may be rising, stable or declining in demand, and how your profile lines up.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {fields.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === sel.id} onClick={() => setFieldId(f.id)} data-testid={`button-field-${f.id}`}
            className={cn('rounded-full border px-3.5 py-1.5 text-sm transition', f.id === sel.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary/40')}>{f.name}</button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {profile ? (
          <p className="rounded-full bg-accent/60 px-4 py-2 text-sm font-semibold" data-testid="text-radar-summary">You cover {covered.length} of {rising.length} rising skill{rising.length === 1 ? '' : 's'} in this field</p>
        ) : (
          <p className="text-sm text-muted-foreground">Add your profile in <Link href="/app/understand" className="font-semibold text-primary underline">Understand Me</Link> to see what you already cover.</p>
        )}
        <span className="flex items-center gap-1.5 text-xs"><span className="h-3 w-3 rounded bg-teal/40" /> You have this</span>
        <span className="flex items-center gap-1.5 text-xs"><span className="h-3 w-3 rounded bg-amber/60" /> Rising skill you're missing</span>
      </div>

      <motion.div key={sel.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 grid gap-5 lg:grid-cols-3">
        {(['rising', 'stable', 'declining'] as const).map((d) => {
          const D = DIR[d];
          const list = outlook.filter((o) => o.direction === d);
          return (
            <div key={d} data-testid={`column-${d}`}>
              <p className={cn('mb-2 flex items-center gap-1.5 text-sm font-semibold', D.cls)}><D.icon className="h-4 w-4" /> {D.label} <span className="font-mono text-xs text-muted-foreground">({list.length})</span></p>
              <ul className="space-y-2">{list.length ? list.map(chip) : <li className="rounded-2xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">None identified</li>}</ul>
            </div>
          );
        })}
      </motion.div>

      {profile && (
        <div className="mt-6 rounded-2xl border-2 border-amber/40 bg-amber/5 p-4" data-testid="panel-gaps">
          <p className="font-semibold">Your gaps to watch</p>
          {gaps.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No rising skills missing for this field based on your profile.</p> : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {gaps.map((g) => (
                <li key={g.skillId} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm">
                  <span className="flex-1">{g.name}</span>
                  <EvidenceBadge type={g.evidenceType as Evidence} />
                  {inRoadmap.has(g.skillId) && <Link href="/app/roadmap" className="text-xs font-semibold text-primary underline" data-testid={`link-roadmap-${g.skillId}`}>In your roadmap</Link>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6"><EvidenceLegend /></div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold">Signals behind this field ({fieldCards.length})</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {fieldCards.map((t) => <li key={t.id}><TrendMeta t={t} compact /></li>)}
        </ul>
      </div>
    </section>
  );
}

/** Source, date, geography and evidence badge for a trend. */
export function TrendMeta({ t, compact = false }: { t: Trend; compact?: boolean }) {
  const ev = (t.evidenceType ?? 'Illustrative') as Evidence;
  return (
    <div className={cn('rounded-2xl border bg-background p-4 text-sm', compact ? '' : 'mt-4')} data-testid={`meta-trend-${t.id}`}>
      {compact && <p className="mb-1 font-semibold leading-snug">{t.title}</p>}
      {compact && <p className="mb-2 text-xs text-muted-foreground">{t.summary}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <EvidenceBadge type={ev} />
        <span className="rounded-full bg-secondary px-2 py-0.5">{t.geography ?? 'Not specified'}</span>
        <span className="font-mono text-muted-foreground">{t.publishedDate}</span>
      </div>
      {t.sourceName && t.sourceUrl ? (
        <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">Source: {t.sourceName} <ExternalLink className="h-3 w-3" /></a>
      ) : <p className="mt-2 text-xs text-muted-foreground">No external source</p>}
    </div>
  );
}
