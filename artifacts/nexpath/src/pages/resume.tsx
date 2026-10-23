import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, RotateCcw, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PageHeader, LockedPrompt, NextStep, DemoBadge } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SectionEditor, SectionView } from '@/components/resume-editor';
import { SECTION_LIST, applyNotice, buildGenerated, isEmptyContent, noticeKeys, pendingNotice, type SectionContent, type SectionKey } from '@/lib/resume-model';
import { cn } from '@/lib/utils';

export default function ResumePage() {
  const { profile, isDemo, source, targetTitle, progress, resume, setResume } = useStore();
  const [tab, setTab] = useState<SectionKey | 'contact'>('contact');

  const origin = source === 'cv' ? 'From CV' : 'Self-reported';
  const gen = useMemo(() => (profile ? buildGenerated(profile, progress, targetTitle, origin) : null), [profile, progress, targetTitle, origin]);

  if (!profile || !gen) return <LockedPrompt title="Complete Understand Me first" body="Your resume is generated only from what you enter and the roadmap steps you complete." href="/app/understand" cta="Go to Understand Me" />;

  const edits = resume.edits ?? {};
  const hidden = resume.hidden ?? {};
  const effective = (k: SectionKey): SectionContent => edits[k]?.content ?? gen.content[k];
  const setEdit = (k: SectionKey, content: SectionContent) =>
    setResume((r) => ({ ...r, edits: { ...(r.edits ?? {}), [k]: { content, baseline: r.edits?.[k]?.baseline ?? JSON.stringify(gen.content[k]), ignored: r.edits?.[k]?.ignored ?? [] } } }));
  const resetSection = (k: SectionKey) => setResume((r) => { const e = { ...(r.edits ?? {}) }; delete e[k]; return { ...r, edits: e }; });
  const toggleHidden = (k: SectionKey) => setResume((r) => ({ ...r, hidden: { ...(r.hidden ?? {}), [k]: !r.hidden?.[k] } }));
  const resetAll = () => setResume((r) => ({ ...r, edits: {}, hidden: {}, overrides: {}, contact: { fullName: '', email: '', phone: '', location: '', link: '' } }));
  const acceptNotice = (k: SectionKey) => setResume((r) => {
    const rec = r.edits?.[k];
    if (!rec) return r;
    const next = applyNotice(gen.content[k], rec.content);
    return { ...r, edits: { ...(r.edits ?? {}), [k]: { ...rec, content: next, baseline: JSON.stringify(gen.content[k]) } } };
  });
  const ignoreNotice = (k: SectionKey) => setResume((r) => {
    const rec = r.edits?.[k];
    if (!rec) return r;
    return { ...r, edits: { ...(r.edits ?? {}), [k]: { ...rec, ignored: [...rec.ignored, ...noticeKeys(gen.content[k], rec)] } } };
  });
  const noticeOf = (k: SectionKey) => pendingNotice(k, gen.content[k], edits[k]);
  const anyEdited = SECTION_LIST.some((s) => edits[s.key]) || Object.values(hidden).some(Boolean);

  const rc = resume.contact;
  const c = { fullName: rc.fullName || profile.name || '', email: rc.email || profile.email || '', phone: rc.phone || profile.phone || '', location: rc.location || profile.location || '', link: rc.link || profile.links?.[0] || '' };
  const name = c.fullName || 'Your Name';
  const modern = resume.template === 'modern';
  const print = (pdf: boolean) => {
    const prev = document.title;
    if (pdf) document.title = `${name.replace(/\s+/g, '_')}_Resume`;
    window.print();
    document.title = prev;
  };
  const activeSec = SECTION_LIST.find((s) => s.key === tab);

  return (
    <div>
      <PageHeader eyebrow="Roadmap / My Resume" title="My Resume" description="ATS-friendly, built from your profile plus completed roadmap skills. Nothing is invented, and every section is editable."
        actions={<>
          {isDemo && <DemoBadge />}
          <button onClick={() => print(true)} data-testid="button-download-pdf" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Download PDF</button>
          <button onClick={() => print(false)} data-testid="button-print" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm"><Printer className="h-4 w-4" /> Print</button>
        </>} />
      <p className="mb-6 flex items-center gap-2 rounded-2xl bg-amber/10 px-4 py-3 text-sm text-[hsl(30_80%_28%)] ring-1 ring-amber/30" data-testid="text-review-note">
        <AlertCircle className="h-4 w-4 shrink-0" /> Review and edit before sending to employers. "Download PDF" opens the print dialog: choose "Save as PDF".
      </p>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <div className="flex rounded-full bg-secondary p-1">
            {(['classic', 'modern'] as const).map((t) => (
              <button key={t} onClick={() => setResume((r) => ({ ...r, template: t }))} data-testid={`button-template-${t}`}
                className={cn('flex-1 rounded-full py-2 text-sm font-medium capitalize transition', resume.template === t ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground')}>{t}</button>
            ))}
          </div>
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {[{ key: 'contact' as const, short: 'Contact' }, ...SECTION_LIST].map((s) => (
                <button key={s.key} onClick={() => setTab(s.key)} data-testid={`tab-${s.key}`}
                  className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition', tab === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted')}>
                  {s.short}
                  {s.key !== 'contact' && edits[s.key] && <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-label="edited" />}
                  {s.key !== 'contact' && noticeOf(s.key) && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-label="update available" />}
                </button>
              ))}
            </div>
            {tab === 'contact' ? (
              <div className="space-y-3">
                {([['fullName', 'Full name', 'Your name'], ['email', 'Email', 'your.name@email.com'], ['phone', 'Phone', '+60 ...'], ['location', 'Location', 'City, Malaysia'], ['link', 'LinkedIn / portfolio', 'linkedin.com/in/...']] as const).map(([k, l, ph]) => (
                  <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label>
                    <Input value={rc[k]} placeholder={c[k] || ph} onChange={(e) => setResume((r) => ({ ...r, contact: { ...r.contact, [k]: e.target.value } }))} data-testid={`input-contact-${k}`} /></div>
                ))}
              </div>
            ) : activeSec && (
              <SectionEditor key={activeSec.key} sec={activeSec.key} title={activeSec.title} content={effective(activeSec.key)} edited={Boolean(edits[activeSec.key])} hidden={Boolean(hidden[activeSec.key])}
                notice={noticeOf(activeSec.key)} tags={gen.tags}
                onChange={(content) => setEdit(activeSec.key, content)} onReset={() => resetSection(activeSec.key)} onToggleHidden={() => toggleHidden(activeSec.key)}
                onAcceptNotice={() => acceptNotice(activeSec.key)} onIgnoreNotice={() => ignoreNotice(activeSec.key)} />
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button disabled={!anyEdited && !rc.fullName && !rc.email && !rc.phone && !rc.location && !rc.link} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-40" data-testid="button-reset-all"><RotateCcw className="h-3.5 w-3.5" /> Reset all</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset the whole resume?</AlertDialogTitle>
                <AlertDialogDescription>All your edits, hidden sections and contact changes will be replaced by the auto-generated resume. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-reset-all-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll} data-testid="button-reset-all-confirm">Reset all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <motion.div key={resume.template} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto rounded-3xl bg-muted/60 p-3 md:p-6">
          <div id="resume-print" className={cn('mx-auto min-h-[900px] max-w-[760px] bg-[hsl(40_30%_99%)] p-10 text-[13px] leading-relaxed text-[hsl(210_40%_12%)] shadow-xl', modern ? 'font-sans' : 'font-serif')} data-testid="preview-resume">
            {modern ? (
              <div className="mb-6 border-l-4 border-[hsl(176_60%_38%)] pl-4">
                <h1 className="font-sans text-3xl font-bold tracking-tight">{name}</h1>
                <p className="mt-1 text-xs text-[hsl(205_20%_40%)]">{[c.email, c.phone, c.location, c.link].filter(Boolean).join('  |  ')}</p>
              </div>
            ) : (
              <div className="mb-5 border-b-2 border-[hsl(210_40%_12%)] pb-3 text-center">
                <h1 className="font-serif text-3xl font-bold uppercase tracking-[0.12em]">{name}</h1>
                <p className="mt-1 text-xs">{[c.email, c.phone, c.location, c.link].filter(Boolean).join('  |  ')}</p>
              </div>
            )}
            {SECTION_LIST.map((s) => {
              const content = effective(s.key);
              if (hidden[s.key] || isEmptyContent(content)) return null;
              return (
                <section key={s.key} className="mb-5 break-inside-avoid" data-testid={`resume-section-${s.key}`}>
                  <h2 className={cn('mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em]', modern ? 'font-sans text-[hsl(200_80%_29%)]' : 'font-serif border-b border-[hsl(210_20%_75%)] pb-0.5')}>{s.title}</h2>
                  <SectionView content={content} />
                </section>
              );
            })}
          </div>
        </motion.div>
      </div>
      <NextStep href="/app/impact" hint="Next" label="See your SDG Impact" />
    </div>
  );
}
