import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Official UN goal statements (https://sdgs.un.org/goals). */
const DESCRIPTION: Record<number, string> = {
  1: 'End poverty in all its forms everywhere.',
  2: 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture.',
  3: 'Ensure healthy lives and promote well-being for all at all ages.',
  4: 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all.',
  5: 'Achieve gender equality and empower all women and girls.',
  6: 'Ensure availability and sustainable management of water and sanitation for all.',
  7: 'Ensure access to affordable, reliable, sustainable and modern energy for all.',
  8: 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all.',
  9: 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.',
  10: 'Reduce inequality within and among countries.',
  11: 'Make cities and human settlements inclusive, safe, resilient and sustainable.',
  12: 'Ensure sustainable consumption and production patterns.',
  13: 'Take urgent action to combat climate change and its impacts.',
  14: 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development.',
  15: 'Protect, restore and promote sustainable use of terrestrial ecosystems, manage forests sustainably, combat desertification, halt and reverse land degradation and halt biodiversity loss.',
  16: 'Promote peaceful and inclusive societies, provide access to justice for all and build effective, accountable and inclusive institutions at all levels.',
  17: 'Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development.',
};

export function SdgReference({ sdgs, mapped }: { sdgs: { number: number; name: string; color: string }[]; mapped: Set<number> }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-10 rounded-3xl border bg-card" data-testid="panel-sdg-reference">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left" data-testid="button-sdg-reference">
        <span className="flex-1">
          <span className="block font-display text-lg font-bold">All 17 Sustainable Development Goals</span>
          <span className="block text-xs text-muted-foreground">Reference list. Goals linked to your career and skills are highlighted.</span>
        </span>
        <ChevronDown className={cn('h-5 w-5 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t p-4 md:p-5">
          <ul className="grid gap-2 md:grid-cols-2" data-testid="list-sdg-reference">
            {sdgs.map((s) => {
              const yes = mapped.has(s.number);
              return (
                <li key={s.number} id={`ref-sdg-${s.number}`} className={cn('flex gap-3 rounded-2xl border p-3', yes ? 'border-2 bg-accent/30' : 'bg-background')} style={yes ? { borderColor: s.color } : undefined} data-testid={`ref-sdg-${s.number}`} data-mapped={yes}>
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold', yes ? 'text-white' : 'bg-secondary text-muted-foreground')} style={yes ? { background: s.color } : undefined}>{s.number}</span>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{DESCRIPTION[s.number]}</p>
                    {yes
                      ? <a href={`#why-sdg-${s.number}`} className="mt-1 inline-block text-xs font-semibold text-primary underline">See why it is linked to you</a>
                      : <p className="mt-1 text-[11px] italic text-muted-foreground">No direct link identified for your selected career and skills</p>}
                    <a href={`https://sdgs.un.org/goals/goal${s.number}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">UN page <ExternalLink className="h-3 w-3" /></a>
                  </div>
                </li>
              );
            })}
          </ul>
          <a href="https://sdgs.un.org/goals" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Official UN SDG site <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      )}
    </section>
  );
}
