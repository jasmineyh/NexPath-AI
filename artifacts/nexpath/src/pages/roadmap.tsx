import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CheckCircle2, Clock, ExternalLink, History, Link2, RotateCcw, Save, Search, Target } from 'lucide-react';
import type { RoadmapStep } from '@workspace/api-client-react';
import { useStore, type StepStatus, type StepProgress } from '@/lib/store';
import { useRoadmap } from '@/hooks/use-roadmap';
import { PageHeader, ErrorState, CardSkeletons, LockedPrompt, NextStep, Ring, stagger } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LABEL: Record<StepStatus, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', completed: 'Completed' };
const BADGE: Record<StepStatus, string> = { 'not-started': 'bg-secondary text-secondary-foreground', 'in-progress': 'bg-primary/10 text-primary', completed: 'bg-teal text-white' };
const pctOf = (p?: StepProgress) => (p?.status === 'completed' ? 100 : p?.percent ?? 0);

function Detail({ s, p }: { s: RoadmapStep; p?: StepProgress }) {
  const { updateStep, addHistory } = useStore();
  const { toast } = useToast();
  const [status, setStatus] = useState<StepStatus>(p?.status ?? 'not-started');
  const [pct, setPct] = useState(pctOf(p));
  const [notes, setNotes] = useState(p?.notes ?? '');
  const [evidence, setEvidence] = useState(p?.evidence ?? '');
  const prompt100 = pct === 100 && status !== 'completed';

  const changeStatus = (v: StepStatus) => {
    setStatus(v);
    if (v === 'completed') setPct(100);
    else if (v === 'not-started') setPct(0);
    else if (pct === 100) setPct(90);
  };
  const save = () => {
    const course = s.resources[0] ? { title: s.resources[0].title, provider: s.resources[0].provider } : undefined;
    const before = pctOf(p);
    updateStep(s.skillId, { skill: s.skill, status, percent: pct, notes, evidence, course });
    addHistory({ skillId: s.skillId, text: `${s.skill}: ${before}% -> ${pct}%, ${LABEL[status]}` });
    toast({ title: 'Update saved', description: `${s.skill}: ${LABEL[status]} (${pct}%)` });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-card p-5 md:p-6" data-testid={`panel-step-${s.skillId}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">Step {s.order}</p>
      <h3 className="mt-1 text-2xl font-bold">{s.skill}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{s.why}</p>
      <div className="mt-4 rounded-2xl bg-secondary/60 p-4 text-sm"><span className="font-semibold">Activity: </span>{s.activity}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 ring-1 ring-border"><Clock className="h-3 w-3" />{s.duration}</span>
        <span className={cn('rounded-full px-2 py-0.5 font-mono text-[10px] uppercase', s.durationBasis === 'provider-stated' ? 'bg-primary/10 text-primary' : 'bg-amber/15 text-[hsl(30_80%_32%)]')}>{s.durationBasis}</span>
      </div>
      <ul className="mt-4 grid gap-2">
        {s.resources.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noreferrer" data-testid={`link-resource-${s.skillId}`} className="group flex items-start gap-3 rounded-2xl border p-3 transition hover:border-primary/40 hover:bg-secondary/40">
              {r.isSearchLink ? <Search className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <ExternalLink className="mt-0.5 h-4 w-4 text-primary" />}
              <span className="min-w-0"><span className="block text-sm font-medium leading-snug group-hover:text-primary">{r.title}</span><span className="text-xs text-muted-foreground">{r.provider}{r.isSearchLink ? ' (search page)' : ''}</span></span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-4 border-t pt-5">
        <p className="font-semibold">Update progress</p>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
          <Select value={status} onValueChange={(v) => changeStatus(v as StepStatus)}>
            <SelectTrigger data-testid="select-step-status"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(LABEL) as StepStatus[]).map((k) => <SelectItem key={k} value={k}>{LABEL[k]}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <Slider value={[pct]} min={0} max={100} step={5} onValueChange={([v]) => { setPct(v); if (v > 0 && v < 100 && status !== 'in-progress') setStatus('in-progress'); if (v < 100 && status === 'completed') setStatus('in-progress'); }} data-testid="slider-step-percent" />
            <span className="w-12 text-right font-mono text-sm" data-testid="text-step-percent">{pct}%</span>
          </div>
        </div>
        <AnimatePresence>
          {prompt100 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 overflow-hidden rounded-2xl bg-accent/60 px-4 py-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-teal" /> <span className="flex-1">You reached 100%. Mark this step as completed?</span>
              <button onClick={() => setStatus('completed')} className="rounded-full bg-teal px-3 py-1 text-xs font-semibold text-white" data-testid="button-mark-completed">Mark completed</button>
            </motion.div>
          )}
        </AnimatePresence>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" data-testid="input-step-notes" />
        <div className="relative"><Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Evidence link, e.g. GitHub or certificate URL" data-testid="input-step-evidence" /></div>
        <button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="button-save-update"><Save className="h-4 w-4" /> Save update</button>
      </div>
    </motion.div>
  );
}

export default function RoadmapPage() {
  const { profile, targetId, targetTitle, progress, updateStep, resetProgress, history } = useStore();
  const { roadmap, isPending, isError, retry } = useRoadmap();
  const [sel, setSel] = useState<string | null>(null);
  const steps = roadmap?.steps ?? [];
  useEffect(() => { if (steps.length && (!sel || !steps.some((s) => s.skillId === sel))) setSel(steps[0].skillId); }, [steps, sel]);

  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Your roadmap is built from the gap between your profile and a target career." href="/app/understand" cta="Go to Understand Me" />;
  if (!targetId) return <LockedPrompt title="Choose a target career" body="Pick a career in the Career Market and we'll order the skills you need." href="/app/explore/market" cta="Open Career Market" />;
  const st = (id: string): StepStatus => progress[id]?.status ?? 'not-started';
  const done = steps.filter((s) => st(s.skillId) === 'completed');
  const inProg = steps.filter((s) => st(s.skillId) === 'in-progress').length;
  const overall = steps.length ? steps.reduce((a, s) => a + pctOf(progress[s.skillId]), 0) / steps.length : 0;
  const selected = steps.find((s) => s.skillId === sel);
  const title = roadmap?.occupationTitle ?? targetTitle ?? 'your target';

  return (
    <div>
      <PageHeader eyebrow="Roadmap / Skill Roadmap & Progress" title="Skill Roadmap & Progress"
        description="An ordered learning pathway for your skill gaps, with progress you can update as you go. Resources link to real providers; when unsure of an exact course, we link to the provider's search page." />
      {isError && <ErrorState onRetry={retry} />}
      {isPending && <CardSkeletons n={4} h="h-32" />}
      {roadmap && (
        <>
          <div className="mb-8 grid gap-4 rounded-3xl border bg-card p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <Ring value={overall} size={130} stroke={12} sub="overall" />
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4 text-teal" /> Target career</p>
              <p className="font-display text-2xl font-bold" data-testid="text-target-career">{title}</p>
              {roadmap.alreadyCovered.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5"><span className="mr-1 self-center text-xs text-muted-foreground">Already covered:</span>{roadmap.alreadyCovered.map((s) => <span key={s} className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs text-emerald-800 ring-1 ring-emerald-600/20">{s}</span>)}</div>}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['Not started', steps.length - done.length - inProg], ['In progress', inProg], ['Completed', done.length]].map(([l, n]) => (
                <div key={l} className="rounded-2xl bg-secondary/60 px-4 py-3" data-testid={`count-${String(l).replace(' ', '-').toLowerCase()}`}><p className="font-display text-2xl font-bold">{n}</p><p className="text-[11px] text-muted-foreground">{l}</p></div>
              ))}
            </div>
          </div>

          {steps.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-12 text-center"><p className="font-display text-xl font-semibold">No gaps found for this career.</p><p className="text-sm text-muted-foreground">Your profile already covers its core skills. Head to your resume.</p></div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              <motion.ol variants={stagger.container} initial="hidden" animate="show" className="space-y-2.5">
                {steps.map((s) => {
                  const p = progress[s.skillId];
                  const active = s.skillId === sel;
                  return (
                    <motion.li variants={stagger.item} key={s.skillId}>
                      <button onClick={() => setSel(s.skillId)} data-testid={`card-step-${s.skillId}`}
                        className={cn('w-full rounded-2xl border bg-card p-4 text-left transition', active ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/30')}>
                        <div className="flex items-center gap-3">
                          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display font-bold', st(s.skillId) === 'completed' ? 'bg-teal text-white' : 'bg-secondary text-primary')}>{st(s.skillId) === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : s.order}</span>
                          <span className="flex-1 font-semibold">{s.skill}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', BADGE[st(s.skillId)])}>{LABEL[st(s.skillId)]}</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-teal" animate={{ width: `${pctOf(p)}%` }} /></div>
                      </button>
                      {active && <div className="mt-3 lg:hidden"><Detail key={s.skillId + JSON.stringify(p ?? {})} s={s} p={p} /></div>}
                    </motion.li>
                  );
                })}
              </motion.ol>
              <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                {selected && <Detail key={selected.skillId + JSON.stringify(progress[selected.skillId] ?? {})} s={selected} p={progress[selected.skillId]} />}
              </div>
            </div>
          )}

          <section className="mt-14">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal">Progress Tracker</p><h2 className="text-2xl font-bold">Your tracker</h2></div>
              <AlertDialog>
                <AlertDialogTrigger asChild><button className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm hover:bg-secondary" data-testid="button-reset-progress"><RotateCcw className="h-4 w-4" /> Reset</button></AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader><AlertDialogTitle>Reset all progress?</AlertDialogTitle><AlertDialogDescription>Statuses, dates, notes, evidence links and update history will be cleared. Your profile stays.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Keep progress</AlertDialogCancel><AlertDialogAction onClick={resetProgress} data-testid="button-confirm-reset">Reset</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div className="overflow-x-auto rounded-3xl border bg-card">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="p-4">Skill</th><th className="p-4">Status</th><th className="p-4">Completed</th><th className="p-4">Notes / evidence</th></tr></thead>
                  <tbody>
                    {steps.map((s) => {
                      const p = progress[s.skillId];
                      return (
                        <tr key={s.skillId} className="border-b last:border-0" data-testid={`row-tracker-${s.skillId}`}>
                          <td className="p-4 font-medium">{s.skill}<div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-teal" style={{ width: `${pctOf(p)}%` }} /></div></td>
                          <td className="p-4"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', BADGE[st(s.skillId)])}>{LABEL[st(s.skillId)]} {pctOf(p)}%</span></td>
                          <td className="p-4">
                            <Input type="date" className="h-8 w-[140px]" value={p?.completedAt ?? ''} disabled={st(s.skillId) !== 'completed'} onChange={(e) => updateStep(s.skillId, { skill: s.skill, completedAt: e.target.value })} data-testid={`input-date-${s.skillId}`} />
                          </td>
                          <td className="max-w-[220px] p-4 text-xs text-muted-foreground">
                            {p?.notes && <p className="line-clamp-2">{p.notes}</p>}
                            {p?.evidence && <a href={p.evidence} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Link2 className="h-3 w-3" /> Evidence</a>}
                            {!p?.notes && !p?.evidence && <span>-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border bg-card p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Award className="h-4 w-4 text-teal" /> Skills gained so far</p>
                  {done.length === 0 ? <p className="text-sm text-muted-foreground">Complete a step and it lands here, then on your resume.</p> : (
                    <ul className="space-y-2">{done.map((s) => <li key={s.skillId} className="flex items-center justify-between text-sm" data-testid={`text-gained-${s.skillId}`}><span>{s.skill}</span><span className="font-mono text-xs text-muted-foreground">{progress[s.skillId]?.completedAt}</span></li>)}</ul>
                  )}
                </div>
                <div className="rounded-3xl border bg-card p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" /> Update history</p>
                  {history.length === 0 ? <p className="text-sm text-muted-foreground">Saved updates will appear here.</p> : (
                    <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">{history.map((h, i) => (
                      <li key={h.at + i} className="border-l-2 border-teal/40 pl-3 text-sm" data-testid={`text-history-${i}`}><p>{h.text}</p><p className="font-mono text-[10px] text-muted-foreground">{new Date(h.at).toLocaleString()}</p></li>
                    ))}</ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      <NextStep href="/app/roadmap/resume" hint="Next" label="Next: Build my Resume" />
    </div>
  );
}
