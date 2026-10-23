import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Play, ServerCog, ShieldCheck, Zap } from 'lucide-react';
import { useGetAiStatus, getGetAiStatusQueryKey, useHealthCheck, getHealthCheckQueryKey, useTestSimilarity } from '@workspace/api-client-react';
import { PageHeader, ModeBadge, ErrorState, Shimmer, Bar } from '@/components/common';
import { cn } from '@/lib/utils';

export default function AiStatusPage() {
  const st = useGetAiStatus({ query: { queryKey: getGetAiStatusQueryKey(), refetchInterval: 30000 } });
  const hz = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const sim = useTestSimilarity();
  const [text, setText] = useState('creating charts and reports');
  const s = st.data;
  const ai = s?.mode === 'embedding';

  return (
    <div>
      <PageHeader eyebrow="System / AI Status" title="AI status" description="Technical evidence: which matching engine is live right now, and a test box to probe it." />
      {st.isError && <ErrorState onRetry={() => st.refetch()} />}
      {st.isLoading && <div className="grid gap-4 md:grid-cols-3"><Shimmer className="h-36" /><Shimmer className="h-36" /><Shimmer className="h-36" /></div>}
      {s && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className={cn('relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_24px_56px_-32px_rgba(14,165,233,0.8)] md:col-span-2', ai ? 'bg-gradient-to-br from-primary to-teal' : 'bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.22),_rgba(15,23,42,0.96)_58%)] bg-navy')}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3"><span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', s.status === 'ok' ? 'bg-emerald-300' : 'bg-amber')} /><span className={cn('relative inline-flex h-3 w-3 rounded-full', s.status === 'ok' ? 'bg-emerald-300' : 'bg-amber')} /></span>
              <span className="font-mono text-xs uppercase tracking-[0.18em]" data-testid="text-api-status">API {s.status}{hz.data ? ` / healthz ${hz.data.status}` : ''}</span>
            </div>
            <p className="mt-6 text-sm opacity-70">Active matching mode</p>
            <p className="font-display text-3xl font-bold" data-testid="text-mode-label">{s.modeLabel}</p>
            {s.fallbackReason && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm" data-testid="text-fallback-reason">Fallback reason: {s.fallbackReason}</p>}
          </div>
          <div className="space-y-3 rounded-[28px] border bg-card p-6 text-sm shadow-[0_18px_32px_-30px_rgba(15,23,42,0.75)]">
            <div className="flex items-center gap-2"><ServerCog className="h-4 w-4 text-primary" /> Embedding endpoint: <strong>{s.embeddingConfigured ? 'configured' : 'not configured'}</strong></div>
            <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" /> Engine: <strong className="font-mono">{s.mode}</strong></div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal" /> Auto-fallback to rule-based on timeout or error</div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-[28px] border bg-card p-6 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.75)]">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Zap className="h-5 w-5 text-amber" /> Live similarity test</h2>
        <p className="mb-4 text-sm text-muted-foreground">Type how you'd describe an ability. We return the closest catalogue skills.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) sim.mutate({ data: { text: text.trim() } }); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 rounded-full border bg-background px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" data-testid="input-similarity" />
          <button disabled={sim.isPending || !text.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-run-similarity"><Play className="h-4 w-4" /> {sim.isPending ? 'Running...' : 'Run test'}</button>
        </form>
        {sim.isError && <div className="mt-4"><ErrorState onRetry={() => sim.mutate({ data: { text } })} /></div>}
        {sim.data && (
          <div className="mt-6">
            <ModeBadge mode={sim.data.mode} label={sim.data.modeLabel} />
            <ul className="mt-4 space-y-3">
              {sim.data.results.map((r, i) => (
                <motion.li key={r.skillId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="grid grid-cols-[1fr_2fr_auto] items-center gap-4 rounded-2xl border bg-secondary/40 px-4 py-3" data-testid={`row-similar-${r.skillId}`}>
                  <span className="text-sm font-medium">{r.name}</span>
                  <Bar value={r.similarity * 100} delay={i * 0.05} />
                  <span className="font-mono text-xs">{r.similarity.toFixed(3)}</span>
                </motion.li>
              ))}
              {sim.data.results.length === 0 && <li className="text-sm text-muted-foreground">No similar skills found. Try a different phrase.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
