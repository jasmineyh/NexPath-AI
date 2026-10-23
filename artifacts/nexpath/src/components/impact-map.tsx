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
  heading: string;
  potential: boolean;
}

const STATUS_LABEL: Record<SkillStatus, string> = { completed: 'Completed', 'in-progress': 'In progress', existing: 'Existing skill', planned: 'Planned' };
const W = 900;
const CAREER = { x: 110, w: 190 };
const SKILL = { x: 450, w: 230 };
const SDG = { x: 790, w: 190 };

const SDG_OFFICIAL_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21', 6: '#26BDE2',
  7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367', 11: '#FD9D24', 12: '#BF8B2E',
  13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B', 16: '#00689D', 17: '#19486A',
};

export function SdgWheel({ sdgs, mapped, selected, onSelect }: { sdgs: MapSdg[]; mapped: Set<number>; selected: number | null; onSelect: (n: number | null) => void }) {
  const list = Array.from({ length: 17 }, (_, i) => i + 1);
  const radius = 120;
  const cx = 180;
  const cy = 180;

  const getArc = (num: number) => {
    const start = ((num - 1) / 17) * Math.PI * 2 - Math.PI / 2;
    const end = (num / 17) * Math.PI * 2 - Math.PI / 2;
    const innerRadius = 58;
    const outerRadius = 130;
    const x1 = cx + innerRadius * Math.cos(start);
    const y1 = cy + innerRadius * Math.sin(start);
    const x2 = cx + innerRadius * Math.cos(end);
    const y2 = cy + innerRadius * Math.sin(end);
    const x3 = cx + outerRadius * Math.cos(end);
    const y3 = cy + outerRadius * Math.sin(end);
    const x4 = cx + outerRadius * Math.cos(start);
    const y4 = cy + outerRadius * Math.sin(start);
    const largeArc = Math.abs(end - start) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <div className="rounded-[30px] border bg-card p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">SDG portfolio</p>
          <h3 className="mt-1 font-display text-2xl font-bold">17-goal map</h3>
        </div>
        <div className="rounded-full border bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{mapped.size} connected</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
        <div className="flex justify-center">
          <svg viewBox="0 0 360 360" className="h-[360px] w-[360px] max-w-full" role="img" aria-label="Wheel of Sustainable Development Goals">
            <circle cx={cx} cy={cy} r={radius + 18} fill="rgba(148, 163, 184, 0.08)" />
            {list.map((num) => {
              const goal = sdgs.find((g) => g.number === num) ?? { number: num, name: `SDG ${num}`, color: '#CBD5E1' };
              const isMapped = mapped.has(num);
              const isSelected = selected === num;
              return (
                <g key={num} onClick={() => onSelect(isSelected ? null : num)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(isSelected ? null : num); } }} role="button" tabIndex={0}
                  className="cursor-pointer outline-none" aria-label={`SDG ${num}: ${goal.name}`}>
                  <path d={getArc(num)} fill={isMapped ? (goal.color || SDG_OFFICIAL_COLORS[num] || '#64748b') : '#E2E8F0'} stroke={isSelected ? '#111827' : 'rgba(15,23,42,0.18)'} strokeWidth={isSelected ? 3 : 1.2} />
                  <text x={cx + (radius + 10) * Math.cos((num - 0.5) * (Math.PI * 2 / 17) - Math.PI / 2)} y={cy + (radius + 10) * Math.sin((num - 0.5) * (Math.PI * 2 / 17) - Math.PI / 2)} textAnchor="middle" dominantBaseline="middle"
                    fontSize="13" fontWeight={800} fill={isMapped ? '#fff' : '#334155'}>{num}</text>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r={48} fill="#fff" stroke="rgba(15,23,42,0.08)" strokeWidth="2" />
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight={700} fill="#0f172a">SDGs</text>
            <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="#475569">17 total</text>
          </svg>
        </div>
        <div className="rounded-[24px] border border-primary/10 bg-[linear-gradient(180deg,rgba(14,165,233,0.06),rgba(15,23,42,0.02))] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Selected goal</p>
          {selected ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ background: sdgs.find((g) => g.number === selected)?.color || SDG_OFFICIAL_COLORS[selected] || '#64748b' }}>{selected}</span>
                <div>
                  <p className="font-display text-xl font-bold">{sdgs.find((g) => g.number === selected)?.name ?? `SDG ${selected}`}</p>
                  <p className="text-xs text-muted-foreground">{mapped.has(selected) ? 'Linked to your profile' : 'Currently not linked to your current profile'}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{(sdgs.find((g) => g.number === selected)?.name ? `Goal ${selected} focuses on ${sdgs.find((g) => g.number === selected)?.name.toLowerCase()}.` : '')}{mapped.has(selected) ? ' This goal is represented in the current impact map because a linked skill or career connection is active.' : ' This goal remains grey because there is no supported link from your current career and skills.'}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Select a goal to review whether it is active in your current profile, planned, or not yet linked.</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
