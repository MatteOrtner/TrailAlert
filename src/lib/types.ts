export type ClosureType = 'forestwork' | 'construction' | 'damage' | 'other'
export type ClosureStatus = 'active' | 'resolved' | 'unconfirmed'
export type SeverityLevel = 'full_closure' | 'partial' | 'warning'
export type VoteType = 'confirm' | 'deny'

export interface Closure {
  id: string
  latitude: number
  longitude: number
  title: string
  description: string | null
  closure_type: ClosureType
  status: ClosureStatus
  severity: SeverityLevel
  photo_url: string | null
  reported_by: string | null
  expected_end: string | null
  upvotes: number
  downvotes: number
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  closure_id: string
  user_id: string | null
  vote_type: VoteType
  anon_fingerprint: string | null
  created_at: string
}

export interface WatchArea {
  id: string
  user_id: string
  center_lat: number
  center_lng: number
  radius_km: number
  name: string
  notify_email: boolean
  created_at: string
}
