import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BarChart3, BriefcaseBusiness, Check, ChevronDown, ChevronRight, Clock4, Compass, FileText, Globe2, ListChecks, Map as MapIcon, Menu, PanelLeftClose, PanelLeftOpen, Radar, UserRound, UserPen, X } from 'lucide-react';
import { AboutDialog, Logo, DemoBadge } from '@/components/common';
import { useStore, completedIds } from '@/lib/store';
import { cn } from '@/lib/utils';

type NavLeaf = { href: string; label: string; icon: typeof Compass; optional?: boolean };
const NAV: NavLeaf[] = [
  { href: '/app/understand', label: 'My Profile', icon: UserRound },
  { href: '/app/explore/trends', label: 'Future Skills Radar', icon: Radar },
  { href: '/app/explore/market', label: 'Career Explorer', icon: BriefcaseBusiness },
  { href: '/app/roadmap', label: 'My Pathway', icon: MapIcon },
  { href: '/app/impact', label: 'My Career Portfolio', icon: Globe2 },
];

const CRUMBS: Record<string, string[]> = {
  '/app/understand': ['My Profile'],
  '/app/explore/trends': ['Future Skills Radar'],
  '/app/explore/time-machine': ['Future Skills Radar', 'Career Time Machine'],
  '/app/explore/market': ['Career Explorer'],
  '/app/roadmap': ['My Pathway'],
  '/app/roadmap/resume': ['My Career Portfolio', 'My Resume'],
  '/app/impact': ['My Career Portfolio'],
  '/app/ai-status': ['Data & AI', 'AI Status'],
};

function Journey() {
  const { profile, targetId, progress } = useStore();
  const done = completedIds(progress).length;
  const steps = [
    { label: 'Profile', ok: !!profile },
    { label: 'Market', ok: !!targetId },
    { label: 'Roadmap', ok: done > 0 },
  ];
  return (
    <div className="mx-3 mb-4 rounded-2xl bg-sidebar-accent/70 p-3" data-testid="panel-journey">
      <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Your journey</p>
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-colors',
                s.ok ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground' : 'border-sidebar-foreground/30 text-sidebar-foreground/60')}>
                {s.ok ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="text-[10px] text-sidebar-foreground/80">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className={cn('mx-1 mb-4 h-px flex-1', s.ok ? 'bg-sidebar-primary' : 'bg-sidebar-foreground/20')} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const [loc] = useLocation();
  const { profile, isDemo } = useStore();
  const leaf = (n: NavLeaf) => {
    const active = loc === n.href ||
      (n.href === '/app/understand' && loc.startsWith('/app/understand')) ||
      (n.href === '/app/explore/trends' && (loc.startsWith('/app/explore/') || loc.startsWith('/app/future-skills'))) ||
      (n.href === '/app/explore/market' && loc.startsWith('/app/explore/market')) ||
      (n.href === '/app/roadmap' && loc.startsWith('/app/roadmap')) ||
      (n.href === '/app/impact' && (loc.startsWith('/app/impact') || loc.startsWith('/app/portfolio')));
    const locked = !profile && !['/app/understand'].includes(n.href);
    return (
      <Link key={n.href} href={n.href} onClick={onNavigate} data-testid={`link-nav-${n.href.split('/').pop()}`}
        className={cn('group relative flex items-center gap-2.5 rounded-2xl border border-transparent px-3 py-2.5 text-sm transition-all duration-200',
          active ? 'border-sidebar-primary/30 bg-gradient-to-r from-sidebar-primary/18 via-sidebar-primary/8 to-transparent text-white shadow-[0_14px_30px_-18px_rgba(45,212,191,0.75)]' : 'text-sidebar-foreground/75 hover:border-white/10 hover:bg-sidebar-accent/80 hover:text-white')}>
        {active && <motion.span layoutId="nav-active" className="absolute inset-y-1 left-1 w-[3px] rounded-full bg-sidebar-primary" />}
        <n.icon className={cn('h-4 w-4 shrink-0', active ? 'text-sidebar-primary' : 'opacity-70')} />
        <span className="flex-1 truncate">{n.label}</span>
        {locked && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-foreground/30" title="Complete Understand Me first" />}
      </Link>
    );
  };
  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center px-5 pt-5 pb-6" onClick={onNavigate} data-testid="link-home"><Logo light /></Link>
      <Journey />
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((n) => leaf(n))}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-4 space-y-2 text-xs">
        {profile && (
          <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/60 p-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary/20 font-display text-sm font-bold text-sidebar-primary">
              {(profile.name ?? 'You').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white" data-testid="text-sidebar-name">{profile.name || 'Your profile'}</p>
              <p className="truncate text-sidebar-foreground/60">{profile.major}</p>
            </div>
            {isDemo && <DemoBadge />}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/40 px-2 py-1.5 text-sidebar-foreground/80">
          <Activity className="h-3.5 w-3.5 text-sidebar-primary" />
          <Link href="/app/ai-status" onClick={onNavigate} data-testid="link-ai-status" className="flex-1 hover:text-white">Data & AI</Link>
        </div>
        <AboutDialog className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sidebar-foreground/75 hover:text-white" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [mobile, setMobile] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setMobile(false); window.scrollTo({ top: 0 }); }, [loc]);
  const crumbs = CRUMBS[loc] ?? [];

  return (
    <div className="min-h-[100dvh] bg-background contour-bg">
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-sidebar-border/70 bg-[linear-gradient(180deg,rgba(10,18,30,0.98),rgba(11,24,36,0.96))] shadow-[0_20px_60px_-28px_rgba(15,23,42,0.9)] transition-transform duration-300 lg:block', hidden && '-translate-x-full')}>
        <SidebarBody />
      </aside>
      <AnimatePresence>
        {mobile && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <button className="absolute right-3 top-5 text-sidebar-foreground" onClick={() => setMobile(false)} data-testid="button-close-menu"><X className="h-5 w-5" /></button>
              <SidebarBody onNavigate={() => setMobile(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300', !hidden && 'lg:pl-[264px]')}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2.5 border-b border-border/70 bg-background/80 px-3 shadow-[0_1px_0_rgba(148,163,184,0.07)] backdrop-blur-xl sm:gap-3 sm:px-4 md:px-8">
          <button className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground lg:hidden" onClick={() => setMobile(true)} data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground lg:block" onClick={() => setHidden((h) => !h)} data-testid="button-toggle-sidebar" title="Toggle sidebar">
            {hidden ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <nav className="flex min-w-0 flex-1 items-center gap-1 text-[11px] sm:gap-1.5 sm:text-sm" aria-label="Breadcrumb" data-testid="nav-breadcrumbs">
            <Link href="/app/understand" className="rounded-full px-1.5 py-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground sm:px-2">App</Link>
            {crumbs.map((c, i) => (
              <span key={c} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60 sm:h-3.5 sm:w-3.5" />
                <span className={cn('truncate rounded-full px-1.5 py-1 sm:px-2', i === crumbs.length - 1 ? 'bg-secondary/80 font-medium text-foreground' : 'text-muted-foreground')}>{c}</span>
              </span>
            ))}
          </nav>
          <Link href="/app/understand?edit=1" data-testid="link-edit-profile"
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 to-teal/10 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-[0_10px_25px_-18px_rgba(14,165,233,0.8)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary sm:px-3.5 sm:text-sm">
            <UserPen className="h-4 w-4" /><span className="hidden sm:inline">Edit my profile</span>
          </Link>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 md:px-8 md:py-10">
          <motion.div key={loc} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">{children}</motion.div>
        </main>
        <footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>NexPath AI is decision support, not a guarantee of outcomes. No real-time job listings or verified forecasts.</p>
          <AboutDialog className="text-left font-medium text-primary hover:underline" />
        </footer>
      </div>
    </div>
  );
}
