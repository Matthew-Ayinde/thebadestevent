'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDown, ArrowUp, Edit2, ExternalLink, Eye, EyeOff, Inbox, Lock, Plus, Trash2, X,
} from 'lucide-react';
import AdminButton from '@/components/admin/AdminButton';
import AdminInput from '@/components/admin/AdminInput';
import AdminSelect from '@/components/admin/AdminSelect';
import AdminTextarea from '@/components/admin/AdminTextarea';
import AdminModal from '@/components/admin/AdminModal';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import {
  DEFAULT_APPLICATION_FIELDS,
  EMPLOYMENT_TYPES,
  FIELD_MODES,
  JobPostingInputSchema,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  STANDARD_FIELDS,
  WORKPLACE_TYPES,
  formatClosingDate,
  isAcceptingApplications,
  type FieldMode,
  type JobQuestion,
  type JobStatus,
  type StandardFieldKey,
} from '@/lib/careers';

type Draft = {
  title: string;
  company: string;
  department: string;
  location: string;
  workplace: (typeof WORKPLACE_TYPES)[number];
  type: (typeof EMPLOYMENT_TYPES)[number];
  compensation: string;
  closingDate: string;
  status: JobStatus;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  applicationFields: Record<StandardFieldKey, FieldMode>;
  questions: JobQuestion[];
};

const EMPTY_DRAFT: Draft = {
  title: '',
  company: '',
  department: '',
  location: 'Lagos, Nigeria',
  workplace: 'On-site',
  type: 'Full-time',
  compensation: '',
  closingDate: '',
  status: 'open',
  overview: '',
  responsibilities: [],
  requirements: [],
  niceToHave: [],
  applicationFields: { ...DEFAULT_APPLICATION_FIELDS },
  questions: [],
};

function fromJob(job: any): Draft {
  return {
    title: job.title ?? '',
    company: job.company ?? '',
    department: job.department ?? '',
    location: job.location ?? '',
    workplace: (WORKPLACE_TYPES as readonly string[]).includes(job.workplace) ? job.workplace : 'On-site',
    type: (EMPLOYMENT_TYPES as readonly string[]).includes(job.type) ? job.type : 'Full-time',
    compensation: job.compensation ?? '',
    closingDate: job.closingDate ? String(job.closingDate).slice(0, 10) : '',
    status: job.status ?? 'open',
    overview: job.overview ?? '',
    responsibilities: job.responsibilities ?? [],
    requirements: job.requirements ?? [],
    niceToHave: job.niceToHave ?? [],
    applicationFields: { ...DEFAULT_APPLICATION_FIELDS, ...(job.applicationFields ?? {}) },
    questions: (job.questions ?? []).map((q: any) => ({ ...q, options: q.options ?? [] })),
  };
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

const STATUS_META: Record<JobStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-teal-300/12 text-teal-200 border-teal-300/30' },
  draft: { label: 'Draft', cls: 'bg-white/8 text-white/55 border-white/12' },
  closed: { label: 'Closed', cls: 'bg-red-400/12 text-red-300 border-red-400/25' },
};

function StatusBadge({ job }: { job: any }) {
  const expired = job.status === 'open' && !isAcceptingApplications(job);
  const meta = expired
    ? { label: 'Past closing date', cls: 'bg-amber-300/10 text-amber-200 border-amber-300/25' }
    : STATUS_META[job.status as JobStatus] ?? STATUS_META.draft;
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${meta.cls}`}>{meta.label}</span>;
}

export default function JobPostingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editor, setEditor] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/job-postings?scope=admin');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load job postings');
    } finally {
      setIsLoading(false);
    }
  }

  async function save() {
    if (!editor) return;
    const parsed = JobPostingInputSchema.safeParse(editor.draft);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    try {
      setIsSaving(true);
      const res = await fetch(editor.id ? `/api/job-postings/${editor.id}` : '/api/job-postings', {
        method: editor.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editor.draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save job posting');
      }
      toast.success(editor.id ? 'Role updated' : editor.draft.status === 'open' ? 'Role published' : 'Role saved');
      setEditor(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  async function setStatus(job: any, status: JobStatus) {
    try {
      const res = await fetch(`/api/job-postings/${job._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(status === 'open' ? 'Role is now live on /careers' : status === 'closed' ? 'Role closed to applications' : 'Role moved to drafts');
      await fetchItems();
    } catch {
      toast.error('Failed to update status');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/job-postings/${deleteTarget._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Role deleted');
      setDeleteTarget(null);
      await fetchItems();
    } catch {
      toast.error('Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl text-white/90">Job Postings</h1>
          <p className="text-white/50 mt-1 md:mt-2 text-sm md:text-base">
            Roles published here appear on{' '}
            <a href="/careers" target="_blank" rel="noopener noreferrer" className="text-teal-300/80 hover:text-teal-200">/careers</a>
          </p>
        </div>
        <AdminButton onClick={() => setEditor({ id: null, draft: structuredClone(EMPTY_DRAFT) })} variant="primary">
          <Plus size={18} className="inline mr-2" />
          New Role
        </AdminButton>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-[1.8rem]">
          <p className="text-white/40 text-sm">No roles yet. Create one to start receiving applications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(job => {
            const closes = formatClosingDate(job.closingDate);
            const live = isAcceptingApplications(job);
            return (
              <div key={job._id} className="bg-white/5 border border-white/10 rounded-[1.4rem] p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-white/90 font-semibold text-base md:text-lg">{job.title}</h3>
                      <StatusBadge job={job} />
                    </div>
                    <p className="text-white/55 text-xs md:text-sm mt-1.5">
                      {[job.company, job.department, job.location, job.workplace, job.type].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <Link
                        href={`/admin/applications?job=${job._id}`}
                        className="inline-flex items-center gap-1.5 text-teal-300/85 hover:text-teal-200"
                      >
                        <Inbox size={13} />
                        {job.applicationCount} application{job.applicationCount === 1 ? '' : 's'}
                        {job.newApplicationCount > 0 && (
                          <span className="rounded-full bg-teal-300 px-1.5 py-px text-[0.65rem] font-semibold text-slate-950">
                            {job.newApplicationCount} new
                          </span>
                        )}
                      </Link>
                      {closes && <span className="text-white/40">Closes {closes}</span>}
                      <span className="text-white/30">{job.questions?.length ?? 0} custom question{job.questions?.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 md:flex-nowrap">
                    {live && (
                      <a
                        href={`/careers/${job.slug}`} target="_blank" rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition" aria-label="View live role" title="View live"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {job.status === 'open' ? (
                      <button
                        onClick={() => setStatus(job, 'closed')}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition"
                      >
                        <EyeOff size={14} /> Close
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(job, 'open')}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-teal-300 hover:bg-teal-300/15 transition"
                      >
                        <Eye size={14} /> {job.status === 'draft' ? 'Publish' : 'Reopen'}
                      </button>
                    )}
                    <button
                      onClick={() => setEditor({ id: job._id, draft: fromJob(job) })}
                      className="p-2 hover:bg-teal-300/20 text-teal-300 rounded-lg transition" aria-label="Edit role"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(job)}
                      className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition" aria-label="Delete role"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminModal
        isOpen={!!editor}
        onClose={() => !isSaving && setEditor(null)}
        title={editor?.id ? 'Edit Role' : 'New Role'}
        size="xl"
      >
        {editor && (
          <RoleEditor
            draft={editor.draft}
            onChange={draft => setEditor(e => (e ? { ...e, draft } : e))}
            onCancel={() => setEditor(null)}
            onSave={save}
            isSaving={isSaving}
            isNew={!editor.id}
          />
        )}
      </AdminModal>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Role"
        message={
          deleteTarget?.applicationCount
            ? `This permanently removes the role. Its ${deleteTarget.applicationCount} application(s) stay in Applications. To stop new applications but keep the role, close it instead.`
            : 'This permanently removes the role. To stop new applications but keep the role, close it instead.'
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────────

function RoleEditor({
  draft, onChange, onCancel, onSave, isSaving, isNew,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  isNew: boolean;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...draft, [key]: value });

  function updateQuestion(id: string, patch: Partial<JobQuestion>) {
    set('questions', draft.questions.map(q => (q.id === id ? { ...q, ...patch } : q)));
  }
  function moveQuestion(index: number, dir: -1 | 1) {
    const next = [...draft.questions];
    const [q] = next.splice(index, 1);
    next.splice(index + dir, 0, q);
    set('questions', next);
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(); }} className="space-y-8">
      {/* Status */}
      <Segmented
        label="Visibility"
        value={draft.status}
        onChange={v => set('status', v as JobStatus)}
        options={[
          { value: 'open', label: 'Open — live on /careers' },
          { value: 'draft', label: 'Draft' },
          { value: 'closed', label: 'Closed' },
        ]}
      />

      <EditorSection title="The role">
        <AdminInput label="Job title" id="role-title" value={draft.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Guest Experience Lead" />
        <AdminInput label="Hiring company" id="role-company" value={draft.company} onChange={e => set('company', e.target.value)} required placeholder="The partner agency or company this role is for" />
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="Department" id="role-department" value={draft.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Experiences" />
          <AdminInput label="Location" id="role-location" value={draft.location} onChange={e => set('location', e.target.value)} required placeholder="e.g. Lagos, Nigeria" />
          <AdminSelect
            label="Workplace" id="role-workplace" value={draft.workplace} required
            onChange={e => set('workplace', e.target.value as Draft['workplace'])}
            options={WORKPLACE_TYPES.map(v => ({ value: v, label: v }))}
          />
          <AdminSelect
            label="Employment type" id="role-type" value={draft.type} required
            onChange={e => set('type', e.target.value as Draft['type'])}
            options={EMPLOYMENT_TYPES.map(v => ({ value: v, label: v }))}
          />
          <AdminInput label="Compensation" id="role-compensation" value={draft.compensation} onChange={e => set('compensation', e.target.value)} placeholder="Optional, e.g. ₦450k – ₦600k / month" />
          <AdminInput label="Closing date" id="role-closingDate" type="date" value={draft.closingDate} onChange={e => set('closingDate', e.target.value)} className="[color-scheme:dark]" />
        </div>
      </EditorSection>

      <EditorSection title="Description">
        <AdminTextarea
          label="Overview" required rows={6} value={draft.overview}
          onChange={e => set('overview', e.target.value)} maxLength={5000} charCount={draft.overview.length}
          placeholder="What is this role, why does it matter, and what will success look like?"
        />
        <ListEditor label="What you'll do" required items={draft.responsibilities} onChange={v => set('responsibilities', v)} placeholder="Add a responsibility" />
        <ListEditor label="Who you are" required items={draft.requirements} onChange={v => set('requirements', v)} placeholder="Add a requirement" />
        <ListEditor label="Nice to have" items={draft.niceToHave} onChange={v => set('niceToHave', v)} placeholder="Add a bonus skill or trait" />
      </EditorSection>

      <EditorSection
        title="Application form"
        hint="Choose what applicants are asked for. Name, email and phone are always collected."
      >
        <div className="divide-y divide-white/8 rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-white/70">Name, email &amp; phone</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/40"><Lock size={12} /> Always required</span>
          </div>
          {STANDARD_FIELDS.map(field => (
            <div key={field.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-white/80">{field.label}</span>
              <ModeToggle
                value={draft.applicationFields[field.key]}
                onChange={mode => set('applicationFields', { ...draft.applicationFields, [field.key]: mode })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-white/50 font-medium">Custom questions</p>
          {draft.questions.length === 0 && (
            <p className="text-sm text-white/40">
              Ask role-specific questions — e.g. notice period, salary expectations, or “Describe an event you’re proud of”.
            </p>
          )}
          {draft.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-white/10 bg-[#041114]/50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 text-xs tabular-nums text-teal-300/60">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <AdminInput
                    aria-label={`Question ${i + 1}`} value={q.label} placeholder="Your question"
                    onChange={e => updateQuestion(q.id, { label: e.target.value })}
                  />
                </div>
                <div className="flex shrink-0 items-center">
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => moveQuestion(i, -1)}><ArrowUp size={14} /></IconBtn>
                  <IconBtn label="Move down" disabled={i === draft.questions.length - 1} onClick={() => moveQuestion(i, 1)}><ArrowDown size={14} /></IconBtn>
                  <IconBtn label="Remove question" danger onClick={() => set('questions', draft.questions.filter(x => x.id !== q.id))}><Trash2 size={14} /></IconBtn>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pl-6">
                <select
                  aria-label="Answer type" value={q.type}
                  onChange={e => updateQuestion(q.id, { type: e.target.value as JobQuestion['type'] })}
                  className="rounded-lg border border-white/10 bg-[#041114]/80 px-3 py-2 text-sm text-white/85 focus:border-teal-300/50 focus:outline-none"
                >
                  {QUESTION_TYPES.map(t => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                    className="h-4 w-4 accent-teal-300"
                  />
                  Required
                </label>
              </div>
              {q.type === 'select' && (
                <div className="pl-6">
                  <ListEditor
                    label="Options" compact items={q.options} placeholder="Add an option"
                    onChange={options => updateQuestion(q.id, { options })}
                  />
                </div>
              )}
            </div>
          ))}
          {draft.questions.length < 15 && (
            <button
              type="button"
              onClick={() => set('questions', [...draft.questions, { id: newId(), label: '', type: 'short', required: false, options: [] }])}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-teal-300/90 transition hover:border-teal-300/40 hover:bg-teal-300/5"
            >
              <Plus size={15} /> Add question
            </button>
          )}
        </div>
      </EditorSection>

      <div className="flex gap-4 pt-4 border-t border-white/10">
        <AdminButton type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</AdminButton>
        <AdminButton type="submit" variant="primary" className="flex-1" disabled={isSaving}>
          {isSaving ? 'Saving…' : isNew ? (draft.status === 'open' ? 'Publish role' : 'Save role') : 'Save changes'}
        </AdminButton>
      </div>
    </form>
  );
}

function EditorSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-teal-300/70">{title}</p>
        {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Segmented({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.26em] text-white/50 font-medium">{label}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button
            key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              value === o.value
                ? 'border-teal-300/60 bg-teal-300/14 text-teal-200'
                : 'border-white/10 bg-white/4 text-white/55 hover:border-white/20 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const MODE_LABELS: Record<FieldMode, string> = { required: 'Required', optional: 'Optional', off: 'Off' };

function ModeToggle({ value, onChange }: { value: FieldMode; onChange: (m: FieldMode) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-[#041114]/60 p-0.5" role="radiogroup">
      {FIELD_MODES.map(mode => (
        <button
          key={mode} type="button" role="radio" aria-checked={value === mode} onClick={() => onChange(mode)}
          className={`rounded-full px-3 py-1 text-xs transition ${
            value === mode
              ? mode === 'off' ? 'bg-white/12 text-white/80' : 'bg-teal-300/20 text-teal-100'
              : 'text-white/45 hover:text-white/80'
          }`}
        >
          {MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: {
  children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`rounded-lg p-2 transition disabled:opacity-25 disabled:pointer-events-none ${
        danger ? 'text-red-400 hover:bg-red-600/20' : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// Editable bullet list. Pasting several lines adds each line as its own item.
function ListEditor({ label, items, onChange, placeholder, required, compact }: {
  label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string; required?: boolean; compact?: boolean;
}) {
  const [input, setInput] = useState('');

  function add(raw = input) {
    const lines = raw.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim()).filter(Boolean);
    if (!lines.length) return;
    onChange([...items, ...lines]);
    setInput('');
  }

  return (
    <div>
      <p className={`mb-2 text-xs uppercase tracking-[0.26em] font-medium ${compact ? 'text-white/40' : 'text-white/50'}`}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
            <input
              value={item}
              onChange={e => onChange(items.map((x, i) => (i === idx ? e.target.value : x)))}
              aria-label={`${label} ${idx + 1}`}
              className="flex-1 min-w-0 bg-transparent py-0.5 text-sm text-white/85 focus:outline-none"
            />
            <button
              type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} aria-label="Remove"
              className="shrink-0 rounded p-1 text-white/35 hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text" value={input} placeholder={`${placeholder} and press Enter`}
            onChange={e => setInput(e.target.value)}
            onBlur={() => add()}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            onPaste={e => {
              const text = e.clipboardData.getData('text');
              if (/\r?\n/.test(text.trim())) { e.preventDefault(); add(text); }
            }}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-sm placeholder-white/30 focus:outline-none focus:border-teal-300/50"
          />
          <button
            type="button" onClick={() => add()}
            className="shrink-0 px-3 py-2 bg-teal-300/20 text-teal-300 rounded-lg text-sm hover:bg-teal-300/30 transition"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
