import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useBuildImpact, useListSdgs, getListSdgsQueryKey, useListSkills, getListSkillsQueryKey, useListOccupations, getListOccupationsQueryKey, type ImpactRequest } from '@workspace/api-client-react';
import { useStore } from '@/lib/store';
import { useRoadmap } from '@/hooks/use-roadmap';
import { useAutoMutation } from '@/hooks/use-auto-mutation';
import { PageHeader, ErrorState, Shimmer, LockedPrompt, Disclaimer, NextStep } from '@/components/common';
import { ImpactMap, type MapLink, type MapSkill, type MapSdg, type SkillStatus } from '@/components/impact-map';
import { SdgReference } from '@/components/sdg-reference';

const norm = (x: string) => x.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim();
const lcFirst = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const POTENTIAL = 'Potential after you complete this.';

export default function ImpactPage() {
  const { profile, targetId, progress, source } = useStore();
  const sdgs = useListSdgs({ query: { queryKey: getListSdgsQueryKey(), staleTime: Infinity } });
  const occs = useListOccupations({ query: { queryKey: getListOccupationsQueryKey(), staleTime: Infinity } });
  const { roadmap } = useRoadmap();
  const occ = occs.data?.find((o) => o.id === targetId);

  const m = useBuildImpact();
  const payload = useMemo<ImpactRequest | null>(() => (profile && occ ? { occupationId: occ.id, completedSkillIds: occ.requiredSkills.map((r) => r.skillId) } : null), [profile, occ]);
  const retry = useAutoMutation(m.mutate, payload);
  const catalogue = useListSkills({ query: { queryKey: getListSkillsQueryKey(), staleTime: Infinity } });
  const existing = useMemo(() => {
    if (!profile || source !== 'cv' || !catalogue.data) return [];
    const byName = new Map<string, (typeof catalogue.data)[number]>();
    catalogue.data.forEach((k) => [k.name, ...(k.synonyms ?? [])].forEach((n) => byName.set(norm(n), k)));
    const out = new Map<string, { id: string; name: string }>();
    [...profile.technicalSkills, ...profile.humanSkills].forEach((n) => { const k = byName.get(norm(n)); if (k) out.set(k.id, { id: k.id, name: k.name }); });
    return [...out.values()];
  }, [profile, source, catalogue.data]);
  const ex = useBuildImpact();
  const exPayload = useMemo<ImpactRequest | null>(() => (existing.length ? { occupationId: null, completedSkillIds: existing.map((e) => e.id) } : null), [existing]);
  useAutoMutation(ex.mutate, exPayload);
  const [active, setActive] = useState<MapLink | null>(null);
  const g = m.data;
  const color = (n?: number | null) => sdgs.data?.find((s) => s.number === n)?.color ?? 'hsl(200 80% 35%)';

  const model = useMemo(() => {
    if (!g || !occ || !sdgs.data) return null;
    const covered = new Set((roadmap?.alreadyCovered ?? []).map(norm));
    const cvIds = new Set(existing.map((e) => e.id));
    const status = (id: string, name: string): SkillStatus => {
      const p = progress[id];
      if (p?.status === 'completed') return 'completed';
      if (cvIds.has(id) || covered.has(norm(name))) return 'existing';
      if (p?.status === 'in-progress') return 'in-progress';
      return 'planned';
    };
    const skillInfo = new Map(occ.requiredSkills.map((r) => [`skill:${r.skillId}`, { id: r.skillId, name: r.name, status: status(r.skillId, r.name) }]));
    const sdgName = (n: number) => sdgs.data!.find((s) => s.number === n)?.name ?? '';
    const careerSdgLinks = g.links.filter((l) => l.source.startsWith('career:') && l.target.startsWith('sdg:'));
    const skillSdgLinks = g.links.filter((l) => l.source.startsWith('skill:') && l.target.startsWith('sdg:'));
    const held = (src: string) => { const s = skillInfo.get(src); return s?.status === 'completed' || s?.status === 'existing'; };
    const careerSdgs = new Set(careerSdgLinks.map((l) => Number(l.target.slice(4))));
    const heldSdgs = new Set(skillSdgLinks.filter((l) => held(l.source)).map((l) => Number(l.target.slice(4))));
    const allowed = new Set([...careerSdgs, ...heldSdgs]);
    const links: MapLink[] = [];
    careerSdgLinks.forEach((l) => {
      const n = Number(l.target.slice(4));
      links.push({ key: `career-sdg-${n}`, kind: 'career-sdg', source: 'career', target: l.target, potential: false, heading: `${occ.title} to SDG ${n} ${sdgName(n)}`, sentence: `As a ${occ.title}, your work can support SDG ${n} (${sdgName(n)}): ${lcFirst(l.justification)}` });
    });
    const shownSkills = new Set<string>();
    skillSdgLinks.forEach((l) => {
      const n = Number(l.target.slice(4));
      const s = skillInfo.get(l.source);
      if (!s || !allowed.has(n)) return;
      const potential = !held(l.source);
      shownSkills.add(l.source);
      links.push({ key: `skill-sdg-${s.id}-${n}`, kind: 'skill-sdg', source: l.source, target: l.target, potential, heading: `${s.name} to SDG ${n} ${sdgName(n)}`, sentence: `${s.name} may contribute to SDG ${n} (${sdgName(n)}): ${lcFirst(l.justification)}${potential ? ' ' + POTENTIAL : ''}` });
    });
    const skills: MapSkill[] = [...shownSkills].map((k) => skillInfo.get(k)!).sort((a, b) => ['completed', 'existing', 'in-progress', 'planned'].indexOf(a.status) - ['completed', 'existing', 'in-progress', 'planned'].indexOf(b.status));
    skills.forEach((s) => {
      const potential = s.status === 'planned' || s.status === 'in-progress';
      links.push({ key: `career-skill-${s.id}`, kind: 'career-skill', source: 'career', target: `skill:${s.id}`, potential, heading: `${occ.title} to ${s.name}`, sentence: `${s.name} is a skill that ${occ.title} roles commonly need.${potential ? ' ' + POTENTIAL : ''}` });
    });
    const mapSdgs: MapSdg[] = [...allowed].sort((a, b) => a - b).map((n) => ({ number: n, name: sdgName(n), color: color(n) }));
    return { links, skills, mapSdgs, count: heldSdgs.size, allowed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, occ, sdgs.data, roadmap, existing, progress]);

  if (!profile) return <LockedPrompt title="Complete Understand Me first" body="Impact mapping connects your career and skills to the UN Sustainable Development Goals." href="/app/understand" cta="Go to Understand Me" />;

  const listGroups: { title: string; kinds: MapLink['kind'][] }[] = [
    { title: 'Career to SDGs', kinds: ['career-sdg'] },
    { title: 'Skills to SDGs', kinds: ['skill-sdg'] },
  ];
  const firstFor = new Map<number, string>();
  model?.links.filter((l) => l.kind !== 'career-skill').sort((a, b) => Number(b.kind === 'career-sdg') - Number(a.kind === 'career-sdg')).forEach((l) => { const n = Number(l.target.slice(4)); if (!firstFor.has(n)) firstFor.set(n, l.key); });

  return (
    <div>
      <PageHeader eyebrow="Impact / SDG Impact" title="Your SDG record" description="How your career and skills could connect to the Sustainable Development Goals. Hover, focus or tap a line to read why it connects." />
      {!targetId || (occs.data && !occ) ? (
        <section className="rounded-3xl border border-dashed bg-card p-8 text-center" data-testid="panel-impact-empty">
          <p className="font-display text-lg font-semibold">Choose a career to see your impact map</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">The map connects a career to the skills it needs and the SDGs they may support.</p>
          <Link href="/app/explore/market" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Open Career Market</Link>
        </section>
      ) : (
        <>
          {(m.isError || occs.isError) && <ErrorState onRetry={retry} />}
          {(m.isPending || occs.isLoading || sdgs.isLoading) && !m.isError && <Shimmer className="h-96" />}
          {model && occ && (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                <div className="rounded-3xl bg-navy px-7 py-5 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-sidebar-primary">Your skills may contribute to</p>
                  <p className="font-display text-5xl font-bold" data-testid="text-sdg-count">{model.count} <span className="text-2xl font-semibold">SDG{model.count === 1 ? '' : 's'}</span></p>
                </div>
                <p className="text-sm text-muted-foreground">Counted from skills you already have or have completed. Skills still planned or in progress are shown as "Potential after you complete this".</p>
              </div>

              <ImpactMap careerTitle={occ.title} skills={model.skills} sdgs={model.mapSdgs} links={model.links} active={active} onActive={setActive} />

              <div className="mt-4 min-h-[3.5rem] rounded-2xl border-l-4 border-teal bg-accent/40 p-4 text-sm" aria-live="polite" data-testid="text-justification">
                {active ? active.sentence : 'Hover, focus or tap a line on the map to read why it connects.'}
              </div>

              <section className="mt-8" data-testid="list-impact-explanations">
                <h2 className="text-xl font-bold">Why each link exists</h2>
                {listGroups.map((grp) => (
                  <div key={grp.title} className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{grp.title}</h3>
                    <ul className="space-y-2">
                      {model.links.filter((l) => grp.kinds.includes(l.kind)).map((l) => (
                        <li key={l.key} id={firstFor.get(Number(l.target.slice(4))) === l.key ? `why-sdg-${l.target.slice(4)}` : undefined} className="rounded-2xl border bg-card px-4 py-3 text-sm" data-testid={`explain-${l.key}`}>
                          <p className="text-xs font-semibold text-muted-foreground">{l.heading}{l.potential && <span className="ml-2 rounded-full bg-amber/15 px-2 py-0.5 text-[10px] text-[hsl(30_80%_30%)]">Potential after you complete this</span>}</p>
                          <p className="mt-0.5">{l.sentence}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <details className="mt-4 rounded-2xl border bg-card px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-semibold">Why these skills are on the map</summary>
                  <ul className="mt-2 space-y-1.5">{model.links.filter((l) => l.kind === 'career-skill').map((l) => <li key={l.key} data-testid={`explain-${l.key}`}>{l.sentence}</li>)}</ul>
                </details>
              </section>

              {source === 'cv' && (
                <section className="mt-10" data-testid="section-existing-skills">
                  <h2 className="text-xl font-bold">Existing skills</h2>
                  <p className="mb-4 text-sm text-muted-foreground">Skills from your uploaded CV profile and the SDGs they could connect to. Shown separately from your roadmap record.</p>
                  {existing.length === 0 ? <p className="text-sm text-muted-foreground">None of your CV skills matched the skill catalogue yet.</p> : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {existing.map((k) => {
                        const links = (ex.data?.links ?? []).filter((l) => l.source.includes(k.id) && l.level === 'skill');
                        const nums = links.map((l) => ex.data?.nodes.find((n) => n.id === l.target)?.sdgNumber).filter((n): n is number => typeof n === 'number');
                        return (
                          <li key={k.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3" title={links.map((l) => l.justification).join(' ')} data-testid={`row-existing-${k.id}`}>
                            <span className="flex-1 text-sm font-medium">{k.name}</span>
                            {ex.isPending ? <span className="text-xs text-muted-foreground">...</span> : nums.length ? nums.map((n) => <span key={n} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: color(n) }}>SDG {n}</span>) : <span className="text-xs text-muted-foreground">No direct SDG link</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}


              <SdgReference sdgs={sdgs.data ?? []} mapped={model.allowed} />
              <div className="mt-6 space-y-2"><Disclaimer>Potential contributions, not measured impact.</Disclaimer></div>
            </>
          )}
        </>
      )}
      <NextStep href="/app/understand" hint="Loop back" label="Refine your profile and recalculate" />
    </div>
  );
}
