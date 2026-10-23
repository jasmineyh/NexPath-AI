import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useSearch, useLocation, Link } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { FileUp, PenLine, RotateCcw, ArrowLeft, ArrowRight, Briefcase, ExternalLink, FlaskConical, Lightbulb, Pencil, Plus, Sparkles, Trash2, X, Target, Compass } from 'lucide-react';
import { useGetProfileSummary, useListSkills, getListSkillsQueryKey, type CvAnalysis, type Profile, type Experience } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { DEMO_PROFILE, EDUCATION_LEVELS, STATUSES } from '@/lib/demo';
import { useAutoMutation } from '@/hooks/use-auto-mutation';
import { PageHeader, ModeBadge, DemoBadge, ErrorState, Shimmer, Disclaimer, NextStep, stagger } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CvUpload, CvReview, PrivacyNote } from '@/components/cv-flow';
import { cn } from '@/lib/utils';

const EMPTY: Profile = { name: '', educationLevel: '', major: '', institution: '', status: '', experiences: [], technicalSkills: [], humanSkills: [], selfDescription: '', interests: '', goals: '' };
const STEPS = ['About you', 'Experience', 'Skills', 'In your words', 'Interests & goals'];

function TagInput({ value, onChange, suggestions, placeholder, testid }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder: string; testid: string }) {
  const [text, setText] = useState('');
  const add = (t: string) => {
    const v = t.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
    if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };
  const filtered = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()) && (!text || s.toLowerCase().includes(text.toLowerCase()))).slice(0, 10);
  return (
    <div>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border bg-card p-2 focus-within:ring-2 focus-within:ring-ring/40">
        <AnimatePresence>
          {value.map((t) => (
            <motion.span key={t} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              {t}
              <button onClick={() => onChange(value.filter((x) => x !== t))} data-testid={`button-remove-${testid}-${t}`}><X className="h-3 w-3" /></button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => text && add(text)} placeholder={value.length ? 'Add more...' : placeholder}
          className="min-w-[140px] flex-1 bg-transparent px-2 py-1 text-sm outline-none" data-testid={`input-${testid}`} />
      </div>
      {filtered.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="mr-1 self-center text-[11px] uppercase tracking-wider text-muted-foreground">Suggestions</span>
          {filtered.map((s) => (
            <button key={s} onClick={() => add(s)} data-testid={`button-suggest-${testid}-${s}`}
              className="rounded-full border border-dashed border-primary/30 px-2.5 py-1 text-xs text-primary hover:border-solid hover:bg-secondary">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Survey({ initial, onDone, startDemo = false }: { initial: Profile; onDone: (p: Profile, demo: boolean) => void; startDemo?: boolean }) {
  const [p, setP] = useState<Profile>(startDemo ? DEMO_PROFILE : initial);
  const [demo, setDemo] = useState(startDemo);
  const [step, setStep] = useState(startDemo ? STEPS.length - 1 : 0);
  const [dir, setDir] = useState(1);
  const { data: skills } = useListSkills({ query: { queryKey: getListSkillsQueryKey(), staleTime: Infinity } });
  const tech = useMemo(() => (skills ?? []).filter((s) => s.category === 'technical').map((s) => s.name), [skills]);
  const prof = useMemo(() => (skills ?? []).filter((s) => s.category === 'professional').map((s) => s.name), [skills]);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => { setP((x) => ({ ...x, [k]: v })); setDemo(false); };
  const exps = p.experiences ?? [];
  const setExp = (i: number, patch: Partial<Experience>) => set('experiences', exps.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const valid = [
    !!p.educationLevel && !!p.major.trim() && !!p.status,
    true,
    p.technicalSkills.length + p.humanSkills.length > 0,
    true,
    true,
  ];
  const go = (d: number) => { setDir(d); setStep((s) => s + d); };
  const loadDemo = () => { setP(DEMO_PROFILE); setDemo(true); setStep(STEPS.length - 1); };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        <button onClick={loadDemo} data-testid="button-load-demo"
          className="group w-full rounded-2xl border border-amber/40 bg-gradient-to-br from-amber/10 to-transparent p-4 text-left transition hover:border-amber">
          <div className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-amber" /> Load synthetic demo profile</div>
          <p className="mt-1 text-xs text-muted-foreground">Fills the survey as "Alex Tan", a synthetic CS fresh graduate. Labelled as demo data.</p>
        </button>
        <ol className="hidden space-y-1 lg:block">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button disabled={i > step && !valid.slice(0, i).every(Boolean)} onClick={() => { setDir(i > step ? 1 : -1); setStep(i); }}
                className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition', i === step ? 'bg-card shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground disabled:opacity-50')}
                data-testid={`button-step-${i}`}>
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', i < step ? 'bg-teal text-white' : i === step ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>{i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl border bg-card p-6 md:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-[0.16em] text-teal">Step {step + 1} of {STEPS.length}</span>
            {demo && <DemoBadge />}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-teal" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
          <h2 className="mt-5 text-2xl font-bold">{STEPS[step]}</h2>
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -dir * 30 }} transition={{ duration: 0.3 }} className="space-y-5">
            {step === 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label>Name (optional)</Label><Input value={p.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Nurul Aisyah" data-testid="input-name" /></div>
                  <div className="space-y-1.5">
                    <Label>Education level *</Label>
                    <Select value={p.educationLevel} onValueChange={(v) => set('educationLevel', v)}>
                      <SelectTrigger data-testid="select-education"><SelectValue placeholder="Choose level" /></SelectTrigger>
                      <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Major / field *</Label><Input value={p.major} onChange={(e) => set('major', e.target.value)} placeholder="e.g. BSc Computer Science" data-testid="input-major" /></div>
                  <div className="space-y-1.5"><Label>Institution (optional)</Label><Input value={p.institution ?? ''} onChange={(e) => set('institution', e.target.value)} placeholder="e.g. Universiti Teknologi Malaysia" data-testid="input-institution" /></div>
                </div>
                <div className="space-y-2">
                  <Label>Current status *</Label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {STATUSES.map((s) => (
                      <button key={s.value} onClick={() => set('status', s.value)} data-testid={`button-status-${s.value.replace(' ', '-')}`}
                        className={cn('rounded-xl border px-3 py-3 text-sm transition', p.status === s.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40')}>{s.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <p className="text-sm text-muted-foreground">Add work, internships and projects. Only what you enter here will ever appear on your resume.</p>
                {exps.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    <Briefcase className="mx-auto mb-2 h-6 w-6 text-primary/60" /> No entries yet. Class projects and part-time jobs count too.
                  </div>
                )}
                {exps.map((e, i) => (
                  <motion.div key={i} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border bg-background/60 p-4">
                    <div className="flex items-center gap-2">
                      {(['work', 'internship', 'project'] as const).map((k) => (
                        <button key={k} onClick={() => setExp(i, { kind: k })} className={cn('rounded-full px-3 py-1 text-xs capitalize', (e.kind ?? 'work') === k ? 'bg-primary text-primary-foreground' : 'bg-secondary')} data-testid={`button-kind-${i}-${k}`}>{k}</button>
                      ))}
                      <button onClick={() => set('experiences', exps.filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-remove-exp-${i}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={e.title} onChange={(ev) => setExp(i, { title: ev.target.value })} placeholder="Title" data-testid={`input-exp-title-${i}`} />
                      <Input value={e.org} onChange={(ev) => setExp(i, { org: ev.target.value })} placeholder="Organisation" data-testid={`input-exp-org-${i}`} />
                    </div>
                    <Textarea value={e.description} onChange={(ev) => setExp(i, { description: ev.target.value })} placeholder="What did you do?" rows={2} data-testid={`input-exp-desc-${i}`} />
                  </motion.div>
                ))}
                <button onClick={() => set('experiences', [...exps, { title: '', org: '', description: '', kind: 'work' }])} data-testid="button-add-experience"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-secondary"><Plus className="h-4 w-4" /> Add entry</button>
              </>
            )}
            {step === 2 && (
              <>
                <div className="space-y-2"><Label>Technical skills</Label><TagInput value={p.technicalSkills} onChange={(v) => set('technicalSkills', v)} suggestions={tech} placeholder="Type a skill and press Enter" testid="tech-skills" /></div>
                <div className="space-y-2"><Label>Human / transferable skills</Label><TagInput value={p.humanSkills} onChange={(v) => set('humanSkills', v)} suggestions={prof} placeholder="e.g. Teamwork" testid="human-skills" /></div>
              </>
            )}
            {step === 3 && (
              <div className="space-y-2">
                <Label>Describe what you can do, in your own words</Label>
                <Textarea rows={6} value={p.selfDescription ?? ''} onChange={(e) => set('selfDescription', e.target.value)} placeholder={'e.g. "I make charts and reports from spreadsheet data and explain them to my team."'} data-testid="input-self-description" />
                <p className="flex items-start gap-2 text-xs text-muted-foreground"><Lightbulb className="mt-0.5 h-3.5 w-3.5 text-amber" /> Plain language works best. This text is used for semantic matching, so "I make charts" can connect to data visualisation skills.</p>
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-4">
                <div className="space-y-1.5"><Label>Career interests</Label><Input value={p.interests ?? ''} onChange={(e) => set('interests', e.target.value)} placeholder="e.g. AI, data analytics, fintech" data-testid="input-interests" /></div>
                <div className="space-y-1.5"><Label>Goals</Label><Textarea rows={3} value={p.goals ?? ''} onChange={(e) => set('goals', e.target.value)} placeholder="Where do you want to be in 1-2 years?" data-testid="input-goals" /></div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t pt-5">
          <button disabled={step === 0} onClick={() => go(-1)} data-testid="button-prev-step" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-30 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /> Back</button>
          {step < STEPS.length - 1 ? (
            <button disabled={!valid[step]} onClick={() => go(1)} data-testid="button-next-step" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">Continue <ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button disabled={!valid.every(Boolean)} onClick={() => onDone(p, demo)} data-testid="button-generate-summary" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-teal px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-40"><Sparkles className="h-4 w-4" /> Generate my profile summary</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({ profile, isDemo, onEdit }: { profile: Profile; isDemo: boolean; onEdit: () => void }) {
  const m = useGetProfileSummary();
  const retry = useAutoMutation(m.mutate, profile);
  const s = m.data;
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-2">
        {isDemo && <DemoBadge />}
        {s && <ModeBadge mode={s.mode} label={s.modeLabel} />}
        <button onClick={onEdit} data-testid="button-edit-profile" className="ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /> Edit answers</button>
      </div>
      {m.isError && <ErrorState onRetry={retry} />}
      {(m.isPending || m.isIdle) && !m.isError && (
        <div className="grid gap-4 md:grid-cols-2"><Shimmer className="h-48 md:col-span-2" /><Shimmer className="h-40" /><Shimmer className="h-40" /></div>
      )}
      {s && (
        <>
          <section>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-teal">Step B / Career profile summary</p>
            <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-6">
              <motion.div variants={stagger.item} className="relative overflow-hidden rounded-3xl bg-navy p-7 text-white md:col-span-6">
                <svg className="absolute -right-10 -top-10 h-64 w-64 opacity-20 spin-slow" viewBox="0 0 100 100" aria-hidden>{[10, 20, 30, 40, 48].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="hsl(172 62% 60%)" strokeWidth=".4" />)}</svg>
                <p className="text-xs uppercase tracking-[0.18em] text-sidebar-primary">Professional overview</p>
                <p className="relative mt-3 max-w-3xl font-display text-xl leading-snug md:text-2xl" data-testid="text-overview">{s.overview}</p>
              </motion.div>
              <motion.div variants={stagger.item} className="rounded-3xl border bg-card p-6 md:col-span-3">
                <h3 className="font-semibold">Skills you stated</h3>
                <p className="mb-4 text-xs text-muted-foreground">Exactly what you entered.</p>
                <div className="flex flex-wrap gap-2">{s.statedSkills.map((k) => <span key={k} className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{k}</span>)}</div>
              </motion.div>
              <motion.div variants={stagger.item} className="rounded-3xl border border-teal/30 bg-accent/40 p-6 md:col-span-3">
                <h3 className="font-semibold">Inferred transferable strengths</h3>
                <p className="mb-4 text-xs text-accent-foreground/80">System inference, with the evidence it used.</p>
                {s.inferredStrengths.length === 0 ? <p className="text-sm text-muted-foreground">No extra strengths inferred. Add a self-description for richer inference.</p> : (
                  <ul className="space-y-3">{s.inferredStrengths.map((x) => (
                    <li key={x.skillId} className="rounded-xl bg-card/80 p-3" data-testid={`text-inferred-${x.skillId}`}>
                      <p className="text-sm font-medium">{x.name} <span className="ml-1 rounded bg-teal/15 px-1.5 py-0.5 text-[10px] uppercase text-accent-foreground">inferred</span></p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Evidence: {x.evidence}</p>
                    </li>
                  ))}</ul>
                )}
              </motion.div>
              <motion.div variants={stagger.item} className="rounded-3xl border bg-card p-6 md:col-span-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><Compass className="h-4 w-4 text-primary" /> Preliminary career directions</h3>
                <ul className="space-y-2">{s.directions.map((d, i) => <li key={i} className="flex gap-3 text-sm"><span className="font-mono text-xs text-teal">0{i + 1}</span>{d}</li>)}</ul>
              </motion.div>
              <motion.div variants={stagger.item} className="rounded-3xl border bg-card p-6 md:col-span-2">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-amber" /> Areas for development</h3>
                <ul className="space-y-2">{s.developmentAreas.map((d, i) => <li key={i} className="text-sm text-muted-foreground">{d}</li>)}</ul>
              </motion.div>
            </motion.div>
            <div className="mt-4"><Disclaimer>This reflects information you submitted plus labelled system inferences. It is not a psychological or competence assessment.</Disclaimer></div>
          </section>

          <section>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-teal">Step C</p>
            <h2 className="mb-5 text-2xl font-bold">Your market, linked to you</h2>
            {s.marketInsights.length === 0 ? <p className="text-sm text-muted-foreground">No linked insights for this profile yet. Explore all trends instead.</p> : (
              <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
                {s.marketInsights.slice(0, 5).map((t) => (
                  <motion.article variants={stagger.item} key={t.id} className="card-lift rounded-2xl border bg-card p-5" data-testid={`card-insight-${t.id}`}>
                    <h3 className="font-semibold leading-snug">{t.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{t.summary}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-xs">
                      <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">{t.sourceName} <ExternalLink className="h-3 w-3" /></a>
                      <span className="font-mono text-muted-foreground">{t.publishedDate}</span>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}
          </section>
          <NextStep href="/app/explore/market" hint="Next" label="Explore Me: see careers ranked for you" />
        </>
      )}
    </div>
  );
}

type View = 'choose' | 'cv' | 'review' | 'survey' | 'demo' | 'summary';

function EntryChoice({ onPick }: { onPick: (v: 'cv' | 'survey' | 'demo') => void }) {
  const opts = [
    { v: 'cv' as const, icon: FileUp, t: 'Upload my CV (auto-fill)', d: 'PDF, DOCX or TXT. We read it in your browser, fill the form, and you review every field.', cls: 'bg-gradient-to-br from-primary to-[hsl(186_70%_30%)] text-white md:row-span-2' },
    { v: 'survey' as const, icon: PenLine, t: 'Fill in manually', d: 'Five short guided steps.', cls: 'bg-card border' },
    { v: 'demo' as const, icon: FlaskConical, t: 'Load demo profile', d: 'Synthetic persona "Alex Tan", labelled as demo data.', cls: 'border border-amber/40 bg-amber/5' },
  ];
  return (
    <div className="space-y-4">
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
        {opts.map((o) => (
          <motion.button variants={stagger.item} key={o.v} onClick={() => onPick(o.v)} data-testid={`button-entry-${o.v}`}
            className={cn('card-lift group flex flex-col justify-between rounded-3xl p-6 text-left', o.cls)}>
            <o.icon className="h-7 w-7 opacity-90" />
            <div className="mt-8"><p className="font-display text-xl font-bold">{o.t}</p><p className="mt-1 text-sm opacity-75">{o.d}</p></div>
            <ArrowRight className="mt-4 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        ))}
      </motion.div>
      <PrivacyNote />
    </div>
  );
}

export default function UnderstandPage() {
  const { profile, isDemo, source, setProfile, clearAll } = useStore();
  const search = useSearch();
  const [, navigate] = useLocation();
  const editInit: View = source === 'cv' ? 'review' : 'survey';
  const [view, setView] = useState<View>(!profile ? 'choose' : search.includes('edit=1') ? editInit : 'summary');
  const [cv, setCv] = useState<CvAnalysis | null>(null);
  const { toast } = useToast();
  useEffect(() => { if (search.includes('edit=1') && profile) setView(source === 'cv' ? 'review' : 'survey'); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (p: Profile, src: 'cv' | 'manual' | 'demo') => {
    setProfile(p, src); setView('summary'); setCv(null); navigate('/app/understand');
    toast({ title: 'Profile saved', description: 'Matches and roadmap will recalculate for this profile.' });
  };
  const startOver = () => { clearAll(); setCv(null); setView('choose'); navigate('/app/understand'); toast({ title: 'Your data was removed', description: 'Profile, target career, progress and resume edits were cleared from this browser.' }); };
  const titles: Record<View, string> = { choose: 'How would you like to start?', cv: 'Upload my CV', review: 'Review extracted information', survey: 'Tell us about you', demo: 'Tell us about you', summary: 'Your career profile' };

  return (
    <div>
      <PageHeader eyebrow="Understand Me" title={titles[view]}
        description={view === 'summary' ? 'A transparent summary of what you told us and what the system inferred.' : 'Your answers stay in this browser; nothing is stored on a server.'}
        actions={(profile || view !== 'choose') && (
          <button onClick={startOver} data-testid="button-start-over" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-sm text-muted-foreground hover:border-destructive/40 hover:text-destructive"><RotateCcw className="h-4 w-4" /> Remove my data / start over</button>
        )} />
      {view === 'choose' && <EntryChoice onPick={(v) => setView(v)} />}
      {view === 'cv' && <CvUpload onCancel={() => setView('choose')} onManual={() => setView('survey')} onResult={(a) => { setCv(a); setView('review'); }} />}
      {view === 'review' && (
        <CvReview key={cv ? 'cv' : 'edit'} initial={cv?.profile ?? profile ?? EMPTY} analysis={cv}
          onCancel={() => setView(profile ? 'summary' : 'choose')} onConfirm={(p) => save(p, 'cv')} />
      )}
      {(view === 'survey' || view === 'demo') && (
        <Survey key={view} startDemo={view === 'demo'} initial={profile ?? EMPTY} onDone={(p, demo) => save(p, demo ? 'demo' : source === 'cv' ? 'cv' : 'manual')} />
      )}
      {view === 'summary' && profile && <Summary profile={profile} isDemo={isDemo} onEdit={() => setView(source === 'cv' ? 'review' : 'survey')} />}
      {view === 'summary' && !profile && <Link href="/app/understand?edit=1">Start</Link>}
    </div>
  );
}
