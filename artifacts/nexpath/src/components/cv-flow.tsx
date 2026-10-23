import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Lock, PenLine, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useAnalyseCv, type Experience, type Profile } from '@workspace/api-client-react';
import { extractCvText, CvReadError } from '@/lib/cv-extract';
import { EDUCATION_LEVELS, STATUSES } from '@/lib/demo';
import { ModeBadge } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const PRIVACY_NOTE = 'Your CV is processed only to fill your profile. The file itself is not stored.';

export function PrivacyNote() {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-accent/50 px-4 py-2.5 text-xs text-accent-foreground" data-testid="text-privacy-note">
      <Lock className="h-3.5 w-3.5 shrink-0" /> {PRIVACY_NOTE}
    </p>
  );
}

type Phase = 'idle' | 'reading' | 'analysing' | 'error';

export function CvUpload({ onResult, onManual, onCancel }: { onResult: (p: Profile, found: string[], mode: { mode: string; label: string }) => void; onManual: () => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<{ msg: string; unreadable: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const analyse = useAnalyseCv();

  const handle = async (file?: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setPhase('reading');
    let text: string;
    try {
      text = await extractCvText(file);
    } catch (e) {
      const ce = e instanceof CvReadError ? e : null;
      setError({ msg: ce?.message ?? 'We could not read this file.', unreadable: !ce || ce.kind === 'unreadable' });
      setPhase('error');
      return;
    }
    setPhase('analysing');
    analyse.mutate({ data: { text } }, {
      onSuccess: (r) => onResult(r.profile, r.found, { mode: r.mode, label: r.modeLabel }),
      onError: () => { setError({ msg: 'The analysis service did not respond. Your file was not sent anywhere; please try again or use the manual form.', unreadable: false }); setPhase('error'); },
    });
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files?.[0]); };
  const busy = phase === 'reading' || phase === 'analysing';

  return (
    <div className="space-y-4">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        className={cn('relative overflow-hidden rounded-3xl border-2 border-dashed bg-card p-10 text-center transition', drag ? 'border-teal bg-accent/40' : 'border-primary/25', busy && 'pointer-events-none')}
        data-testid="dropzone-cv">
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden"
          onChange={(e) => { void handle(e.target.files?.[0]); e.target.value = ''; }} data-testid="input-cv-file" />
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4" data-testid="status-cv-loading">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-display text-lg font-semibold">{phase === 'reading' ? 'Reading your CV in this browser...' : 'Analysing skills and sections...'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{fileName}</p>
              <div className="mx-auto mt-5 h-1.5 max-w-xs overflow-hidden rounded-full bg-secondary">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-teal" initial={{ width: '5%' }} animate={{ width: phase === 'reading' ? '45%' : '90%' }} transition={{ duration: 1.2 }} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary"><FileUp className="h-7 w-7" /></div>
              <p className="mt-4 font-display text-xl font-semibold">Drop your CV here</p>
              <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX or TXT, up to 5 MB</p>
              <button onClick={() => inputRef.current?.click()} data-testid="button-pick-cv" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Choose a file</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {phase === 'error' && error && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center" data-testid="status-cv-error">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1 text-sm"><p className="font-semibold">{error.unreadable ? 'Could not read this file' : 'Something went wrong'}</p><p className="text-muted-foreground">{error.msg}{error.unreadable ? ' You can fill in the manual form instead.' : ''}</p></div>
          <div className="flex gap-2">
            <button onClick={() => inputRef.current?.click()} className="rounded-full border bg-card px-4 py-2 text-sm" data-testid="button-cv-retry">Try another file</button>
            <button onClick={onManual} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="button-cv-manual">Fill in manually</button>
          </div>
        </motion.div>
      )}
      <PrivacyNote />
      <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground" data-testid="button-cv-cancel">Back to options</button>
    </div>
  );
}

function Field({ label, found, missing, required, children }: { label: string; found: boolean; missing: boolean; required?: boolean; children: ReactNode }) {
  return (
    <div className={cn('space-y-1.5 rounded-2xl p-3 transition', missing && 'bg-amber/10 ring-1 ring-amber/40')}>
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {label}{required && ' *'}
        {found && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground" data-testid={`tag-from-cv-${label}`}>From your CV</span>}
        {missing && <span className="rounded-full bg-amber/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(30_80%_30%)]">Please complete</span>}
      </div>
      {children}
    </div>
  );
}

function ListEditor({ value, onChange, placeholder, testid }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; testid: string }) {
  const [t, setT] = useState('');
  const add = () => { const v = t.trim(); if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]); setT(''); };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">{v}
            <button onClick={() => onChange(value.filter((x) => x !== v))} data-testid={`button-remove-${testid}-${v}`}><X className="h-3 w-3" /></button></span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder} data-testid={`input-${testid}`} />
        <button onClick={add} className="rounded-xl border px-3 text-sm hover:bg-secondary" data-testid={`button-add-${testid}`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function CvReview({ initial, found, mode, onConfirm, onCancel }: { initial: Profile; found: string[]; mode?: { mode: string; label: string }; onConfirm: (p: Profile) => void; onCancel: () => void }) {
  const [p, setP] = useState<Profile>(initial);
  const f = new Set(found);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const exps = p.experiences ?? [];
  const setExp = (i: number, patch: Partial<Experience>) => set('experiences', exps.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const empty = (k: keyof Profile) => { const v = p[k]; return Array.isArray(v) ? v.length === 0 : !v || !String(v).trim(); };
  const miss = (k: keyof Profile) => empty(k);
  const valid = !!p.educationLevel && !!p.major.trim() && !!p.status && p.technicalSkills.length + p.humanSkills.length > 0;
  const fc = (k: string) => f.has(k);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-navy p-6 text-white">
        <CheckCircle2 className="h-6 w-6 text-sidebar-primary" />
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold">Review extracted information</h2>
          <p className="text-sm text-white/70">We found {found.length} field{found.length === 1 ? '' : 's'} in your CV. Check everything, fill the highlighted gaps, then confirm.</p>
        </div>
        {mode && <ModeBadge mode={mode.mode} label={mode.label} />}
      </div>
      <PrivacyNote />

      <section className="rounded-3xl border bg-card p-4 md:p-6">
        <h3 className="mb-3 px-3 font-semibold">Personal details</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Name" found={fc('name')} missing={miss('name')}><Input value={p.name ?? ''} onChange={(e) => set('name', e.target.value)} data-testid="input-review-name" /></Field>
          <Field label="Email" found={fc('email')} missing={miss('email')}><Input value={p.email ?? ''} onChange={(e) => set('email', e.target.value)} data-testid="input-review-email" /></Field>
          <Field label="Phone" found={fc('phone')} missing={miss('phone')}><Input value={p.phone ?? ''} onChange={(e) => set('phone', e.target.value)} data-testid="input-review-phone" /></Field>
          <Field label="Location" found={fc('location')} missing={miss('location')}><Input value={p.location ?? ''} onChange={(e) => set('location', e.target.value)} data-testid="input-review-location" /></Field>
          <div className="md:col-span-2"><Field label="Links (LinkedIn, GitHub, portfolio)" found={fc('links')} missing={miss('links')}><ListEditor value={p.links ?? []} onChange={(v) => set('links', v)} placeholder="Add a link" testid="links" /></Field></div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 md:p-6">
        <h3 className="mb-3 px-3 font-semibold">Education and status</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Education level" required found={fc('educationLevel')} missing={miss('educationLevel')}>
            <Select value={p.educationLevel} onValueChange={(v) => set('educationLevel', v)}>
              <SelectTrigger data-testid="select-review-education"><SelectValue placeholder="Choose level" /></SelectTrigger>
              <SelectContent>{Array.from(new Set([...EDUCATION_LEVELS, ...(p.educationLevel ? [p.educationLevel] : [])])).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Major / field" required found={fc('major')} missing={miss('major')}><Input value={p.major} onChange={(e) => set('major', e.target.value)} data-testid="input-review-major" /></Field>
          <Field label="Institution" found={fc('institution')} missing={miss('institution')}><Input value={p.institution ?? ''} onChange={(e) => set('institution', e.target.value)} data-testid="input-review-institution" /></Field>
          <Field label="Graduation" found={fc('graduation')} missing={miss('graduation')}><Input value={p.graduation ?? ''} onChange={(e) => set('graduation', e.target.value)} placeholder="e.g. 2025" data-testid="input-review-graduation" /></Field>
          <div className="md:col-span-2">
            <Field label="Current status" required found={fc('status')} missing={miss('status')}>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {STATUSES.map((s) => (
                  <button key={s.value} onClick={() => set('status', s.value)} data-testid={`button-review-status-${s.value.replace(' ', '-')}`}
                    className={cn('rounded-xl border px-3 py-2.5 text-sm transition', p.status === s.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}>{s.label}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 md:p-6">
        <Field label="Experience, internships and projects" found={fc('experiences')} missing={miss('experiences')}>
          <div className="space-y-3">
            {exps.map((e, i) => (
              <div key={i} className="space-y-2 rounded-2xl border bg-background/60 p-4" data-testid={`card-review-exp-${i}`}>
                <div className="flex items-center gap-2">
                  {(['work', 'internship', 'project'] as const).map((k) => (
                    <button key={k} onClick={() => setExp(i, { kind: k })} className={cn('rounded-full px-3 py-1 text-xs capitalize', (e.kind ?? 'work') === k ? 'bg-primary text-primary-foreground' : 'bg-secondary')} data-testid={`button-review-kind-${i}-${k}`}>{k}</button>
                  ))}
                  <button onClick={() => set('experiences', exps.filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-review-remove-exp-${i}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input value={e.title} onChange={(ev) => setExp(i, { title: ev.target.value })} placeholder="Title" data-testid={`input-review-exp-title-${i}`} />
                  <Input value={e.org} onChange={(ev) => setExp(i, { org: ev.target.value })} placeholder="Organisation" data-testid={`input-review-exp-org-${i}`} />
                  <Input value={e.dates ?? ''} onChange={(ev) => setExp(i, { dates: ev.target.value })} placeholder="Dates" data-testid={`input-review-exp-dates-${i}`} />
                </div>
                <Textarea rows={3} value={e.description} onChange={(ev) => setExp(i, { description: ev.target.value })} placeholder="Description" data-testid={`input-review-exp-desc-${i}`} />
              </div>
            ))}
            <button onClick={() => set('experiences', [...exps, { title: '', org: '', description: '', dates: '', kind: 'work' }])} className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-secondary" data-testid="button-review-add-exp"><Plus className="h-4 w-4" /> Add entry</button>
          </div>
        </Field>
      </section>

      <section className="grid gap-2 rounded-3xl border bg-card p-4 md:grid-cols-2 md:p-6">
        <Field label="Technical skills" found={fc('technicalSkills')} missing={miss('technicalSkills')}><ListEditor value={p.technicalSkills} onChange={(v) => set('technicalSkills', v)} placeholder="Add a skill" testid="review-tech" /></Field>
        <Field label="Human / transferable skills" found={fc('humanSkills')} missing={miss('humanSkills')}><ListEditor value={p.humanSkills} onChange={(v) => set('humanSkills', v)} placeholder="Add a skill" testid="review-human" /></Field>
        <div className="md:col-span-2"><Field label="Certifications" found={fc('certifications')} missing={miss('certifications')}><ListEditor value={p.certifications ?? []} onChange={(v) => set('certifications', v)} placeholder="Add a certification" testid="review-certs" /></Field></div>
        <div className="md:col-span-2"><Field label="Describe what you can do, in your own words" found={fc('selfDescription')} missing={miss('selfDescription')}><Textarea rows={4} value={p.selfDescription ?? ''} onChange={(e) => set('selfDescription', e.target.value)} data-testid="input-review-self" /></Field></div>
        <Field label="Career interests (optional)" found={false} missing={miss('interests')}><Input value={p.interests ?? ''} onChange={(e) => set('interests', e.target.value)} placeholder="e.g. AI, fintech" data-testid="input-review-interests" /></Field>
        <Field label="Goals (optional)" found={false} missing={miss('goals')}><Input value={p.goals ?? ''} onChange={(e) => set('goals', e.target.value)} placeholder="Where do you want to be in 1-2 years?" data-testid="input-review-goals" /></Field>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-3xl border bg-card/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">{valid ? <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-teal" /> Ready. Nothing is used until you confirm.</span> : 'Education level, major, status and at least one skill are required.'}</p>
        <button onClick={onCancel} className="rounded-full border px-4 py-2 text-sm hover:bg-secondary" data-testid="button-review-cancel">Cancel</button>
        <button disabled={!valid} onClick={() => onConfirm(p)} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40" data-testid="button-review-confirm"><PenLine className="h-4 w-4" /> Confirm and generate summary</button>
      </div>
    </div>
  );
}
