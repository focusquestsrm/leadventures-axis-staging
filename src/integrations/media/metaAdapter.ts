import { normalizeMediaRows } from './mediaConnector'
import type { MediaConnector } from './types'
export const metaAdapter:MediaConnector={platform:'meta',vendor:'Meta Ads',nativeAdGroupLabel:'Ad Set',normalize(rows,mappings){return normalizeMediaRows('meta',rows,mappings)}}
