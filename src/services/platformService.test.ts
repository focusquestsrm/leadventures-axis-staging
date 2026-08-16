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
})
