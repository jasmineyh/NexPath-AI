import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, RotateCcw, AlertCircle } from 'lucide-react';
import { useStore, type ResumeSection } from '@/lib/store';
import { PageHeader, LockedPrompt, NextStep, DemoBadge } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const SECTIONS: { key: ResumeSection; title: string }[] = [
  { key: 'summary', title: 'Professional Summary' },
  { key: 'education', title: 'Education' },
  { key: 'experience', title: 'Experience & Projects' },
  { key: 'skills', title: 'Skills' },
  { key: 'certifications', title: 'Certifications & Learning' },
];

export default function ResumePage() {
  const { profile, isDemo, targetTitle, progress, resume, setResume } = useStore();
  const [tab, setTab] = useState<ResumeSection | 'contact'>('contact');

  const generated = useMemo<Record<ResumeSection, string>>(() => {
    if (!profile) return { summary: '', education: '', experience: '', skills: '', certifications: '' };
    const done = Object.values(progress).filter((p) => p.status === 'completed');
    const tech = Array.from(new Set([...profile.technicalSkills, ...done.map((d) => d.skill)]));
    const statusWord = profile.status === 'fresh graduate' ? 'Recent' : profile.status === 'student' ? 'Current' : '';
    const target = targetTitle ? ` seeking an entry-level ${targetTitle} role` : '';
    const strengths = profile.humanSkills.slice(0, 3).map((s) => s.toLowerCase()).join(', ');
    return {
      summary: `${statusWord ? statusWord + ' ' : ''}${profile.major} ${profile.status === 'student' ? 'student' : 'graduate'}${target}. Hands-on with ${profile.technicalSkills.slice(0, 4).join(', ') || 'core technical tools'}${done.length ? `, recently building ${done.map((d) => d.skill).slice(0, 3).join(', ')}` : ''}. Brings ${strengths || 'strong collaboration'} to cross-functional teams.`,
      education: `${profile.major}${profile.institution ? ` | ${profile.institution}` : ''}\n${profile.educationLevel}`,
      experience: (profile.experiences ?? []).filter((e) => e.title).map((e) => `${e.title} | ${e.org}${e.kind ? ` (${e.kind})` : ''}\n- ${e.description}`).join('\n\n'),
      skills: `Technical: ${tech.join(', ')}\nProfessional: ${profile.humanSkills.join(', ')}`,
      certifications: done.filter((d) => d.course).map((d) => `${d.course!.title} | ${d.course!.provider}${d.completedAt ? ` | ${d.completedAt}` : ''}`).join('\n'),
    };
  }, [profile, progress, targetTitle]);

  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Your resume is generated only from what you enter and the roadmap steps you complete." href="/app/understand" cta="Go to Understand Me" />;

  const text = (k: ResumeSection) => resume.overrides[k] ?? generated[k];
  const c = resume.contact;
  const name = c.fullName || profile.name || 'Your Name';
  const modern = resume.template === 'modern';
  const print = (pdf: boolean) => {
    const prev = document.title;
    if (pdf) document.title = `${name.replace(/\s+/g, '_')}_Resume`;
    window.print();
    document.title = prev;
  };

  return (
    <div>
      <PageHeader eyebrow="Roadmap / My Resume" title="My Resume" description="ATS-friendly, built from your profile plus completed roadmap skills. Nothing is invented."
        actions={<>
          {isDemo && <DemoBadge />}
          <button onClick={() => print(true)} data-testid="button-download-pdf" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Download PDF</button>
          <button onClick={() => print(false)} data-testid="button-print" className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm"><Printer className="h-4 w-4" /> Print</button>
        </>} />
      <p className="mb-6 flex items-center gap-2 rounded-2xl bg-amber/10 px-4 py-3 text-sm text-[hsl(30_80%_28%)] ring-1 ring-amber/30" data-testid="text-review-note">
        <AlertCircle className="h-4 w-4 shrink-0" /> Review and edit before sending to employers. "Download PDF" opens the print dialog: choose "Save as PDF".
      </p>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <div className="flex rounded-full bg-secondary p-1">
            {(['classic', 'modern'] as const).map((t) => (
              <button key={t} onClick={() => setResume((r) => ({ ...r, template: t }))} data-testid={`button-template-${t}`}
                className={cn('flex-1 rounded-full py-2 text-sm font-medium capitalize transition', resume.template === t ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground')}>{t}</button>
            ))}
          </div>
          <div className="rounded-3xl border bg-card p-4">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {[{ key: 'contact' as const, title: 'Contact' }, ...SECTIONS].map((s) => (
                <button key={s.key} onClick={() => setTab(s.key)} data-testid={`tab-${s.key}`}
                  className={cn('rounded-full px-3 py-1 text-xs font-medium transition', tab === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-muted')}>{s.title.split(' ')[0]}</button>
              ))}
            </div>
            {tab === 'contact' ? (
              <div className="space-y-3">
                {([['fullName', 'Full name', profile.name || 'Your Name'], ['email', 'Email', ''], ['phone', 'Phone', ''], ['location', 'Location', ''], ['link', 'LinkedIn / portfolio', '']] as const).map(([k, l, ph]) => (
                  <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label>
                    <Input value={c[k]} placeholder={ph} onChange={(e) => setResume((r) => ({ ...r, contact: { ...r.contact, [k]: e.target.value } }))} data-testid={`input-contact-${k}`} /></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{SECTIONS.find((s) => s.key === tab)?.title}</Label>
                  {resume.overrides[tab] !== undefined && (
                    <button onClick={() => setResume((r) => { const o = { ...r.overrides }; delete o[tab]; return { ...r, overrides: o }; })} className="inline-flex items-center gap-1 text-xs text-primary" data-testid="button-reset-section"><RotateCcw className="h-3 w-3" /> Reset to generated</button>
                  )}
                </div>
                <Textarea rows={12} value={text(tab)} onChange={(e) => setResume((r) => ({ ...r, overrides: { ...r.overrides, [tab]: e.target.value } }))} className="font-mono text-xs" data-testid={`input-section-${tab}`}
                  placeholder={tab === 'certifications' ? 'Complete roadmap steps to add courses here.' : ''} />
              </div>
            )}
          </div>
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
            {SECTIONS.map((s) => {
              const t = text(s.key).trim();
              if (!t) return null;
              return (
                <section key={s.key} className="mb-5 break-inside-avoid">
                  <h2 className={cn('mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em]', modern ? 'font-sans text-[hsl(200_80%_29%)]' : 'font-serif border-b border-[hsl(210_20%_75%)] pb-0.5')}>{s.title}</h2>
                  <div className="whitespace-pre-line">{t}</div>
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
