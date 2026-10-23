import { useState } from 'react';
import { Link } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, BarChart3, Clock4, FileText, Globe2, Map, Rocket, ShieldCheck, Sprout, UserRound, Scale, BookOpenCheck } from 'lucide-react';
import { Logo, AboutDialog } from '@/components/common';
import { cn } from '@/lib/utils';

const base = import.meta.env.BASE_URL;
const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] as const } } };

const STEPS = [
  { n: '01', t: 'Tell us about you', d: 'A five-step survey: studies, internships, projects and how you describe your abilities in plain words.', icon: UserRound },
  { n: '02', t: 'See your market', d: 'A transparent profile summary plus sourced AI and workforce signals linked to your field.', icon: BarChart3 },
  { n: '03', t: 'Explore your future', d: 'Ranked roles with reasons, and a Time Machine that shifts skill priorities across two scenarios.', icon: Clock4 },
  { n: '04', t: 'Build your roadmap and resume', d: 'An ordered learning path with real course links, progress you can track and an ATS-friendly resume.', icon: Map },
];

const DEMO = [
  { s: 'Data visualisation', a: 62, b: 78, t: 'rise' },
  { s: 'Prompting & AI tools', a: 55, b: 86, t: 'rise' },
  { s: 'Stakeholder communication', a: 70, b: 74, t: 'hold' },
  { s: 'Manual report formatting', a: 58, b: 22, t: 'decline' },
  { s: 'SQL querying', a: 72, b: 66, t: 'hold' },
];

function TimeMachineTeaser() {
  const [rapid, setRapid] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-navy p-6 text-white md:p-10">
      <motion.svg className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 opacity-25" viewBox="0 0 200 200" animate={{ rotate: rapid ? 120 : 0 }} transition={{ duration: 1.2 }} aria-hidden>
        {[30, 50, 70, 90].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="hsl(172 62% 60%)" strokeWidth=".5" />)}
        {Array.from({ length: 24 }).map((_, i) => <line key={i} x1="100" y1="8" x2="100" y2="14" stroke="hsl(172 62% 70%)" transform={`rotate(${i * 15} 100 100)`} />)}
      </motion.svg>
      <div className="relative grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-sidebar-primary">Signature feature</p>
          <h3 className="mt-3 font-display text-4xl font-bold leading-[1.05] md:text-5xl">The Career<br />Time Machine</h3>
          <p className="mt-4 max-w-md text-white/70">Flip between a gradual and a rapid AI transformation. Watch which skills rise, hold or fall in priority, and what to do about it. Try it here with a sample Data Analyst profile.</p>
          <div className="mt-6 inline-flex rounded-full bg-white/10 p-1.5">
            {[false, true].map((r) => (
              <button key={String(r)} onClick={() => setRapid(r)} data-testid={`button-teaser-${r ? 'rapid' : 'gradual'}`}
                className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition', rapid === r ? (r ? 'bg-amber text-navy' : 'bg-sidebar-primary text-navy') : 'text-white/70')}>
                {r ? <Rocket className="h-4 w-4" /> : <Sprout className="h-4 w-4" />}{r ? 'Rapid' : 'Gradual'}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-amber">Illustrative planning scenarios, not forecasts of job loss.</p>
        </div>
        <ul className="space-y-4">
          {DEMO.map((d) => {
            const v = rapid ? d.b : d.a;
            const I = d.t === 'rise' ? ArrowUpRight : d.t === 'hold' ? Minus : ArrowDownRight;
            return (
              <li key={d.s}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="flex items-center gap-2"><I className={cn('h-4 w-4', d.t === 'rise' ? 'text-sidebar-primary' : d.t === 'hold' ? 'text-sky-300' : 'text-amber')} />{d.s}</span></div>
                <div className="h-3 rounded-full bg-white/10"><motion.div className={cn('h-full rounded-full', d.t === 'decline' ? 'bg-amber' : 'bg-gradient-to-r from-[hsl(190_70%_45%)] to-sidebar-primary')} animate={{ width: `${v}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} /></div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const imgY = useTransform(scrollYProgress, [0, 0.4], [0, 80]);
  return (
    <div className="grain min-h-[100dvh] overflow-x-hidden bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" data-testid="link-logo"><Logo /></Link>
        </div>
      </header>

      <section className="relative pt-28 md:pt-36">
        <div className="contour-bg absolute inset-0 -z-10" />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.1fr_1fr] md:items-center">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
            <motion.p variants={fade} className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/80 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" /> For Malaysian students and early-career talent
            </motion.p>
            <motion.h1 variants={fade} className="mt-6 font-display text-[clamp(2.8rem,7vw,5.6rem)] font-bold leading-[0.95] tracking-[-0.04em]">
              Navigate<br /><span className="bg-gradient-to-r from-primary via-[hsl(190_80%_35%)] to-teal bg-clip-text text-transparent">What's Next.</span>
            </motion.h1>
            <motion.p variants={fade} className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              AI is reshaping entry-level work faster than syllabi can update. NexPath reads what you can already do, shows where the market is moving, and maps the next skills worth your time.
            </motion.p>
            <motion.div variants={fade} className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/app/understand" data-testid="link-hero-cta" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-[hsl(186_70%_30%)] px-7 py-4 text-base font-semibold text-white shadow-xl shadow-primary/25 transition hover:-translate-y-0.5">
                Explore My Future <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how" className="rounded-full px-5 py-4 text-sm font-medium text-primary hover:bg-secondary">See how it works</a>
            </motion.div>
            <motion.div variants={fade} className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'guided steps', value: '5' },
                { label: 'match signals', value: 'AI + labor' },
                { label: 'career path', value: '2 scenario views' },
              ].map((card) => (
                <div key={card.label} className="rounded-[22px] border border-primary/10 bg-card/75 p-3 shadow-[0_18px_35px_-28px_rgba(14,165,233,0.8)]">
                  <p className="font-display text-xl font-bold text-foreground">{card.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </motion.div>
            <motion.p variants={fade} className="mt-6 text-xs text-muted-foreground">No account. Your data stays in your browser. Try the synthetic demo profile in one click.</motion.p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }} className="relative">
            <motion.div style={{ y: imgY }} className="relative overflow-hidden rounded-[2.5rem] shadow-2xl shadow-primary/20">
              <img src={`${base}hero-map.png`} alt="Topographic career map with a path toward a compass" className="aspect-[4/5] w-full object-cover md:aspect-square" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}
              className="absolute -left-4 bottom-10 rounded-2xl border bg-card/95 p-4 shadow-xl backdrop-blur md:-left-10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Skill in your words</p>
              <p className="mt-1 text-sm font-medium">"I make charts and reports"</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-teal"><ArrowRight className="h-3.5 w-3.5" /> Data visualisation</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
              className="absolute -right-2 top-8 rounded-2xl bg-navy px-4 py-3 text-white shadow-xl md:-right-6">
              <p className="text-[10px] uppercase tracking-widest text-sidebar-primary">Next skill</p>
              <p className="font-display text-lg font-semibold">Power BI basics</p>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-20 overflow-hidden border-y bg-card/60 py-4">
          <div className="marquee flex w-max gap-10 whitespace-nowrap font-display text-lg text-primary/70">
            {Array.from({ length: 2 }).flatMap((_, k) => ['Data Analyst', 'AI/ML Engineer', 'Cybersecurity Analyst', 'UX Designer', 'Cloud Engineer', 'Business Analyst', 'Digital Marketing', 'Education Technologist', 'Project Manager', 'Software Developer'].map((r) => (
              <span key={`${k}-${r}`} className="flex items-center gap-10">{r}<span className="h-1.5 w-1.5 rounded-full bg-teal" /></span>
            )))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fade} className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal">How it works</p>
          <h2 className="mt-3 text-4xl font-bold md:text-5xl">Four steps from "not sure" to a plan you can act on.</h2>
        </motion.div>
        <div className="relative mt-14 grid gap-6 md:grid-cols-4">
          <svg className="absolute left-0 right-0 top-8 hidden h-6 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden>
            <path d="M5 5 Q 27 -3, 50 5 T 95 5" fill="none" stroke="hsl(174 64% 38%)" strokeWidth=".4" className="flow-dash" vectorEffect="non-scaling-stroke" />
          </svg>
          {STEPS.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }} className="relative">
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border bg-card shadow-sm"><s.icon className="h-6 w-6 text-primary" /></div>
              <p className="mt-6 font-mono text-xs text-teal">{s.n}</p>
              <h3 className="mt-1 text-xl font-bold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 pb-24">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl"><p className="font-mono text-xs uppercase tracking-[0.2em] text-teal">Features</p><h2 className="mt-3 text-4xl font-bold md:text-5xl">One flow, four lenses.</h2></div>
          <p className="max-w-sm text-muted-foreground">Each lens feeds the next. Change your profile once and every match, roadmap and resume recalculates.</p>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-6">
          {[
            { t: 'Understand Me & My Market', d: 'Guided survey, a template-written profile that separates what you said from what the system inferred, and market insights tied to your field.', icon: UserRound, cls: 'md:col-span-4 bg-gradient-to-br from-primary to-[hsl(190_75%_28%)] text-white', href: '/app/understand' },
            { t: 'Explore & Prepare My Future', d: 'Ranked careers with matched and missing skills, sourced trends, and the Time Machine.', icon: Clock4, cls: 'md:col-span-2 bg-accent', href: '/app/explore/market' },
            { t: 'Roadmap & Resume', d: 'Ordered skill steps with real course links, a progress tracker and an ATS-friendly resume with PDF export.', icon: FileText, cls: 'md:col-span-3 bg-card border', href: '/app/roadmap' },
            { t: 'SDG Impact', d: 'See how your career and completed skills could connect to SDG 8, 4, 9, 10 and more, each link justified.', icon: Globe2, cls: 'md:col-span-3 bg-navy text-white', href: '/app/impact' },
          ].map((f, i) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className={f.cls + ' card-lift rounded-[2rem]'}>
              <Link href={f.href} className="flex h-full min-h-[220px] flex-col justify-between p-7" data-testid={`link-feature-${i}`}>
                <f.icon className="h-8 w-8 opacity-90" />
                <div><h3 className="mt-8 text-2xl font-bold">{f.t}</h3><p className="mt-2 max-w-md text-sm leading-relaxed opacity-75">{f.d}</p></div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24"><TimeMachineTeaser /></section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 md:grid-cols-2 md:items-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal">Built for here</p>
          <h2 className="mt-3 text-4xl font-bold">From Bangsar co-working desks to Penang fabs.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">Course suggestions favour free and affordable providers. Profiles speak the language of Malaysian degrees, diplomas and internships. Your first job hunt should not depend on who you happen to know.</p>
        </motion.div>
        <div className="grid grid-cols-2 gap-3">
          {[{ i: BookOpenCheck, t: 'Free-first learning', d: 'Coursera audit, edX, freeCodeCamp, Google, Khan Academy.' }, { i: Scale, t: 'No hidden weighting', d: 'Every score comes with matched skills, gaps and reasons.' }, { i: ShieldCheck, t: 'Private by default', d: 'No accounts. Profile and progress live in your browser.' }, { i: Globe2, t: 'SDG 8 at the core', d: 'Decent work, supported by SDG 4, 9 and 10.' }].map((c, k) => (
            <motion.div key={c.t} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: k * 0.08 }} className="rounded-3xl border bg-card p-5">
              <c.i className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">{c.t}</p><p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center">
          <div className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-teal" /><h2 className="text-2xl font-bold">Responsible AI</h2></div>
          <div className="grid flex-1 gap-4 text-sm text-muted-foreground md:grid-cols-3">
            <p><strong className="text-foreground">Scenarios are illustrative</strong>, not predictions or forecasts of job loss.</p>
            <p><strong className="text-foreground">Recommendations are decision support</strong>, never guarantees of fit or employment.</p>
            <p><strong className="text-foreground">Inferences are labelled.</strong> You always see what you said versus what the system guessed.</p>
          </div>
        </div>
      </section>

      <footer className="bg-navy text-sidebar-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div><Logo light /><p className="mt-3 max-w-sm text-sm text-sidebar-foreground/60">Navigate What's Next. A prototype for SDC Hackathon 2026, Future-Ready Workforce track.</p></div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">Product</p>
            <Link href="/app/understand" className="block hover:text-white">Understand Me</Link>
            <Link href="/app/explore/time-machine" className="block hover:text-white">Career Time Machine</Link>
            <Link href="/app/impact" className="block hover:text-white">SDG Impact</Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white">Transparency</p>
            <AboutDialog className="block text-left hover:text-white" />
            <Link href="/app/ai-status" className="block hover:text-white">AI status</Link>
            <p className="text-xs text-sidebar-foreground/50">Demo persona data is synthetic.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
