import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type SkillStatus = 'completed' | 'in-progress' | 'existing' | 'planned';
export interface MapSkill { id: string; name: string; status: SkillStatus }
export interface MapSdg { number: number; name: string; color: string }
export interface MapLink {
  key: string;
  kind: 'career-skill' | 'skill-sdg' | 'career-sdg';
  source: string;
  target: string;
  sentence: string;
  /** Short heading, e.g. "Data analysis to SDG 13 Climate Action" */
  heading: string;
  potential: boolean;
}

const STATUS_LABEL: Record<SkillStatus, string> = { completed: 'Completed', 'in-progress': 'In progress', existing: 'Existing skill', planned: 'Planned' };
const W = 900;
const CAREER = { x: 110, w: 190 };
const SKILL = { x: 450, w: 230 };
const SDG = { x: 790, w: 190 };

export function ImpactMap({ careerTitle, skills, sdgs, links, active, onActive }: {
  careerTitle: string;
  skills: MapSkill[];
  sdgs: MapSdg[];
  links: MapLink[];
  active: MapLink | null;
  onActive: (l: MapLink | null) => void;
}) {
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const layout = useMemo(() => {
    const rows = Math.max(skills.length, sdgs.length, 1);
    const H = Math.max(340, rows * 62 + 40);
    const at = (i: number, n: number) => (H / (n + 1)) * (i + 1);
    const pos: Record<string, { x: number; y: number }> = { career: { x: CAREER.x, y: H / 2 } };
    skills.forEach((s, i) => { pos[`skill:${s.id}`] = { x: SKILL.x, y: at(i, skills.length) }; });
    sdgs.forEach((s, i) => { pos[`sdg:${s.number}`] = { x: SDG.x, y: at(i, sdgs.length) }; });
    return { H, pos };
  }, [skills, sdgs]);
  const sdgColor = (id: string) => sdgs.find((s) => `sdg:${s.number}` === id)?.color ?? 'hsl(200 80% 35%)';

  const edge = (l: MapLink) => {
    const a = layout.pos[l.source]; const b = layout.pos[l.target];
    if (!a || !b) return null;
    const ax = a.x + (l.source === 'career' ? CAREER.w : SKILL.w) / 2;
    const bx = b.x - (l.target.startsWith('sdg') ? SDG.w : SKILL.w) / 2;
    const mx = (ax + bx) / 2;
    return `M${ax},${a.y} C${mx},${a.y} ${mx},${b.y} ${bx},${b.y}`;
  };
  const isActive = (l: MapLink) => (active ? active.key === l.key : hoverNode ? l.source === hoverNode || l.target === hoverNode : false);
  const dimmed = (l: MapLink) => Boolean(active || hoverNode) && !isActive(l);

  const nodeFill = (s: MapSkill) => (s.status === 'completed' ? 'hsl(174 64% 38%)' : s.status === 'existing' ? 'hsl(204 70% 42%)' : s.status === 'in-progress' ? 'hsl(38 90% 90%)' : 'hsl(188 42% 95%)');
  const nodeText = (s: MapSkill) => (s.status === 'completed' || s.status === 'existing' ? '#fafcfc' : 'hsl(204 60% 18%)');

  return (
    <div className="overflow-x-auto rounded-3xl border bg-card p-4">
      <div className="mb-2 grid min-w-[780px] grid-cols-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"><span>Career</span><span>Skills</span><span>SDGs</span></div>
      <svg viewBox={`0 0 ${W} ${layout.H}`} className="min-w-[780px] w-full" role="group" aria-label="Map connecting your career, skills and Sustainable Development Goals" data-testid="chart-impact">
        {/* career to SDG arcs, drawn first so skill nodes sit on top */}
        {[...links].sort((x, y) => Number(y.kind === 'career-sdg') - Number(x.kind === 'career-sdg')).map((l, i) => {
          const d = edge(l);
          if (!d) return null;
          const on = isActive(l);
          const stroke = l.kind === 'skill-sdg' ? sdgColor(l.target) : l.kind === 'career-sdg' ? 'hsl(206 58% 25%)' : 'hsl(200 20% 65%)';
          return (
            <g key={l.key} tabIndex={0} role="button" aria-label={l.sentence} onMouseEnter={() => onActive(l)} onMouseLeave={() => onActive(null)} onFocus={() => onActive(l)} onBlur={() => onActive(null)}
              onClick={() => onActive(l)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActive(l); } }} className="cursor-pointer outline-none focus-visible:[&>path:first-child]:stroke-[5px]" data-testid={`link-${l.key}`}>
              <motion.path d={d} fill="none" stroke={stroke} strokeWidth={on ? 4.5 : l.kind === 'career-skill' ? 1.6 : 2.4}
                strokeDasharray={l.kind === 'career-sdg' ? '2 6' : l.potential ? '6 5' : undefined} strokeLinecap="round"
                opacity={dimmed(l) ? 0.1 : l.kind === 'career-skill' ? 0.55 : 0.8} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: i * 0.03 }} />
              <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
            </g>
          );
        })}

        <g onMouseEnter={() => setHoverNode('career')} onMouseLeave={() => setHoverNode(null)} data-testid="node-career">
          <rect x={CAREER.x - CAREER.w / 2} y={layout.pos.career!.y - 26} width={CAREER.w} height={52} rx={26} fill="hsl(206 58% 13%)" />
          <text x={CAREER.x} y={layout.pos.career!.y + 4} textAnchor="middle" fontSize="12.5" fontWeight={700} fill="#fafcfc" fontFamily="Geist, sans-serif">{careerTitle.slice(0, 24)}</text>
        </g>

        {skills.map((s) => {
          const p = layout.pos[`skill:${s.id}`]!;
          const potential = s.status === 'planned' || s.status === 'in-progress';
          return (
            <g key={s.id} onMouseEnter={() => setHoverNode(`skill:${s.id}`)} onMouseLeave={() => setHoverNode(null)} data-testid={`node-skill-${s.id}`} data-status={s.status}>
              <title>{`${s.name}: ${STATUS_LABEL[s.status]}${potential ? '. Potential after you complete this.' : ''}`}</title>
              <rect x={p.x - SKILL.w / 2} y={p.y - 24} width={SKILL.w} height={48} rx={24} fill={nodeFill(s)}
                stroke={s.status === 'in-progress' ? 'hsl(36 90% 50%)' : s.status === 'planned' ? 'hsl(200 25% 55%)' : 'none'} strokeWidth={2} strokeDasharray={s.status === 'planned' ? '5 4' : undefined} />
              <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="12" fontWeight={600} fill={nodeText(s)} fontFamily="Geist, sans-serif">{s.name.length > 28 ? s.name.slice(0, 27) + '...' : s.name}</text>
              <text x={p.x} y={p.y + 13} textAnchor="middle" fontSize="9.5" fill={nodeText(s)} opacity={0.85} fontFamily="Geist, sans-serif">{potential ? `${STATUS_LABEL[s.status]}: potential after you complete this` : STATUS_LABEL[s.status]}</text>
            </g>
          );
        })}

        {sdgs.map((s) => {
          const p = layout.pos[`sdg:${s.number}`]!;
          return (
            <g key={s.number} onMouseEnter={() => setHoverNode(`sdg:${s.number}`)} onMouseLeave={() => setHoverNode(null)} data-testid={`node-sdg-${s.number}`}>
              <title>{`SDG ${s.number}: ${s.name}`}</title>
              <rect x={p.x - SDG.w / 2} y={p.y - 24} width={SDG.w} height={48} rx={14} fill={s.color} />
              <text x={p.x - SDG.w / 2 + 12} y={p.y + 7} fontSize="22" fontWeight={800} fill="#fff" fontFamily="Geist, sans-serif">{s.number}</text>
              <text x={p.x - SDG.w / 2 + 40} y={p.y + 4} fontSize="10.5" fontWeight={600} fill="#fff" fontFamily="Geist, sans-serif">{s.name.length > 24 ? s.name.slice(0, 23) + '...' : s.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground" data-testid="legend-impact">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-teal" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: 'hsl(204 70% 42%)' }} /> Existing skill</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-amber bg-amber/20" /> In progress</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-dashed border-muted-foreground" /> Planned</span>
        <span className="flex items-center gap-1.5"><span className={cn('h-0.5 w-6 border-t-2 border-dashed')} style={{ borderColor: 'hsl(206 58% 25%)' }} /> career to SDG</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 border-t-2 border-dashed border-muted-foreground" /> potential link (not yet completed)</span>
      </div>
    </div>
  );
}
