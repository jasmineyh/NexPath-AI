import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ExternalLink, Search, X } from 'lucide-react';
import { useListTrends, getListTrendsQueryKey, type ListTrendsParams } from '@workspace/api-client-react';
import { PageHeader, ErrorState, CardSkeletons, NextStep, stagger } from '@/components/common';
import { cn } from '@/lib/utils';

export default function TrendsPage() {
  const [industry, setIndustry] = useState<string>('');
  const [skillText, setSkillText] = useState('');
  const [skill, setSkill] = useState('');
  const params = useMemo<ListTrendsParams>(() => ({ ...(industry ? { industry } : {}), ...(skill ? { skill } : {}) }), [industry, skill]);
  const all = useListTrends(undefined, { query: { queryKey: getListTrendsQueryKey() } });
  const q = useListTrends(params, { query: { queryKey: getListTrendsQueryKey(params), placeholderData: (p) => p } });
  const industries = all.data?.industries ?? [];
  const items = useMemo(() => [...(q.data?.items ?? [])].sort((a, b) => b.publishedDate.localeCompare(a.publishedDate)), [q.data]);

  return (
    <div>
      <PageHeader eyebrow="Explore Me / Trends" title="Career Evolution Radar"
        description="Curated AI and workforce signals with named sources. Maintained in a data file, not hard-coded."
        actions={q.data && <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 font-mono text-xs" data-testid="text-last-updated"><CalendarDays className="h-3.5 w-3.5 text-teal" /> Last updated {q.data.lastUpdated}</span>} />

      <div className="sticky top-16 z-20 -mx-4 mb-8 space-y-3 bg-background/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap gap-2">
          {['', ...industries].map((i) => (
            <button key={i || 'all'} onClick={() => setIndustry(i)} data-testid={`button-industry-${i || 'all'}`}
              className={cn('rounded-full border px-3.5 py-1.5 text-sm transition', industry === i ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}>{i || 'All industries'}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSkill(skillText.trim()); }} className="flex max-w-md items-center gap-2 rounded-full border bg-card px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={skillText} onChange={(e) => setSkillText(e.target.value)} placeholder="Filter by skill, e.g. data analysis" className="flex-1 bg-transparent text-sm outline-none" data-testid="input-skill-filter" />
          {skill && <button type="button" onClick={() => { setSkill(''); setSkillText(''); }} data-testid="button-clear-skill"><X className="h-4 w-4" /></button>}
          <button type="submit" className="rounded-full bg-secondary px-3 py-1 text-xs font-medium" data-testid="button-apply-skill">Apply</button>
        </form>
      </div>

      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {q.isLoading && <CardSkeletons n={3} h="h-44" />}
      {q.data && items.length === 0 && (
        <div className="rounded-3xl border border-dashed p-12 text-center"><p className="font-display text-lg font-semibold">No signals match these filters.</p><p className="text-sm text-muted-foreground">Try another industry or clear the skill filter.</p></div>
      )}
      <motion.ol key={JSON.stringify(params)} variants={stagger.container} initial="hidden" animate="show" className="relative space-y-5 border-l-2 border-dashed border-primary/20 pl-6 md:pl-10">
        {items.map((t) => (
          <motion.li variants={stagger.item} key={t.id} className="relative" data-testid={`card-trend-${t.id}`}>
            <span className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-4 border-background bg-teal md:-left-[49px]" />
            <article className="card-lift rounded-3xl border bg-card p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-teal">{t.publishedDate}</span>
                {t.industries.map((i) => <span key={i} className="rounded-full bg-secondary px-2 py-0.5">{i}</span>)}
              </div>
              <h3 className="mt-2 text-xl font-bold leading-snug">{t.title}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{t.summary}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div><p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Affected occupations</p><div className="flex flex-wrap gap-1.5">{t.occupations.map((o) => <span key={o} className="rounded-full border px-2.5 py-0.5 text-xs">{o}</span>)}</div></div>
                <div><p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Skills in focus</p><div className="flex flex-wrap gap-1.5">{t.skills.map((s) => <button key={s} onClick={() => { setSkill(s); setSkillText(s); }} className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground hover:ring-1 hover:ring-teal">{s}</button>)}</div></div>
              </div>
              <a href={t.sourceUrl} target="_blank" rel="noreferrer" data-testid={`link-source-${t.id}`} className="mt-5 inline-flex items-center gap-1.5 border-t pt-3 text-sm font-medium text-primary hover:underline">
                Source: {t.sourceName} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>
          </motion.li>
        ))}
      </motion.ol>
      <NextStep href="/app/explore/time-machine" hint="Next" label="Step into the Career Time Machine" />
    </div>
  );
}
