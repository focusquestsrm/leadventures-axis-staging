import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, ShieldCheck } from 'lucide-react'
import { PageHeader } from './components/Shell'

type ReadinessStatus = 'Certified in code' | 'Staging evidence required' | 'Production setup required'

const categories: { name: string; status: ReadinessStatus; owner: string; action: string; note: string }[] = [
  { name: 'Security', status: 'Staging evidence required', owner: 'Security owner', action: 'Run the complete live RLS suite and independent review.', note: 'RLS, RBAC, safe diagnostics, and tenant guards are implemented.' },
  { name: 'Tenant Isolation', status: 'Staging evidence required', owner: 'Platform engineering', action: 'Capture two-tenant live certification evidence.', note: 'Synthetic transactional suites cover releases 1 through 8.' },
  { name: 'RBAC', status: 'Certified in code', owner: 'Product security', action: 'Repeat role matrix during launch smoke testing.', note: 'Central grants and database policies constrain every supported role.' },
  { name: 'PII / Privacy', status: 'Production setup required', owner: 'Privacy owner', action: 'Approve retention, export, deletion, and request procedures.', note: 'PII is isolated; operational metadata is identity-free.' },
  { name: 'Compliance Foundation', status: 'Production setup required', owner: 'Legal and product', action: 'Approve tenant, geography, contact, and industry requirements.', note: 'The product provides configurable controls and makes no legal claims.' },
  { name: 'Integrations', status: 'Production setup required', owner: 'Integration engineering', action: 'Provision server-side credentials and certify each live adapter.', note: 'Browser records contain metadata and references only.' },
  { name: 'Automation Safety', status: 'Staging evidence required', owner: 'Operations', action: 'Run mode, kill-switch, circuit-breaker, and rollback drills.', note: 'New tenants default to advisory and simulated execution.' },
  { name: 'Monitoring', status: 'Production setup required', owner: 'SRE', action: 'Connect error tracking, alert routing, and synthetic checks.', note: 'Safe diagnostic contracts exist; no provider is configured in source.' },
  { name: 'Backups', status: 'Production setup required', owner: 'Database owner', action: 'Set RPO/RTO, enable backups, and complete a restore drill.', note: 'Procedures are documented; infrastructure validation is external.' },
  { name: 'Performance', status: 'Staging evidence required', owner: 'Engineering', action: 'Run representative-volume load and browser profiling.', note: 'Core operational queries are bounded; high-volume acquisition needs measured evidence.' },
  { name: 'Documentation', status: 'Certified in code', owner: 'Product operations', action: 'Assign named owners and review on every launch.', note: 'Architecture, onboarding, support, operations, and launch documentation are indexed.' },
  { name: 'Production Checklist', status: 'Production setup required', owner: 'Launch owner', action: 'Complete every checklist item in a separately authorized release.', note: 'No production provisioning is performed by this staging release.' },
]

const iconFor = (status: ReadinessStatus) => status === 'Certified in code' ? CheckCircle2 : status === 'Staging evidence required' ? ClipboardCheck : AlertTriangle

export function CommercialReadinessPage() {
  const certified = categories.filter((item) => item.status === 'Certified in code').length
  const staging = categories.filter((item) => item.status === 'Staging evidence required').length
  const production = categories.filter((item) => item.status === 'Production setup required').length
  return <>
    <PageHeader eyebrow="Internal administration" title="Commercial Readiness" description="Staging certification evidence and controlled-production prerequisites. This page is not a production approval." action={<a className="secondary-button" href="https://github.com/focusquestsrm/leadventures-axis-staging/blob/main/docs/production-launch-checklist.md" target="_blank" rel="noreferrer"><ExternalLink size={16}/> Launch checklist</a>} />
    <div className="readiness-summary"><article><CheckCircle2/><span>Certified in code</span><strong>{certified}</strong></article><article><ClipboardCheck/><span>Staging evidence</span><strong>{staging}</strong></article><article><AlertTriangle/><span>Production setup</span><strong>{production}</strong></article></div>
    <div className="info-banner"><ShieldCheck size={18}/><div><strong>Controlled readiness gate</strong><span>Production remains a separate, explicitly authorized release. No category below represents legal approval or production deployment.</span></div></div>
    <section className="panel table-panel readiness-table"><div className="table-scroll"><table><thead><tr><th>Category</th><th>Status</th><th>Owner</th><th>Required action</th><th>Evidence note</th></tr></thead><tbody>{categories.map((item) => { const Icon = iconFor(item.status); return <tr key={item.name}><td><strong>{item.name}</strong></td><td><span className={`readiness-status readiness-${item.status.split(' ')[0].toLowerCase()}`}><Icon size={14}/>{item.status}</span></td><td>{item.owner}</td><td>{item.action}</td><td>{item.note}</td></tr> })}</tbody></table></div></section>
  </>
}
