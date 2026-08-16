import { X } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'

export function Modal({ title, description, children, submitLabel = 'Save', error, busy, onClose, onSubmit }: { title: string; description: string; children: ReactNode; submitLabel?: string; error?: string; busy?: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="entity-modal-title"><button className="modal-close" type="button" onClick={onClose} aria-label="Close"><X /></button><span className="eyebrow">Secure tenant workflow</span><h2 id="entity-modal-title">{title}</h2><p>{description}</p><form onSubmit={onSubmit}>{children}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div></form></div></div>
}

export function FormField({ label, children }: { label: string; children: ReactNode }) { return <label>{label}{children}</label> }
