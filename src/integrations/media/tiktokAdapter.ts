import { normalizeMediaRows } from './mediaConnector'
import type { MediaConnector } from './types'
export const tiktokAdapter:MediaConnector={platform:'tiktok',vendor:'TikTok Ads',nativeAdGroupLabel:'Ad Group',normalize(rows,mappings){return normalizeMediaRows('tiktok',rows,mappings)}}
