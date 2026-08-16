import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

export const isDemoModeEnabled = (isDevelopment: boolean, configuredValue?: string) => isDevelopment && configuredValue !== 'false'

export const demoMode = isDemoModeEnabled(import.meta.env.DEV, import.meta.env.VITE_ENABLE_DEMO_MODE)
