import { motion } from 'framer-motion';
import { Award, Link2, RotateCcw } from 'lucide-react';
import { useStore, type StepStatus } from '@/lib/store';
import { useRoadmap } from '@/hooks/use-roadmap';
import { PageHeader, ErrorState, CardSkeletons, LockedPrompt, NextStep, Ring, stagger } from '@/components/common';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const STATUS: { v: StepStatus; l: string }[] = [{ v: 'not-started', l: 'Not started' }, { v: 'in-progress', l: 'In progress' }, { v: 'completed', l: 'Completed' }];

export default function TrackerPage() {
  const { profile, targetId, progress, updateStep, resetProgress } = useStore();
  const { roadmap, isPending, isError, retry } = useRoadmap();
  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Progress tracking follows your roadmap, which needs a profile." href="/app/understand" cta="Go to Understand Me" />;
  if (!targetId) return <LockedPrompt title="Choose a target career" body="Pick a career to generate a roadmap you can track." href="/app/explore/market" cta="Open Career Market" />;
  const steps = roadmap?.steps ?? [];
  const done = steps.filter((s) => progress[s.skillId]?.status === 'completed');
  const inProg = steps.filter((s) => progress[s.skillId]?.status === 'in-progress').length;
  const pct = steps.length ? (done.length / steps.length) * 100 : 0;

  return (
    <div>
      <PageHeader eyebrow="Roadmap / Progress Tracker" title="Progress Tracker" description="Saved in this browser, so a refresh never loses your work."
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild><button className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm hover:bg-secondary" data-testid="button-reset-progress"><RotateCcw className="h-4 w-4" /> Reset</button></AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader><AlertDialogTitle>Reset all progress?</AlertDialogTitle><AlertDialogDescription>Statuses, dates, notes and evidence links will be cleared. Your profile stays.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Keep progress</AlertDialogCancel><AlertDialogAction onClick={resetProgress} data-testid="button-confirm-reset">Reset</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        } />
      {isError && <ErrorState onRetry={retry} />}
      {isPending && <CardSkeletons n={3} h="h-28" />}
      {roadmap && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col items-center rounded-3xl border bg-card p-6">
              <Ring value={pct} size={170} stroke={14} sub="complete" />
              <div className="mt-5 grid w-full grid-cols-3 text-center text-xs">
                <div><p className="font-display text-xl font-bold">{done.length}</p><p className="text-muted-foreground">done</p></div>
                <div><p className="font-display text-xl font-bold">{inProg}</p><p className="text-muted-foreground">active</p></div>
                <div><p className="font-display text-xl font-bold">{steps.length - done.length - inProg}</p><p className="text-muted-foreground">to go</p></div>
              </div>
            </div>
            <div className="rounded-3xl border bg-card p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Award className="h-4 w-4 text-teal" /> Skills gained so far</p>
              {done.length === 0 ? <p className="text-sm text-muted-foreground">Complete a step and it lands here, then on your resume.</p> : (
                <ul className="space-y-2">{done.map((s) => <li key={s.skillId} className="flex items-center justify-between text-sm" data-testid={`text-gained-${s.skillId}`}><span>{s.skill}</span><span className="font-mono text-xs text-muted-foreground">{progress[s.skillId]?.completedAt}</span></li>)}</ul>
              )}
            </div>
          </div>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-3">
            {steps.length === 0 && <p className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">No roadmap steps to track for this career.</p>}
            {steps.map((s) => {
              const p = progress[s.skillId];
              const st = p?.status ?? 'not-started';
              const course = s.resources[0] ? { title: s.resources[0].title, provider: s.resources[0].provider } : undefined;
              return (
                <motion.div variants={stagger.item} key={s.skillId} className="rounded-3xl border bg-card p-5" data-testid={`row-tracker-${s.skillId}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{String(s.order).padStart(2, '0')}</span><h3 className="font-semibold">{s.skill}</h3></div>
                    <div className="flex rounded-full bg-secondary p-1">
                      {STATUS.map((o) => (
                        <button key={o.v} onClick={() => updateStep(s.skillId, { skill: s.skill, status: o.v, course })} data-testid={`button-status-${s.skillId}-${o.v}`}
                          className={cn('rounded-full px-3 py-1 text-xs font-medium transition', st === o.v ? (o.v === 'completed' ? 'bg-teal text-white' : o.v === 'in-progress' ? 'bg-primary text-primary-foreground' : 'bg-card shadow-sm') : 'text-muted-foreground')}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[150px_1fr_1fr]">
                    <Input type="date" value={p?.completedAt ?? ''} disabled={st !== 'completed'} onChange={(e) => updateStep(s.skillId, { skill: s.skill, completedAt: e.target.value })} data-testid={`input-date-${s.skillId}`} />
                    <Input placeholder="Notes (optional)" value={p?.notes ?? ''} onChange={(e) => updateStep(s.skillId, { skill: s.skill, notes: e.target.value })} data-testid={`input-notes-${s.skillId}`} />
                    <div className="relative"><Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Evidence link, e.g. GitHub" value={p?.evidence ?? ''} onChange={(e) => updateStep(s.skillId, { skill: s.skill, evidence: e.target.value })} data-testid={`input-evidence-${s.skillId}`} /></div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
      <NextStep href="/app/roadmap/resume" hint="Next" label="Generate My Resume" />
    </div>
  );
}
