import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, ExternalLink, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useRoadmap } from '@/hooks/use-roadmap';
import { PageHeader, ErrorState, CardSkeletons, LockedPrompt, NextStep, stagger } from '@/components/common';
import { cn } from '@/lib/utils';

export default function RoadmapPage() {
  const { profile, targetId, targetTitle, progress, updateStep } = useStore();
  const { roadmap, isPending, isError, retry } = useRoadmap();
  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Your roadmap is built from the gap between your profile and a target career." href="/app/understand" cta="Go to Understand Me" />;
  if (!targetId) return <LockedPrompt title="Choose a target career" body="Pick a career in the Career Market and we'll order the skills you need." href="/app/explore/market" cta="Open Career Market" />;
  const steps = roadmap?.steps ?? [];
  const done = steps.filter((s) => progress[s.skillId]?.status === 'completed').length;
  const pct = steps.length ? (done / steps.length) * 100 : 0;

  return (
    <div>
      <PageHeader eyebrow="Roadmap / Skill Roadmap" title={`Path to ${roadmap?.occupationTitle ?? targetTitle ?? 'your target'}`}
        description="An ordered learning pathway for your skill gaps. Resources link to real providers; when we are unsure of an exact course, we link to the provider's search page." />
      {isError && <ErrorState onRetry={retry} />}
      {isPending && <CardSkeletons n={4} h="h-32" />}
      {roadmap && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-[hsl(186_70%_30%)] p-6 text-primary-foreground">
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Progress</p>
              <p className="mt-1 font-display text-4xl font-bold" data-testid="text-roadmap-progress">{done}<span className="text-xl opacity-60"> / {steps.length} steps</span></p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20"><motion.div className="h-full rounded-full bg-white" animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} /></div>
            </div>
            <div className="rounded-3xl border bg-card p-6">
              <p className="mb-3 text-sm font-semibold">Already covered by your profile</p>
              <div className="flex flex-wrap gap-1.5">{roadmap.alreadyCovered.length ? roadmap.alreadyCovered.map((s) => <span key={s} className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-emerald-600/20">{s}</span>) : <span className="text-sm text-muted-foreground">Nothing yet. Every step below is new ground.</span>}</div>
            </div>
          </div>
          {steps.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-12 text-center"><p className="font-display text-xl font-semibold">No gaps found for this career.</p><p className="text-sm text-muted-foreground">Your profile already covers its core skills. Head to your resume.</p></div>
          ) : (
            <motion.ol variants={stagger.container} initial="hidden" animate="show" className="relative space-y-4">
              <span className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-primary via-teal to-transparent" />
              {steps.map((s) => {
                const st = progress[s.skillId]?.status ?? 'not-started';
                const complete = st === 'completed';
                return (
                  <motion.li variants={stagger.item} key={s.skillId} className="relative flex gap-4" data-testid={`card-step-${s.skillId}`}>
                    <span className={cn('relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold transition-colors', complete ? 'bg-teal text-white' : 'border-2 border-primary/20 bg-card text-primary')}>{complete ? <CheckCircle2 className="h-6 w-6" /> : s.order}</span>
                    <div className={cn('flex-1 rounded-3xl border bg-card p-5 transition', complete && 'border-teal/40 bg-accent/30')}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{s.skill}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{s.why}</p>
                        </div>
                        <label className={cn('inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition', complete ? 'border-teal bg-teal text-white' : 'hover:border-primary/40')} data-testid={`checkbox-complete-${s.skillId}`}>
                          <input type="checkbox" className="sr-only" checked={complete}
                            onChange={(e) => updateStep(s.skillId, { skill: s.skill, status: e.target.checked ? 'completed' : 'not-started', course: s.resources[0] ? { title: s.resources[0].title, provider: s.resources[0].provider } : undefined })} />
                          {complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} {complete ? 'Completed' : 'Mark as complete'}
                        </label>
                      </div>
                      <div className="mt-4 rounded-2xl bg-secondary/60 p-4 text-sm"><span className="font-semibold">Activity: </span>{s.activity}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 ring-1 ring-border"><Clock className="h-3 w-3" />{s.duration}</span>
                        <span className={cn('rounded-full px-2 py-0.5 font-mono text-[10px] uppercase', s.durationBasis === 'provider-stated' ? 'bg-primary/10 text-primary' : 'bg-amber/15 text-[hsl(30_80%_32%)]')}>{s.durationBasis}</span>
                      </div>
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {s.resources.map((r) => (
                          <li key={r.url}>
                            <a href={r.url} target="_blank" rel="noreferrer" data-testid={`link-resource-${s.skillId}`} className="group flex items-start gap-3 rounded-2xl border p-3 transition hover:border-primary/40 hover:bg-secondary/40">
                              {r.isSearchLink ? <Search className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <ExternalLink className="mt-0.5 h-4 w-4 text-primary" />}
                              <span className="min-w-0"><span className="block text-sm font-medium leading-snug group-hover:text-primary">{r.title}</span><span className="text-xs text-muted-foreground">{r.provider}{r.isSearchLink ? ' (search page)' : ''}</span></span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ol>
          )}
        </>
      )}
      <NextStep href="/app/roadmap/tracker" hint="Next" label="Track your progress" />
    </div>
  );
}
