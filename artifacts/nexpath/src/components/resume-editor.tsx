import { useState } from 'react';
import { ArrowDown, ArrowUp, EyeOff, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { newId, type Entry, type Notice, type SectionContent } from '@/lib/resume-model';

const move = <T,>(arr: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
};

function IconBtn({ onClick, label, children, disabled, testid }: { onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; testid?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} data-testid={testid} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">{children}</button>;
}

function EntriesEditor({ sec, value, onChange }: { sec: string; value: Entry[]; onChange: (v: Entry[]) => void }) {
  const set = (i: number, patch: Partial<Entry>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div className="space-y-3">
      {value.map((e, i) => (
        <div key={e.id} className="space-y-2 rounded-2xl border bg-background/60 p-3" data-testid={`editor-${sec}-entry-${i}`}>
          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Entry {i + 1}</span>
            <span className="flex-1" />
            <IconBtn label="Move up" onClick={() => onChange(move(value, i, -1))} disabled={i === 0} testid={`button-${sec}-up-${i}`}><ArrowUp className="h-4 w-4" /></IconBtn>
            <IconBtn label="Move down" onClick={() => onChange(move(value, i, 1))} disabled={i === value.length - 1} testid={`button-${sec}-down-${i}`}><ArrowDown className="h-4 w-4" /></IconBtn>
            <IconBtn label="Remove entry" onClick={() => onChange(value.filter((_, j) => j !== i))} testid={`button-${sec}-remove-${i}`}><Trash2 className="h-4 w-4" /></IconBtn>
          </div>
          <Input value={e.heading} onChange={(ev) => set(i, { heading: ev.target.value })} placeholder="Title or institution" data-testid={`input-${sec}-heading-${i}`} />
          <div className="grid grid-cols-2 gap-2">
            <Input value={e.sub} onChange={(ev) => set(i, { sub: ev.target.value })} placeholder="Organisation, role or qualification" data-testid={`input-${sec}-sub-${i}`} />
            <Input value={e.dates} onChange={(ev) => set(i, { dates: ev.target.value })} placeholder="Dates" data-testid={`input-${sec}-dates-${i}`} />
          </div>
          <div className="space-y-1.5">
            {e.bullets.map((b, k) => (
              <div key={k} className="flex items-start gap-1">
                <Textarea rows={2} value={b} onChange={(ev) => set(i, { bullets: e.bullets.map((x, m) => (m === k ? ev.target.value : x)) })} className="min-h-0 text-xs" data-testid={`input-${sec}-bullet-${i}-${k}`} />
                <IconBtn label="Remove bullet" onClick={() => set(i, { bullets: e.bullets.filter((_, m) => m !== k) })} testid={`button-${sec}-bullet-remove-${i}-${k}`}><X className="h-4 w-4" /></IconBtn>
              </div>
            ))}
            <button type="button" onClick={() => set(i, { bullets: [...e.bullets, ''] })} className="inline-flex items-center gap-1 text-xs font-medium text-primary" data-testid={`button-${sec}-bullet-add-${i}`}><Plus className="h-3.5 w-3.5" /> Add bullet point</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { id: newId(), heading: '', sub: '', dates: '', bullets: [] }])} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:border-primary/40" data-testid={`button-${sec}-add`}><Plus className="h-3.5 w-3.5" /> Add entry</button>
    </div>
  );
}

function ChipList({ label, sec, value, onChange, tags }: { label: string; sec: string; value: string[]; onChange: (v: string[]) => void; tags: Map<string, string> }) {
  const [draft, setDraft] = useState('');
  const add = () => { const t = draft.trim(); if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]); setDraft(''); };
  const key = (n: string) => n.toLowerCase().replace(/\((basic|beginner|intermediate|advanced)\)/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();
  return (
    <div className="space-y-2" data-testid={`editor-skills-${sec}`}>
      <p className="text-xs font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full border bg-background py-1 pl-2.5 pr-1 text-xs">
            {s}
            {tags.get(key(s)) && <span className={cn('rounded-full px-1.5 py-px text-[9px] font-semibold uppercase', tags.get(key(s)) === 'Completed in roadmap' ? 'bg-teal/15 text-accent-foreground' : tags.get(key(s)) === 'From CV' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>{tags.get(key(s))}</span>}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== s))} aria-label={`Remove ${s}`} className="rounded-full p-0.5 hover:bg-secondary" data-testid={`button-remove-skill-${s}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={`Add ${label.toLowerCase()} skill`} data-testid={`input-add-skill-${sec}`} />
        <button type="button" onClick={add} className="rounded-full bg-secondary px-3 text-xs font-semibold" data-testid={`button-add-skill-${sec}`}>Add</button>
      </div>
    </div>
  );
}

export interface SectionEditorProps {
  sec: string;
  title: string;
  content: SectionContent;
  edited: boolean;
  hidden: boolean;
  notice: Notice | null;
  tags: Map<string, string>;
  onChange: (c: SectionContent) => void;
  onReset: () => void;
  onToggleHidden: () => void;
  onAcceptNotice: () => void;
  onIgnoreNotice: () => void;
}

export function SectionEditor(p: SectionEditorProps) {
  const c = p.content;
  return (
    <div className="space-y-3" data-testid={`editor-${p.sec}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{p.title}</span>
        {p.edited && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary" data-testid={`tag-edited-${p.sec}`}>Edited</span>}
        {p.hidden && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase" data-testid={`tag-hidden-${p.sec}`}>Hidden</span>}
        <span className="flex-1" />
        <button type="button" onClick={p.onToggleHidden} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid={`button-hide-${p.sec}`}><EyeOff className="h-3.5 w-3.5" /> {p.hidden ? 'Show section' : 'Hide section'}</button>
        {p.edited && <button type="button" onClick={p.onReset} className="inline-flex items-center gap-1 text-xs text-primary" data-testid={`button-reset-${p.sec}`}><RotateCcw className="h-3 w-3" /> Reset to auto-generated</button>}
      </div>

      {p.notice && (
        <div className="rounded-2xl border border-teal/40 bg-teal/10 p-3 text-sm" data-testid={`notice-${p.sec}`}>
          <p className="font-medium">{p.notice.message}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{p.notice.items.slice(0, 6).join(', ')}{p.notice.items.length > 6 ? ', ...' : ''}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={p.onAcceptNotice} className="rounded-full bg-teal px-3 py-1 text-xs font-semibold text-white" data-testid={`button-notice-add-${p.sec}`}>Add</button>
            <button type="button" onClick={p.onIgnoreNotice} className="rounded-full border px-3 py-1 text-xs" data-testid={`button-notice-ignore-${p.sec}`}>Ignore</button>
          </div>
        </div>
      )}

      {'text' in c && <Textarea rows={7} value={c.text} onChange={(e) => p.onChange({ text: e.target.value })} data-testid={`input-section-${p.sec}`} />}
      {'entries' in c && <EntriesEditor sec={p.sec} value={c.entries} onChange={(entries) => p.onChange({ entries })} />}
      {'technical' in c && (
        <div className="space-y-4">
          <ChipList label="Technical" sec="technical" value={c.technical} tags={p.tags} onChange={(technical) => p.onChange({ ...c, technical })} />
          <ChipList label="Professional" sec="professional" value={c.professional} tags={p.tags} onChange={(professional) => p.onChange({ ...c, professional })} />
        </div>
      )}
      {'lines' in c && (
        <div className="space-y-2">
          {c.lines.map((l, i) => (
            <div key={i} className="flex items-start gap-1">
              <Textarea rows={2} value={l} onChange={(e) => p.onChange({ lines: c.lines.map((x, j) => (j === i ? e.target.value : x)) })} className="min-h-0 text-xs" data-testid={`input-certifications-line-${i}`} />
              <IconBtn label="Move up" onClick={() => p.onChange({ lines: move(c.lines, i, -1) })} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
              <IconBtn label="Move down" onClick={() => p.onChange({ lines: move(c.lines, i, 1) })} disabled={i === c.lines.length - 1}><ArrowDown className="h-4 w-4" /></IconBtn>
              <IconBtn label="Remove line" onClick={() => p.onChange({ lines: c.lines.filter((_, j) => j !== i) })} testid={`button-certifications-remove-${i}`}><Trash2 className="h-4 w-4" /></IconBtn>
            </div>
          ))}
          <button type="button" onClick={() => p.onChange({ lines: [...c.lines, ''] })} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:border-primary/40" data-testid="button-certifications-add"><Plus className="h-3.5 w-3.5" /> Add item</button>
        </div>
      )}
    </div>
  );
}

/** Read-only rendering used by the live preview, Print and PDF (both templates). */
export function SectionView({ content }: { content: SectionContent }) {
  if ('text' in content) return <div className="whitespace-pre-line">{content.text}</div>;
  if ('lines' in content) return <div className="space-y-0.5">{content.lines.filter((l) => l.trim()).map((l, i) => <div key={i}>{l}</div>)}</div>;
  if ('technical' in content) {
    return (
      <div className="space-y-0.5">
        {content.technical.length > 0 && <div><span className="font-semibold">Technical:</span> {content.technical.join(', ')}</div>}
        {content.professional.length > 0 && <div><span className="font-semibold">Professional:</span> {content.professional.join(', ')}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {content.entries.filter((e) => e.heading.trim() || e.sub.trim() || e.bullets.some((b) => b.trim())).map((e) => (
        <div key={e.id} className="break-inside-avoid">
          <div className="flex items-baseline justify-between gap-3"><span className="font-semibold">{e.heading}</span>{e.dates && <span className="shrink-0 text-xs">{e.dates}</span>}</div>
          {e.sub && <div className="text-[12px] italic">{e.sub}</div>}
          {e.bullets.some((b) => b.trim()) && <ul className="ml-4 list-disc">{e.bullets.filter((b) => b.trim()).map((b, k) => <li key={k}>{b}</li>)}</ul>}
        </div>
      ))}
    </div>
  );
}
