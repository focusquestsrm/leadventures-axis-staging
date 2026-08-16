import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, Bell, Building2, ChevronDown, CircleDollarSign, Gauge, GitBranch, LayoutDashboard, Menu, Plug, RotateCcw, Search, Settings, ShieldCheck, Sparkles, Target, Users, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { roleLabel } from '../lib/rbac'
import { demoMode, supabase } from '../lib/supabase'

const primaryNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/acquire', label: 'Acquire', icon: Target },
  { to: '/convert', label: 'Convert', icon: Sparkles },
  { to: '/route', label: 'Route', icon: GitBranch },
  { to: '/recover', label: 'Recover', icon: RotateCcw },
  { to: '/optimize', label: 'Optimize', icon: Gauge },
]
const recordsNav = [
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/buyers-offers', label: 'Buyers & Offers', icon: CircleDollarSign },
  { to: '/integrations', label: 'Integrations', icon: Plug },
]
const intelligenceNav = [
  { to: '/intelligence/buyers', label: 'Buyer Intelligence', icon: Users },
  { to: '/intelligence/programs', label: 'Program Intelligence', icon: BarChart3 },
  { to: '/intelligence/rejections', label: 'Rejection Intelligence', icon: Activity },
]

export function Shell({ children }: { children: ReactNode }) {
  const { data, tenant, role, setTenantId, allowed } = useApp()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const authorizedTenants = data.user.isPlatformAdmin ? data.tenants : data.tenants.filter((item) => data.memberships.some((m) => m.tenantId === item.id && m.userId === data.user.id && m.status === 'active'))

  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark" aria-hidden="true">LV</div><div className="brand-copy"><strong>Lead Ventures</strong><span>AXIS</span><small>Intelligence for Lead-Driven Growth</small></div><button className="mobile-close" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="tenant-switcher">
        <label htmlFor="tenant">Workspace</label>
        <div className="select-wrap"><Building2 size={17} /><select id="tenant" value={tenant.id} onChange={(event) => { setTenantId(event.target.value); setOpen(false) }}>{authorizedTenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></div>
      </div>
      <nav aria-label="Main navigation">
        <span className="nav-heading">Workspace</span>
        {primaryNav.map((item) => <NavItem {...item} key={item.to} onClick={() => setOpen(false)} />)}
        <span className="nav-heading">Registries</span>
        {recordsNav.map((item) => <NavItem {...item} key={item.to} onClick={() => setOpen(false)} />)}
        <span className="nav-heading">Intelligence</span>
        {intelligenceNav.map((item) => <NavItem {...item} key={item.to} onClick={() => setOpen(false)} />)}
        {(allowed('tenant:manage') || allowed('platform:manage')) && <><span className="nav-heading">Manage</span><NavItem to="/admin" label="Administration" icon={Settings} onClick={() => setOpen(false)} /></>}
      </nav>
      <div className="sidebar-footer"><ShieldCheck size={16} /><span>{demoMode ? 'Synthetic demo · staging' : 'Connected staging'}</span></div>
    </aside>
    {open && <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
    <main className="main">
      <header className="topbar">
        <button className="menu-button" aria-label="Open menu" onClick={() => setOpen(true)}><Menu /></button>
        <div className="context"><span>{isAdmin ? 'Administration' : tenant.name}</span><small>{isAdmin && data.user.isPlatformAdmin ? 'Platform scope' : role ? roleLabel(role) : 'Platform administrator'}</small></div>
        <div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={19} /></button><button className="icon-button has-dot" aria-label="Notifications"><Bell size={19} /></button><button className="avatar" title={demoMode ? data.user.email : 'Sign out'} onClick={() => { if (!demoMode) void supabase?.auth.signOut() }}>{data.user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</button></div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>
}

function NavItem({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: typeof Activity; onClick: () => void }) {
  return <NavLink to={to} end={to === '/'} onClick={onClick} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action}</div>
}

export function Status({ value }: { value: string }) {
  return <span className={`status status-${value.replace('_', '-')}`}><i />{value.replace('_', ' ')}</span>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><BarChart3 size={26} /><h3>{title}</h3><p>{description}</p></div>
}
