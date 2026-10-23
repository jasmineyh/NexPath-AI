import type { Profile } from '@workspace/api-client-react';
import type { StepProgress } from '@/lib/store';

export type SectionKey = 'summary' | 'education' | 'experience' | 'projects' | 'volunteer' | 'skills' | 'certifications';

export interface Entry { id: string; heading: string; sub: string; dates: string; bullets: string[] }
export type SectionContent =
  | { text: string }
  | { entries: Entry[] }
  | { technical: string[]; professional: string[] }
  | { lines: string[] };

/** What the user changed. `baseline` is the auto-generated content at the time of the first edit. */
export interface EditRecord { content: SectionContent; baseline: string; ignored: string[] }
export type ResumeEdits = Partial<Record<SectionKey, EditRecord>>;
export type ResumeHidden = Partial<Record<SectionKey, boolean>>;

export const SECTION_LIST: { key: SectionKey; title: string; short: string }[] = [
  { key: 'summary', title: 'Professional Summary', short: 'Summary' },
  { key: 'education', title: 'Education', short: 'Education' },
  { key: 'experience', title: 'Experience', short: 'Experience' },
  { key: 'projects', title: 'Projects & Competitions', short: 'Projects' },
  { key: 'volunteer', title: 'Volunteer & Co-curricular', short: 'Volunteer' },
  { key: 'skills', title: 'Skills', short: 'Skills' },
  { key: 'certifications', title: 'Certifications & Learning', short: 'Learning' },
];

export const newId = () => Math.random().toString(36).slice(2, 10);

const norm = (n: string) => n.toLowerCase().replace(/\((basic|beginner|intermediate|advanced)\)/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

export interface Generated {
  content: Record<SectionKey, SectionContent>;
  tags: Map<string, string>;
}

export function buildGenerated(profile: Profile, progress: Record<string, StepProgress>, targetTitle: string | null, origin: string): Generated {
  const done = Object.values(progress).filter((p) => p.status === 'completed');
  const tags = new Map<string, string>();
  const tech: string[] = [];
  const prof: string[] = [];
  const push = (name: string, tag: string, list: string[]) => {
    const k = norm(name);
    if (!k || tags.has(k)) return;
    tags.set(k, tag);
    list.push(name.trim());
  };
  profile.technicalSkills.forEach((n) => push(n, origin, tech));
  profile.humanSkills.forEach((n) => push(n, origin, prof));
  done.forEach((d) => push(d.skill, 'Completed in roadmap', tech));

  const statusWord = profile.status === 'fresh graduate' ? 'Recent' : profile.status === 'student' ? 'Current' : '';
  const target = targetTitle ? ` seeking an entry-level ${targetTitle} role` : '';
  const strengths = profile.humanSkills.slice(0, 3).map((x) => x.toLowerCase()).join(', ');
  const summary = `${statusWord ? statusWord + ' ' : ''}${profile.major} ${profile.status === 'student' ? 'student' : 'graduate'}${target}. Hands-on with ${profile.technicalSkills.slice(0, 4).join(', ') || 'core technical tools'}${done.length ? `, recently building ${done.map((d) => d.skill).slice(0, 3).join(', ')}` : ''}.${strengths ? ` Brings ${strengths} to cross-functional teams.` : ''}`;

  const education: Entry[] = (profile.education ?? []).length
    ? (profile.education ?? []).map((e, i) => ({
        id: `edu${i}`,
        heading: e.institution,
        sub: [e.qualification || [e.level, e.field].filter(Boolean).join(' in '), e.specialisation && !e.qualification.includes(e.specialisation) ? e.specialisation : ''].filter(Boolean).join(' | '),
        dates: e.dates,
        bullets: e.results ? [`Results: ${e.results}`] : [],
      }))
    : [{ id: 'edu0', heading: profile.institution ?? '', sub: [profile.educationLevel, profile.major].filter(Boolean).join(' in '), dates: profile.graduation ?? '', bullets: [] }].filter((e) => e.heading || e.sub);

  const fromExp = (kinds: string[]): Entry[] =>
    (profile.experiences ?? [])
      .filter((e) => e.title.trim() && kinds.includes(e.kind ?? 'work'))
      .map((e, i) => ({ id: `${kinds[0]}${i}`, heading: e.title, sub: [e.org, e.role].filter((x) => x && x.trim()).join(' | '), dates: e.dates ?? '', bullets: sentences(e.description ?? '') }));

  const lines = [
    ...(profile.certifications ?? []).filter(Boolean),
    ...done.filter((d) => d.course).map((d) => [`${d.course!.title} | ${d.course!.provider}`, d.completedAt, d.evidence ? `Evidence: ${d.evidence}` : ''].filter(Boolean).join(' | ')),
  ];

  return {
    tags,
    content: {
      summary: { text: summary },
      education: { entries: education },
      experience: { entries: fromExp(['work', 'internship']) },
      projects: { entries: fromExp(['project']) },
      volunteer: { entries: fromExp(['volunteer']) },
      skills: { technical: tech, professional: prof },
      certifications: { lines },
    },
  };
}

export const isEmptyContent = (c: SectionContent) =>
  'text' in c ? !c.text.trim() : 'entries' in c ? c.entries.length === 0 : 'lines' in c ? c.lines.length === 0 : c.technical.length + c.professional.length === 0;

export interface Notice { message: string; items: string[] }

const entryKey = (e: Entry) => `${norm(e.heading)}|${norm(e.dates)}`;
const lineKey = (l: string) => norm(l);

/** New auto-generated items that an edited section does not contain yet (and the user has not ignored). */
export function pendingNotice(sec: SectionKey, generated: SectionContent, rec: EditRecord | undefined): Notice | null {
  if (!rec) return null;
  const cur = rec.content;
  const ig = new Set(rec.ignored);
  let base: SectionContent | null = null;
  try { base = JSON.parse(rec.baseline) as SectionContent; } catch { base = null; }
  if (base) {
    // Anything that already existed when editing began (even if the user removed it) is not "new".
    if ('entries' in base) base.entries.forEach((e) => ig.add(entryKey(e)));
    if ('lines' in base) base.lines.forEach((l) => ig.add(lineKey(l)));
    if ('technical' in base) [...base.technical, ...base.professional].forEach((x) => ig.add(norm(x)));
  }
  if ('text' in generated && 'text' in cur) {
    if (generated.text !== cur.text && generated.text !== (JSON.parse(rec.baseline) as { text?: string }).text && !ig.has(generated.text)) {
      return { message: 'Your profile or progress changed. Use the new auto-generated summary?', items: [generated.text] };
    }
    return null;
  }
  if ('entries' in generated && 'entries' in cur) {
    const have = new Set(cur.entries.map(entryKey));
    const fresh = generated.entries.filter((e) => !have.has(entryKey(e)) && !ig.has(entryKey(e)));
    return fresh.length ? { message: 'New entries are available from your profile. Add them?', items: fresh.map((e) => e.heading) } : null;
  }
  if ('lines' in generated && 'lines' in cur) {
    const have = new Set(cur.lines.map(lineKey));
    const fresh = generated.lines.filter((l) => !have.has(lineKey(l)) && !ig.has(lineKey(l)));
    return fresh.length ? { message: 'New completed courses available. Add them?', items: fresh } : null;
  }
  if ('technical' in generated && 'technical' in cur) {
    const have = new Set([...cur.technical, ...cur.professional].map(norm));
    const fresh = [...generated.technical, ...generated.professional].filter((s) => !have.has(norm(s)) && !ig.has(norm(s)));
    return fresh.length ? { message: 'New completed skills available. Add them?', items: fresh } : null;
  }
  void sec;
  return null;
}

/** Content after the user accepts the pending notice. */
export function applyNotice(generated: SectionContent, cur: SectionContent): SectionContent {
  if ('text' in generated) return generated;
  if ('entries' in generated && 'entries' in cur) {
    const have = new Set(cur.entries.map(entryKey));
    return { entries: [...cur.entries, ...generated.entries.filter((e) => !have.has(entryKey(e))).map((e) => ({ ...e, id: newId() }))] };
  }
  if ('lines' in generated && 'lines' in cur) {
    const have = new Set(cur.lines.map(lineKey));
    return { lines: [...cur.lines, ...generated.lines.filter((l) => !have.has(lineKey(l)))] };
  }
  if ('technical' in generated && 'technical' in cur) {
    const have = new Set([...cur.technical, ...cur.professional].map(norm));
    const techFresh = generated.technical.filter((s) => !have.has(norm(s)));
    const profFresh = generated.professional.filter((s) => !have.has(norm(s)));
    return { technical: [...cur.technical, ...techFresh], professional: [...cur.professional, ...profFresh] };
  }
  return cur;
}

/** Keys to remember when the user ignores a notice. */
export function noticeKeys(generated: SectionContent, rec: EditRecord): string[] {
  const n = pendingNotice('summary', generated, rec);
  if (!n) return [];
  if ('text' in generated) return [generated.text];
  if ('entries' in generated) return generated.entries.map(entryKey);
  if ('lines' in generated) return generated.lines.map(lineKey);
  return [...generated.technical, ...generated.professional].map(norm);
}
