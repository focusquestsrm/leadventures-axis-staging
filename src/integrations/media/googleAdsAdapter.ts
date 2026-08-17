import { normalizeMediaRows } from './mediaConnector'
import type { MediaConnector } from './types'
export const googleAdsAdapter:MediaConnector={platform:'google_ads',vendor:'Google Ads',nativeAdGroupLabel:'Ad Group',normalize(rows,mappings){return normalizeMediaRows('google_ads',rows,mappings)}}
