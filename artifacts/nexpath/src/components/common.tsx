import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Cpu, FlaskConical, Lock, RefreshCw, Sparkles, Database, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="14.5" fill="none" stroke={light ? 'hsl(172 62% 47%)' : 'hsl(200 80% 29%)'} strokeWidth="1.5" />
        <path d="M16 5 L19.5 16 L16 27 L12.5 16 Z" fill={light ? 'hsl(172 62% 47%)' : 'hsl(200 80% 29%)'} />
        <path d="M16 5 L19.5 16 L12.5 16 Z" fill={light ? 'hsl(190 40% 96%)' : 'hsl(174 64% 42%)'} />
        <circle cx="16" cy="16" r="2" fill={light ? 'hsl(206 58% 13%)' : 'hsl(190 45% 99%)'} />
      </svg>
      <span className={cn('font-display text-lg font-bold tracking-tight', light ? 'text-white' : 'text-foreground')}>
        NexPath<span className={light ? 'text-sidebar-primary' : 'text-teal'}> AI</span>
      </span>
    </span>
  );
}

export function ModeBadge({ mode, label, className }: { mode?: string; label?: string; className?: string }) {
  if (!label) return null;
  const ai = mode === 'embedding';
  return (
    <span data-testid="status-matching-mode" className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium font-mono',
      ai ? 'border-teal/40 bg-accent text-accent-foreground' : 'border-amber/40 bg-amber/10 text-[hsl(30_80%_32%)]', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', ai ? 'bg-teal animate-pulse' : 'bg-amber')} />
      Matching mode: {label}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span data-testid="badge-demo" className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(30_80%_32%)]">
      <FlaskConical className="h-3 w-3" /> Demo data
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-teal">{eyebrow}</p>}
        <h1 className="text-3xl font-bold md:text-4xl" data-testid="text-page-title">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function NextStep({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <Link href={href} data-testid={`link-next-${href.replace(/\W+/g, '-')}`}
      className="group mt-12 flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary to-[hsl(186_70%_30%)] px-6 py-5 text-primary-foreground shadow-lg shadow-primary/10 transition-transform hover:-translate-y-0.5">
      <div>
        {hint && <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/70 font-mono">{hint}</p>}
        <p className="font-display text-lg font-semibold">{label}</p>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
        <ArrowRight className="h-5 w-5" />
      </span>
    </Link>
  );
}

export function LockedPrompt({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="relative mx-auto mt-10 max-w-xl overflow-hidden rounded-3xl border bg-card p-10 text-center">
      <svg className="absolute inset-0 h-full w-full opacity-[0.35]" aria-hidden>
        {[60, 110, 160, 210, 260].map((r) => <circle key={r} cx="50%" cy="38%" r={r} fill="none" stroke="hsl(174 50% 70%)" strokeDasharray="3 6" />)}
      </svg>
      <div className="relative">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary"><Lock className="h-6 w-6" /></div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{body}</p>
        <Link href={href} data-testid="link-locked-cta" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4" data-testid="status-error">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></div>
      <div className="flex-1">
        <p className="font-semibold">We couldn't reach the NexPath engine.</p>
        <p className="text-sm text-muted-foreground">{message ?? 'The API may be starting up. Try again in a moment.'}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} data-testid="button-retry" className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function Shimmer({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-gradient-to-r from-secondary via-muted to-secondary', className)} />;
}

export function CardSkeletons({ n = 3, h = 'h-40' }: { n?: number; h?: string }) {
  return <div className="grid gap-4">{Array.from({ length: n }).map((_, i) => <Shimmer key={i} className={h} />)}</div>;
}

export function Ring({ value, size = 120, stroke = 10, label, sub }: { value: number; size?: number; stroke?: number; label?: ReactNode; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`rg-${size}`} x1="0" x2="1"><stop offset="0" stopColor="hsl(200 80% 32%)" /><stop offset="1" stopColor="hsl(172 62% 45%)" /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#rg-${size})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (v / 100) * c }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-bold" style={{ fontSize: size / 4.4 }}>{label ?? `${Math.round(v)}%`}</span>
        {sub && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export function Bar({ value, className, tone = 'primary', delay = 0 }: { value: number; className?: string; tone?: 'primary' | 'teal' | 'amber'; delay?: number }) {
  const bg = tone === 'amber' ? 'bg-amber' : tone === 'teal' ? 'bg-teal' : 'bg-gradient-to-r from-primary to-teal';
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <motion.div className={cn('h-full rounded-full', bg)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-primary/25 bg-secondary/50 px-4 py-3 text-xs text-muted-foreground" data-testid="text-disclaimer">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> <span>{children}</span>
    </p>
  );
}

export function AboutDialog({ trigger, className }: { trigger?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className} data-testid="button-about-prototype">{trigger ?? 'About this prototype'}</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">About this prototype</DialogTitle>
            <DialogDescription>NexPath AI is a hackathon prototype for SDC Hackathon 2026 (Future-Ready Workforce). Here is exactly what is happening under the hood.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { icon: Cpu, t: 'Real AI inference', b: 'Only when the matching mode reads "AI semantic (RunPod)": your skills and self-description are embedded with a sentence-transformer model and compared by cosine similarity.' },
              { icon: Sparkles, t: 'Rule-based logic', b: 'Profile summaries, roadmaps, scenarios, SDG mappings and the "Rule-based fallback" matcher use transparent templates, keyword/synonym overlap and curated JSON data.' },
              { icon: Database, t: 'Demo and curated data', b: 'The "Alex Tan" persona is synthetic. Trends and course links come from curated files with named sources. Nothing here is a guarantee, a live job listing or a verified forecast.' },
            ].map(({ icon: I, t, b }) => (
              <div key={t} className="flex gap-3 rounded-2xl bg-secondary/60 p-4">
                <I className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div><p className="font-semibold">{t}</p><p className="text-muted-foreground">{b}</p></div>
              </div>
            ))}
          </div>
          <Link href="/app/ai-status" onClick={() => setOpen(false)} data-testid="link-ai-status-modal" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Check live AI status <ArrowRight className="h-4 w-4" />
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } } },
};
