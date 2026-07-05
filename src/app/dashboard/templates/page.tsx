'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import LoadingDots from '@/components/LoadingDots'
import toast from 'react-hot-toast'

interface Template { id: string; title: string; body: string; org_id: string | null; owner_id: string; updated_at: string }

export default function TemplatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [list, setList] = useState<Template[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [isTeam, setIsTeam] = useState(false)
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: prof } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
    setIsTeam(prof?.subscription_status === 'team')
    const res = await fetch('/api/templates')
    if (res.status === 403) { setLocked(true); setLoading(false); return }
    if (res.ok) { const d = await res.json(); setList(d.templates); setMyId(d.myId) }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditing('new'); setTitle(''); setBody(''); setShared(false) }
  const openEdit = (t: Template) => { setEditing(t); setTitle(t.title); setBody(t.body); setShared(!!t.org_id) }
  const close = () => setEditing(null)

  const save = async () => {
    if (!title.trim()) { toast.error('Add a title'); return }
    setSaving(true)
    try {
      if (editing === 'new') {
        const res = await fetch('/api/templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body, shared }),
        })
        if (!res.ok) throw new Error()
      } else if (editing) {
        const res = await fetch('/api/templates', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, title, body }),
        })
        if (!res.ok) throw new Error()
      }
      toast.success('Saved')
      close(); load()
    } catch { toast.error('Could not save') }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    const res = await fetch('/api/templates', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success('Deleted'); load() } else toast.error('Could not delete')
  }

  const copy = (t: Template) => {
    navigator.clipboard?.writeText(t.body).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Copy failed'))
  }

  const relTime = (iso: string) => {
    const days = (Date.now() - new Date(iso).getTime()) / 86400000
    if (days < 1) return 'today'
    if (days < 2) return 'yesterday'
    if (days < 30) return `${Math.floor(days)}d ago`
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 14 }}>Loading&hellip;</span>
    </div>
  )

  if (locked) return (
    <div className="empty">
      <div className="empty-icon"><i className="ti ti-template" /></div>
      <h3>Templates are a Pro feature</h3>
      <p>Save your best pitches and reuse them in seconds. Upgrade to Pro to unlock templates.</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard/billing')}>
        <i className="ti ti-sparkles" /> See plans
      </button>
    </div>
  )

  return (
    <>
      <div className="tm-header">
        <div>
          <p className="tm-sub">Save your best pitches and reuse them when you apply.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>New template</button>
      </div>

      {list.length === 0 ? (
        <div className="tpl-empty">
          <i className="ti ti-template" />
          <p>No templates yet. Create your first reusable pitch.</p>
          <button className="btn btn-primary" onClick={openNew}>New template</button>
        </div>
      ) : (
        <div className="tpl-grid">
          {list.map(t => {
            const mine = t.owner_id === myId
            return (
              <div key={t.id} className="tpl-card">
                <div className="tpl-card-head">
                  <span className="tpl-card-title">{t.title}</span>
                  {t.org_id && <span className="tpl-shared"><i className="ti ti-users" /> Team</span>}
                </div>
                <p className="tpl-card-body">{t.body || <span style={{ color: 'var(--slate-2)' }}>Empty</span>}</p>
                <div className="tpl-card-foot">
                  <span className="tpl-card-meta">Updated {relTime(t.updated_at)}</span>
                  <div className="tpl-card-actions">
                    <button className="pill" onClick={() => copy(t)}><i className="ti ti-copy" /> Copy</button>
                    {mine && <button className="pill tpl-secondary" onClick={() => openEdit(t)}><i className="ti ti-pencil" /> Edit</button>}
                    {mine && <button className="pill tm-remove tpl-secondary tip" data-tip="Delete template" aria-label="Delete template" onClick={() => remove(t.id)}><i className="ti ti-trash" /></button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <div className="tpl-modal-bg" onClick={e => { if (e.target === e.currentTarget) close() }}>
          <div className="tpl-modal">
            <h3 className="tm-card-title">{editing === 'new' ? 'New template' : 'Edit template'}</h3>
            <label className="tpl-label">Title</label>
            <input className="auth-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Cold pitch — web dev" />
            <label className="tpl-label">Pitch body</label>
            <textarea className="tpl-textarea" value={body} onChange={e => setBody(e.target.value)} rows={8}
              placeholder="Hi {name}, I saw your post about… Here's how I'd approach it…" />
            {editing === 'new' && isTeam && (
              <label className="tpl-share-row">
                <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
                Share with my team
              </label>
            )}
            <div className="tpl-modal-actions">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <LoadingDots label="Saving" /> : 'Save template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
