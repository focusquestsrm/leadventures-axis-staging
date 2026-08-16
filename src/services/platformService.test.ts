import { describe, expect, it } from 'vitest'
import { platformService } from './platformService'

const alpha = '10000000-0000-4000-8000-000000000001'
const beta = '10000000-0000-4000-8000-000000000002'

describe('tenant-scoped platform service', () => {
  it('returns operational records only for the requested authorized tenant', async () => {
    const alphaData = await platformService.getSnapshot(alpha)
    const betaData = await platformService.getSnapshot(beta)
    expect(alphaData.leads.every((record) => record.tenantId === alpha)).toBe(true)
    expect(betaData.leads.every((record) => record.tenantId === beta)).toBe(true)
    expect(betaData.buyers).toHaveLength(0)
  })

  it('keeps newly created records inside their tenant', async () => {
    await platformService.saveBuyer({ tenantId: beta, name: 'Beta Synthetic Buyer', externalReference: 'BETA-TEST', notes: '', status: 'active' })
    const betaData = await platformService.getSnapshot(beta)
    const alphaData = await platformService.getSnapshot(alpha)
    expect(betaData.buyers.some((buyer) => buyer.externalReference === 'BETA-TEST')).toBe(true)
    expect(alphaData.buyers.some((buyer) => buyer.externalReference === 'BETA-TEST')).toBe(false)
  })

  it('rejects platform_admin as a tenant membership role at runtime', async () => {
    await expect(platformService.addMembership(alpha, crypto.randomUUID(), 'platform_admin' as never)).rejects.toThrow(/cannot be assigned/i)
  })

  it('preserves multiple delivery attempts in attempt order', async () => {
    const snapshot = await platformService.getSnapshot(alpha)
    const attempts = snapshot.deliveryAttempts.filter((attempt) => attempt.leadId === 'l1').sort((a, b) => a.attemptNumber - b.attemptNumber)
    expect(attempts.map((attempt) => attempt.attemptNumber)).toEqual([1, 2])
    expect(attempts.map((attempt) => attempt.status)).toEqual(['rejected', 'accepted'])
  })

  it('associates a rejection with the correct delivery attempt', async () => {
    const snapshot = await platformService.getSnapshot(alpha)
    const rejection = snapshot.leadRejections.find((item) => item.id === 'lr1')
    expect(rejection?.deliveryAttemptId).toBe('da1')
    expect(snapshot.deliveryAttempts.find((attempt) => attempt.id === rejection?.deliveryAttemptId)?.status).toBe('rejected')
  })

  it('keeps every Release 2 collection tenant-scoped and new tenants empty', async () => {
    const betaData = await platformService.getSnapshot(beta)
    for (const records of [betaData.trafficSources,betaData.campaigns,betaData.buyerCaps,betaData.deliveryAttempts,betaData.leadRejections,betaData.leadStatusHistory]) {
      expect(records.every((record) => record.tenantId === beta)).toBe(true)
    }
    expect(betaData.campaigns).toHaveLength(0)
    expect(betaData.deliveryAttempts).toHaveLength(0)
  })
})
