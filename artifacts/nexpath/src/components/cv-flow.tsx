      <PrivacyNote />

      <section className="rounded-3xl border bg-card p-4 md:p-6">
        <h3 className="mb-3 px-3 font-semibold">Personal details</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Name" found={fc('name')} missing={miss('name')}><Input value={p.name ?? ''} onChange={(e) => set('name', e.target.value)} data-testid="input-review-name" /></Field>
          <Field label="Email" found={fc('email')} missing={miss('email')}><Input value={p.email ?? ''} onChange={(e) => set('email', e.target.value)} data-testid="input-review-email" /></Field>
          <Field label="Phone" found={fc('phone')} missing={miss('phone')}><Input value={p.phone ?? ''} onChange={(e) => set('phone', e.target.value)} data-testid="input-review-phone" /></Field>
          <Field label="Location" found={fc('location')} missing={miss('location')}><Input value={p.location ?? ''} onChange={(e) => set('location', e.target.value)} data-testid="input-review-location" /></Field>
          <div className="md:col-span-2"><Field label="Links (LinkedIn, GitHub, portfolio)" found={fc('links')} missing={miss('links')}><ListEditor value={p.links ?? []} onChange={(v) => set('links', v)} placeholder="Add a link" testid="links" /></Field></div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 md:p-6">
        <h3 className="mb-3 px-3 font-semibold">Education and status</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Education level" required found={fc('educationLevel')} missing={miss('educationLevel')}>
            <Select value={p.educationLevel} onValueChange={(v) => set('educationLevel', v)}>
              <SelectTrigger data-testid="select-review-education"><SelectValue placeholder="Choose level" /></SelectTrigger>
              <SelectContent>{Array.from(new Set([...EDUCATION_LEVELS, ...(p.educationLevel ? [p.educationLevel] : [])])).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Major / field" required found={fc('major')} missing={miss('major')}><Input value={p.major} onChange={(e) => set('major', e.target.value)} data-testid="input-review-major" /></Field>
          <Field label="Institution" found={fc('institution')} missing={miss('institution')}><Input value={p.institution ?? ''} onChange={(e) => set('institution', e.target.value)} data-testid="input-review-institution" /></Field>
          <Field label="Graduation" found={fc('graduation')} missing={miss('graduation')}><Input value={p.graduation ?? ''} onChange={(e) => set('graduation', e.target.value)} placeholder="e.g. 2025" data-testid="input-review-graduation" /></Field>
          <div className="md:col-span-2">
            <Field label="Current status" required found={fc('status')} missing={miss('status')}>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {STATUSES.map((s) => (
                  <button key={s.value} onClick={() => set('status', s.value)} data-testid={`button-review-status-${s.value.replace(' ', '-')}`}
                    className={cn('rounded-xl border px-3 py-2.5 text-sm transition', p.status === s.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40')}>{s.label}</button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </section>

      {(p.education ?? []).length > 0 && (
        <section className="rounded-3xl border bg-card p-4 md:p-6">
          <Field label="Education entries" found={fc('education')} missing={false}>
            <div className="space-y-3">
              {(p.education ?? []).map((ed, i) => {
                const setEd = (patch: Partial<EducationEntry>) => set('education', (p.education ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="space-y-2 rounded-2xl border bg-background/60 p-4" data-testid={`card-review-edu-${i}`}>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={ed.current} onChange={(ev) => setEd({ current: ev.target.checked })} /> Current</label>
                      <button onClick={() => set('education', (p.education ?? []).filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-review-remove-edu-${i}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input value={ed.institution} onChange={(ev) => setEd({ institution: ev.target.value })} placeholder="Institution" data-testid={`input-review-edu-inst-${i}`} />
                      <Input value={ed.qualification} onChange={(ev) => setEd({ qualification: ev.target.value })} placeholder="Qualification" data-testid={`input-review-edu-qual-${i}`} />
                      <Input value={ed.field} onChange={(ev) => setEd({ field: ev.target.value })} placeholder="Field of study" data-testid={`input-review-edu-field-${i}`} />
                      <Input value={ed.specialisation} onChange={(ev) => setEd({ specialisation: ev.target.value })} placeholder="Specialisation" data-testid={`input-review-edu-spec-${i}`} />
                      <Input value={ed.results} onChange={(ev) => setEd({ results: ev.target.value })} placeholder="Results (CGPA, grades)" data-testid={`input-review-edu-results-${i}`} />
                      <Input value={ed.dates} onChange={(ev) => setEd({ dates: ev.target.value })} placeholder="Dates" data-testid={`input-review-edu-dates-${i}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Field>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-4 md:p-6">
        <Field label="Experience, internships and projects" found={fc('experiences')} missing={miss('experiences')}>
          <div className="space-y-3">
            {exps.map((e, i) => (
              <div key={i} className="space-y-2 rounded-2xl border bg-background/60 p-4" data-testid={`card-review-exp-${i}`}>
                <div className="flex items-center gap-2">
                  {(['work', 'internship', 'project', 'volunteer'] as const).map((k) => (
                    <button key={k} onClick={() => setExp(i, { kind: k })} className={cn('rounded-full px-3 py-1 text-xs capitalize', (e.kind ?? 'work') === k ? 'bg-primary text-primary-foreground' : 'bg-secondary')} data-testid={`button-review-kind-${i}-${k}`}>{k}</button>
                  ))}
                  <button onClick={() => set('experiences', exps.filter((_, j) => j !== i))} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-review-remove-exp-${i}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <Input value={e.title} onChange={(ev) => setExp(i, { title: ev.target.value })} placeholder="Title" data-testid={`input-review-exp-title-${i}`} />
                  <Input value={e.org} onChange={(ev) => setExp(i, { org: ev.target.value })} placeholder="Organisation" data-testid={`input-review-exp-org-${i}`} />
                  <Input value={e.role ?? ''} onChange={(ev) => setExp(i, { role: ev.target.value })} placeholder="Award or role" data-testid={`input-review-exp-role-${i}`} />
                  <Input value={e.dates ?? ''} onChange={(ev) => setExp(i, { dates: ev.target.value })} placeholder="Dates" data-testid={`input-review-exp-dates-${i}`} />
                </div>
                <Textarea rows={3} value={e.description} onChange={(ev) => setExp(i, { description: ev.target.value })} placeholder="Description" data-testid={`input-review-exp-desc-${i}`} />
              </div>
            ))}
            <button onClick={() => set('experiences', [...exps, { title: '', org: '', description: '', dates: '', kind: 'work' }])} className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-secondary" data-testid="button-review-add-exp"><Plus className="h-4 w-4" /> Add entry</button>
          </div>
        </Field>
      </section>

      <section className="grid gap-2 rounded-3xl border bg-card p-4 md:grid-cols-2 md:p-6">
        <Field label="Technical skills" found={fc('technicalSkills')} missing={miss('technicalSkills')}><ListEditor value={p.technicalSkills} onChange={(v) => set('technicalSkills', v)} placeholder="Add a skill" testid="review-tech" /></Field>
        <Field label="Human / transferable skills" found={fc('humanSkills')} missing={miss('humanSkills')}><ListEditor value={p.humanSkills} onChange={(v) => set('humanSkills', v)} placeholder="Add a skill" testid="review-human" /></Field>
        <div className="md:col-span-2"><Field label="Languages" found={fc('languages')} missing={false}><ListEditor value={p.languages ?? []} onChange={(v) => set('languages', v)} placeholder="e.g. English (Fluent)" testid="review-languages" /></Field></div>
        <div className="md:col-span-2"><Field label="Certifications" found={fc('certifications')} missing={miss('certifications')}><ListEditor value={p.certifications ?? []} onChange={(v) => set('certifications', v)} placeholder="Add a certification" testid="review-certs" /></Field></div>
        <div className="md:col-span-2"><Field label="Describe what you can do, in your own words" found={fc('selfDescription')} missing={miss('selfDescription')}><Textarea rows={4} value={p.selfDescription ?? ''} onChange={(e) => set('selfDescription', e.target.value)} data-testid="input-review-self" /></Field></div>
        <Field label="Career interests (optional)" found={false} missing={miss('interests')}><Input value={p.interests ?? ''} onChange={(e) => set('interests', e.target.value)} placeholder="e.g. AI, fintech" data-testid="input-review-interests" /></Field>
        <Field label="Goals (optional)" found={fc('goals')} missing={miss('goals')}><Input value={p.goals ?? ''} onChange={(e) => set('goals', e.target.value)} placeholder="Where do you want to be in 1-2 years?" data-testid="input-review-goals" /></Field>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-3xl border bg-card/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">{valid ? <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-teal" /> Ready. Nothing is used until you confirm.</span> : 'Education level, major, status and at least one skill are required.'}</p>
        <button onClick={onCancel} className="rounded-full border px-4 py-2 text-sm hover:bg-secondary" data-testid="button-review-cancel">Cancel</button>
        <button disabled={!valid} onClick={() => onConfirm(p)} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40" data-testid="button-review-confirm"><PenLine className="h-4 w-4" /> Confirm and generate summary</button>
      </div>
    </div>
  );
}
