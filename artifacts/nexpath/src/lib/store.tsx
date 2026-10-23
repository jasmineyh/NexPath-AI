import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Profile } from '@workspace/api-client-react';
import type { ResumeEdits, ResumeHidden } from '@/lib/resume-model';

export type StepStatus = 'not-started' | 'in-progress' | 'completed';
export interface StepProgress {
  status: StepStatus;
  skill: string;
  completedAt?: string;
  notes?: string;
  evidence?: string;
  course?: { title: string; provider: string };
  percent?: number;
}
export type ProfileSource = 'cv' | 'manual' | 'demo';
export interface HistoryEntry { at: string; skillId: string; text: string }
export type ResumeSection = 'summary' | 'education' | 'experience' | 'skills' | 'certifications';
export interface ResumeState {
  template: 'classic' | 'modern';
  contact: { fullName: string; email: string; phone: string; location: string; link: string };
  overrides: Partial<Record<ResumeSection, string>>;
  /** Structured edits made after generation (see resume-model). Optional so older saved data still loads. */
  edits?: ResumeEdits;
  hidden?: ResumeHidden;
}

interface StoreShape {
  profile: Profile | null;
  isDemo: boolean;
  source: ProfileSource | null;
  setProfile: (p: Profile, source?: ProfileSource) => void;
  clearProfile: () => void;
  clearAll: () => void;
  history: HistoryEntry[];
  addHistory: (e: Omit<HistoryEntry, 'at'>) => void;
  targetId: string | null;
  targetTitle: string | null;
  setTarget: (id: string | null, title?: string | null) => void;
  progress: Record<string, StepProgress>;
  updateStep: (skillId: string, patch: Partial<StepProgress> & { skill: string }) => void;
  resetProgress: () => void;
  resume: ResumeState;
  setResume: (fn: (r: ResumeState) => ResumeState) => void;
}

const KEY = 'nexpath:v1';
const defaultResume: ResumeState = {
  template: 'classic',
  contact: { fullName: '', email: '', phone: '', location: '', link: '' },
  overrides: {},
};

interface Persisted {
  profile: Profile | null;
  isDemo: boolean;
  source: ProfileSource | null;
  history: HistoryEntry[];
  targetId: string | null;
  targetTitle: string | null;
  progress: Record<string, StepProgress>;
  resume: ResumeState;
}

const OLD_PLACEHOLDERS = ['your.name@email.com', '+60 1X-XXX XXXX', 'Kuala Lumpur, Malaysia', 'linkedin.com/in/your-profile'];
function stripPlaceholders(c: ResumeState['contact']): ResumeState['contact'] {
  const out = { ...c };
  (Object.keys(out) as (keyof typeof out)[]).forEach((k) => { if (OLD_PLACEHOLDERS.includes(out[k])) out[k] = ''; });
  return out;
}

function load(): Persisted {
  const base: Persisted = { profile: null, isDemo: false, source: null, history: [], targetId: null, targetTitle: null, progress: {}, resume: defaultResume };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return { ...base, ...parsed, source: parsed.source ?? (parsed.profile ? (parsed.isDemo ? 'demo' : 'manual') : null), history: parsed.history ?? [], resume: { ...defaultResume, ...(parsed.resume ?? {}), contact: stripPlaceholders({ ...defaultResume.contact, ...(parsed.resume?.contact ?? {}) }) } };
  } catch {
    return base;
  }
}

const Ctx = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or disabled */ }
  }, [state]);

  const setProfile = useCallback((p: Profile, source: ProfileSource = 'manual') => setState((s) => ({ ...s, profile: p, isDemo: source === 'demo', source })), []);
  const clearProfile = useCallback(() => setState((s) => ({ ...s, profile: null, isDemo: false, source: null })), []);
  const clearAll = useCallback(() => setState((s) => ({ ...s, profile: null, isDemo: false, source: null, targetId: null, targetTitle: null, progress: {}, history: [], resume: { ...defaultResume, template: s.resume.template } })), []);
  const addHistory = useCallback((e: Omit<HistoryEntry, 'at'>) => setState((s) => ({ ...s, history: [{ ...e, at: new Date().toISOString() }, ...s.history].slice(0, 200) })), []);
  const setTarget = useCallback((id: string | null, title: string | null = null) => setState((s) => ({ ...s, targetId: id, targetTitle: title })), []);
  const updateStep = useCallback((skillId: string, patch: Partial<StepProgress> & { skill: string }) =>
    setState((s) => {
      const prev: StepProgress = s.progress[skillId] ?? { status: 'not-started', skill: patch.skill };
      const next: StepProgress = { ...prev, ...patch };
      if (patch.status === 'completed' && prev.status !== 'completed' && !patch.completedAt) next.completedAt = new Date().toISOString().slice(0, 10);
      if (patch.status === 'completed') next.percent = 100;
      if (patch.status && patch.status !== 'completed') next.completedAt = undefined;
      return { ...s, progress: { ...s.progress, [skillId]: next } };
    }), []);
  const resetProgress = useCallback(() => setState((s) => ({ ...s, progress: {}, history: [] })), []);
  const setResume = useCallback((fn: (r: ResumeState) => ResumeState) => setState((s) => ({ ...s, resume: fn(s.resume) })), []);

  const value = useMemo<StoreShape>(() => ({ ...state, setProfile, clearProfile, clearAll, addHistory, setTarget, updateStep, resetProgress, setResume }),
    [state, setProfile, clearProfile, clearAll, addHistory, setTarget, updateStep, resetProgress, setResume]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

export function completedIds(progress: Record<string, StepProgress>) {
  return Object.entries(progress).filter(([, p]) => p.status === 'completed').map(([id]) => id);
}
