import { useCallback,useEffect,useState,type FormEvent } from 'react'
import { ArrowLeft,GitBranch } from 'lucide-react'
import { Link,Navigate } from 'react-router-dom'
import { FormField } from './components/Modal'
import { PageHeader } from './components/Shell'
import { useApp } from './context/AppContext'
import { RecoveryPolicyPage } from './recoveryPages'
import { recoveryService,type RecoveryWorkspace } from './services/recoveryService'
import type { RecoveryPath } from './types'

export function RecoveryAdministrationPage(){
  const {allowed}=useApp()
  return <><div className="recovery-admin-actions">{allowed('recovery:manage')&&<Link className="secondary-button" to="/recover/paths/new"><GitBranch size={15}/> New approved path</Link>}</div><RecoveryPolicyPage/></>
}

export function RecoveryPathCreatePage(){
  const {data,tenant,allowed}=useApp();const [workspace,setWorkspace]=useState<RecoveryWorkspace|null>(null);const [loadError,setLoadError]=useState('');const [busy,setBusy]=useState(false);const [formError,setFormError]=useState('');const [saved,setSaved]=useState(false)
  const load=useCallback(async()=>{try{setWorkspace(await recoveryService.getWorkspace(tenant.id))}catch{setLoadError('Recovery configuration could not be loaded.')}},[tenant.id]);useEffect(()=>{void load()},[load])
  if(!allowed('recovery:manage'))return <section className="center-state"><h1>Access denied</h1><p>Your role cannot configure recovery paths.</p></section>
  if(saved)return <Navigate to="/recover/policies" replace/>
  if(!workspace)return <section className="panel intelligence-loading"><div className="loader"/><p>{loadError||'Loading recovery configuration…'}</p></section>
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setBusy(true);setFormError('');const form=new FormData(event.currentTarget);const optional=(name:string)=>String(form.get(name)??'').trim()||null;try{await recoveryService.savePath({id:crypto.randomUUID(),tenantId:tenant.id,recoveryPolicyId:String(form.get('policyId')),buyerId:optional('buyerId'),offerId:optional('offerId'),programId:optional('programId'),pathType:String(form.get('pathType')) as RecoveryPath['pathType'],priority:Number(form.get('priority')),status:'active',payoutOverride:optional('payout')===null?null:Number(form.get('payout')),destinationReference:null});setSaved(true)}catch{setFormError('The approved recovery path could not be saved safely.')}finally{setBusy(false)}}
  return <><Link className="back-link" to="/recover/policies"><ArrowLeft size={15}/> Back to policies and paths</Link><PageHeader eyebrow="Recover administration" title="Create approved path" description="Authorize a tenant-scoped secondary destination. This does not execute an outbound delivery."/><section className="panel recovery-path-form"><form onSubmit={(event)=>void submit(event)}><FormField label="Recovery policy"><select name="policyId" required>{workspace.policies.filter((row)=>row.status==='active').map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></FormField><div className="form-grid"><FormField label="Path type"><select name="pathType" defaultValue="secondary_buyer"><option value="secondary_buyer">Secondary buyer</option><option value="host_post">Approved host post</option></select></FormField><FormField label="Priority"><input name="priority" type="number" min="1" defaultValue="100" required/></FormField></div><FormField label="Approved buyer"><select name="buyerId" required><option value="">Select buyer</option>{data.buyers.filter((row)=>row.tenantId===tenant.id&&row.status==='active').map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></FormField><div className="form-grid"><FormField label="Program (optional)"><select name="programId"><option value="">Policy context</option>{data.programs.filter((row)=>row.tenantId===tenant.id).map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></FormField><FormField label="Offer (optional)"><select name="offerId"><option value="">Policy context</option>{data.offers.filter((row)=>row.tenantId===tenant.id).map((row)=><option key={row.id} value={row.id}>{row.name}</option>)}</select></FormField></div><FormField label="Payout override (optional)"><input name="payout" type="number" min="0" step="0.01"/></FormField>{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="modal-actions"><Link className="secondary-button" to="/recover/policies">Cancel</Link><button className="primary-button" disabled={busy}>{busy?'Saving…':'Save approved path'}</button></div></form></section></>
}
