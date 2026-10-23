import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, ChevronDown, GitCompare, Target, X } from 'lucide-react';
import { useMatchCareers, type CareerMatch } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { useAutoMutation } from '@/hooks/use-auto-mutation';
import { PageHeader, ModeBadge, ErrorState, CardSkeletons, LockedPrompt, NextStep, Ring, Bar, Disclaimer, stagger } from '@/components/common';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function SkillChip({ name, tone }: { name: string; tone: 'ok' | 'gap' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
      tone === 'ok' ? 'bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/20' : 'bg-amber/15 text-[hsl(30_80%_30%)] ring-1 ring-amber/30')}>
      {tone === 'ok' ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber" />}{name}
    </span>
  );
}

function MatchCard({ m, rank, chosen, onChoose, compareSel, onCompare }: { m: CareerMatch; rank: number; chosen: boolean; onChoose: () => void; compareSel: boolean; onCompare: () => void }) {
  const [open, setOpen] = useState(rank === 1);
  const o = m.occupation;
  return (
    <motion.article variants={stagger.item} layout className={cn('rounded-3xl border bg-card p-5 md:p-6 transition-shadow', chosen && 'ring-2 ring-teal', rank === 1 && 'shadow-xl shadow-primary/5')} data-testid={`card-match-${o.id}`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted-foreground">#{rank}</span>
          <Ring value={m.score} size={84} stroke={8} sub="indicator" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">{o.title}</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{o.industry}</span>
            {chosen && <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2 py-0.5 text-[11px] font-semibold text-white"><Target className="h-3 w-3" /> Your target</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{o.description}</p>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-4 text-xs">
            <div><div className="mb-1 flex justify-between"><span className="text-muted-foreground">Skill coverage</span><span className="font-mono">{Math.round(m.coverage)}%</span></div><Bar value={m.coverage} delay={0.2} /></div>
            <div><div className="mb-1 flex justify-between"><span className="text-muted-foreground">Interest alignment</span><span className="font-mono">{Math.round(m.interestAlignment)}%</span></div><Bar value={m.interestAlignment} tone="teal" delay={0.3} /></div>
          </div>
        </div>
        <div className="flex flex-row gap-2 md:flex-col">
          <button onClick={onChoose} disabled={chosen} data-testid={`button-choose-${o.id}`}
            className={cn('inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition', chosen ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground hover:opacity-90')}>
            {chosen ? <><CheckCircle2 className="h-4 w-4" /> Chosen</> : 'Choose this career'}
          </button>
          <button onClick={onCompare} data-testid={`button-compare-${o.id}`}
            className={cn('inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm transition', compareSel ? 'border-primary bg-secondary text-primary' : 'hover:bg-secondary')}>
            <GitCompare className="h-4 w-4" /> {compareSel ? 'Comparing' : 'Compare'}
          </button>
        </div>
      </div>
      <button onClick={() => setOpen((x) => !x)} className="mt-4 flex w-full items-center gap-2 border-t pt-3 text-sm font-medium text-primary" data-testid={`button-why-${o.id}`}>
        Why this career? <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-5 pt-4 md:grid-cols-2">
              <ul className="space-y-2">{m.reasons.map((r, i) => <li key={i} className="flex gap-2 text-sm"><span className="mt-2 h-1 w-3 shrink-0 rounded bg-teal" />{r}</li>)}</ul>
              <div className="space-y-3">
                <div><p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Matched skills</p><div className="flex flex-wrap gap-1.5">{m.matchedSkills.length ? m.matchedSkills.map((s) => <SkillChip key={s.skillId} name={s.name} tone="ok" />) : <span className="text-xs text-muted-foreground">None yet</span>}</div></div>
                <div><p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Skills to build</p><div className="flex flex-wrap gap-1.5">{m.missingSkills.length ? m.missingSkills.map((s) => <SkillChip key={s.skillId} name={s.name} tone="gap" />) : <span className="text-xs text-muted-foreground">No gaps found</span>}</div></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Compare({ a, b, onClose }: { a: CareerMatch; b: CareerMatch; onClose: () => void }) {
  const rows: [string, (m: CareerMatch) => number][] = [['Suitability indicator', (m) => m.score], ['Skill coverage', (m) => m.coverage], ['Interest alignment', (m) => m.interestAlignment]];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mb-8 rounded-3xl border-2 border-primary/20 bg-card p-6" data-testid="panel-compare">
      <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold"><GitCompare className="h-5 w-5 text-primary" /> Side by side</h2><button onClick={onClose} data-testid="button-close-compare" className="rounded-full p-2 hover:bg-secondary"><X className="h-4 w-4" /></button></div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-4">
        <h3 className="text-right font-display text-lg font-semibold">{a.occupation.title}</h3><span /><h3 className="font-display text-lg font-semibold">{b.occupation.title}</h3>
        {rows.map(([l, f]) => (
          <div key={l} className="contents">
            <div className="flex items-center gap-2"><span className="font-mono text-xs">{Math.round(f(a))}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><motion.div className="ml-auto h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${f(a)}%` }} transition={{ duration: 0.8 }} /></div></div>
            <span className="w-28 text-center text-xs text-muted-foreground">{l}</span>
            <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-teal" initial={{ width: 0 }} animate={{ width: `${f(b)}%` }} transition={{ duration: 0.8 }} /></div><span className="font-mono text-xs">{Math.round(f(b))}</span></div>
          </div>
        ))}
        <div className="flex flex-wrap justify-end gap-1.5">{a.missingSkills.map((s) => <SkillChip key={s.skillId} name={s.name} tone="gap" />)}</div>
        <span className="w-28 text-center text-xs text-muted-foreground">Skills to build</span>
        <div className="flex flex-wrap gap-1.5">{b.missingSkills.map((s) => <SkillChip key={s.skillId} name={s.name} tone="gap" />)}</div>
      </div>
    </motion.div>
  );
}

export default function MarketPage() {
  const { profile, targetId, setTarget } = useStore();
  const m = useMatchCareers();
  const retry = useAutoMutation(m.mutate, profile);
  const [cmp, setCmp] = useState<string[]>([]);
  const { toast } = useToast();
  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Career matching needs your skills and interests. It takes about two minutes, or load the demo profile." href="/app/understand" cta="Go to Understand Me" />;
  const results = m.data?.results ?? [];
  const pair = cmp.map((id) => results.find((r) => r.occupation.id === id)).filter(Boolean) as CareerMatch[];
  const toggleCmp = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));

  return (
    <div>
      <PageHeader eyebrow="Explore Me / Career Market" title="Future Role Matcher"
        description="Careers ranked against your profile. Scores are a prototype suitability indicator, not a guarantee of fit or employment."
        actions={m.data && <ModeBadge mode={m.data.mode} label={m.data.modeLabel} />} />
      {cmp.length === 1 && <p className="mb-4 rounded-xl bg-secondary px-4 py-2 text-sm">Pick one more career to compare.</p>}
      <AnimatePresence>{pair.length === 2 && <Compare a={pair[0]} b={pair[1]} onClose={() => setCmp([])} />}</AnimatePresence>
      {m.isError && <ErrorState onRetry={retry} />}
      {m.isPending && <CardSkeletons n={4} h="h-36" />}
      {m.data && results.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No careers matched yet. Try adding more skills in your profile.</p>}
      {results.length > 0 && (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-4">
          {results.map((r, i) => (
            <MatchCard key={r.occupation.id} m={r} rank={i + 1} chosen={targetId === r.occupation.id}
              onChoose={() => { setTarget(r.occupation.id, r.occupation.title); toast({ title: `Target set: ${r.occupation.title}`, description: 'Your Skill Roadmap is ready.' }); }}
              compareSel={cmp.includes(r.occupation.id)} onCompare={() => toggleCmp(r.occupation.id)} />
          ))}
        </motion.div>
      )}
      <div className="mt-6"><Disclaimer>Recommendations are decision support based on the information you provided. They do not reflect real-time job availability.</Disclaimer></div>
      {targetId ? <NextStep href="/app/roadmap" hint="Next" label="Next: Build my Roadmap" /> : (
        <p className="mt-12 rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground" data-testid="text-choose-hint">Choose a career above to unlock your Skill Roadmap.</p>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground" data-testid="text-optional-note">Want to go deeper? Trends and the Career Time Machine are optional. You can open them any time from Explore Me in the sidebar.</p>
    </div>
  );
}
