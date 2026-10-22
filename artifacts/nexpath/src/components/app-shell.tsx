import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BarChart3, Check, ChevronDown, ChevronRight, Clock4, Compass, FileText, Globe2, ListChecks, Map, Menu, PanelLeftClose, PanelLeftOpen, Radar, Telescope, UserRound, UserPen, X } from 'lucide-react';
import { AboutDialog, Logo, DemoBadge } from '@/components/common';
import { useStore, completedIds } from '@/lib/store';
import { cn } from '@/lib/utils';

type NavLeaf = { href: string; label: string; icon: typeof Compass };
type NavGroup = { label: string; icon: typeof Compass; children: NavLeaf[] };
const NAV: (NavLeaf | NavGroup)[] = [
  { href: '/app/understand', label: 'Understand Me', icon: UserRound },
  { label: 'Explore Me', icon: Telescope, children: [
    { href: '/app/explore/market', label: 'Career Market', icon: BarChart3 },
    { href: '/app/explore/trends', label: 'Trends', icon: Radar },
    { href: '/app/explore/time-machine', label: 'Career Time Machine', icon: Clock4 },
  ] },
  { label: 'Roadmap', icon: Map, children: [
    { href: '/app/roadmap', label: 'Skill Roadmap', icon: Map },
    { href: '/app/roadmap/tracker', label: 'Progress Tracker', icon: ListChecks },
    { href: '/app/roadmap/resume', label: 'My Resume', icon: FileText },
  ] },
  { label: 'Impact', icon: Globe2, children: [{ href: '/app/impact', label: 'SDG Impact', icon: Globe2 }] },
];

const CRUMBS: Record<string, string[]> = {
  '/app/understand': ['Understand Me'],
  '/app/explore/market': ['Explore Me', 'Career Market'],
  '/app/explore/trends': ['Explore Me', 'Trends'],
  '/app/explore/time-machine': ['Explore Me', 'Career Time Machine'],
  '/app/roadmap': ['Roadmap', 'Skill Roadmap'],
  '/app/roadmap/tracker': ['Roadmap', 'Progress Tracker'],
  '/app/roadmap/resume': ['Roadmap', 'My Resume'],
  '/app/impact': ['Impact', 'SDG Impact'],
  '/app/ai-status': ['System', 'AI Status'],
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
  const [open, setOpen] = useState<Record<string, boolean>>({ 'Explore Me': true, Roadmap: true, Impact: true });
  const leaf = (n: NavLeaf, nested = false) => {
    const active = loc === n.href;
    const locked = !profile && n.href !== '/app/understand';
    return (
      <Link key={n.href} href={n.href} onClick={onNavigate} data-testid={`link-nav-${n.href.split('/').pop()}`}
        className={cn('group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors',
          nested && 'ml-4 pl-4',
          active ? 'bg-sidebar-primary/15 text-white font-medium' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white')}>
        {active && <motion.span layoutId="nav-active" className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-sidebar-primary" />}
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
        {NAV.map((n) => 'href' in n ? leaf(n) : (
          <div key={n.label}>
            <button onClick={() => setOpen((o) => ({ ...o, [n.label]: !o[n.label] }))} data-testid={`button-group-${n.label.replace(/\s/g, '-').toLowerCase()}`}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent">
              <n.icon className="h-4 w-4 opacity-70" />
              <span className="flex-1 text-left font-medium">{n.label}</span>
              <ChevronDown className={cn('h-4 w-4 opacity-60 transition-transform', !open[n.label] && '-rotate-90')} />
            </button>
            <AnimatePresence initial={false}>
              {open[n.label] && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative overflow-hidden">
                  <span className="absolute left-[22px] top-1 bottom-1 w-px bg-sidebar-border" />
                  {n.children.map((c) => leaf(c, true))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
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
        <Link href="/app/ai-status" onClick={onNavigate} data-testid="link-ai-status" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sidebar-foreground/75 hover:text-white">
          <Activity className="h-3.5 w-3.5 text-sidebar-primary" /> AI status
        </Link>
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
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden w-[264px] bg-sidebar transition-transform duration-300 lg:block', hidden && '-translate-x-full')}>
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <button className="rounded-lg p-2 hover:bg-secondary lg:hidden" onClick={() => setMobile(true)} data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-lg p-2 hover:bg-secondary lg:block" onClick={() => setHidden((h) => !h)} data-testid="button-toggle-sidebar" title="Toggle sidebar">
            {hidden ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-sm" aria-label="Breadcrumb" data-testid="nav-breadcrumbs">
            <Link href="/app/understand" className="text-muted-foreground hover:text-foreground">App</Link>
            {crumbs.map((c, i) => (
              <span key={c} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className={cn('truncate', i === crumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>{c}</span>
              </span>
            ))}
          </nav>
          <Link href="/app/understand?edit=1" data-testid="link-edit-profile"
            className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium hover:border-primary/40 hover:text-primary">
            <UserPen className="h-4 w-4" /><span className="hidden sm:inline">Edit my profile</span>
          </Link>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
          <motion.div key={loc} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>{children}</motion.div>
        </main>
        <footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>NexPath AI is decision support, not a guarantee of outcomes. No real-time job listings or verified forecasts.</p>
          <AboutDialog className="text-left font-medium text-primary hover:underline" />
        </footer>
      </div>
    </div>
  );
}
