'use client'

import type { ClosureType, SeverityLevel } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

export interface QueuedReport {
  id: string
  latitude: number
  longitude: number
  title: string
  description: string | null
  closure_type: ClosureType
  severity: SeverityLevel
  expected_end: string | null
  reported_by: string | null
  // Base64 encoded file string
  photoDataUrl: string | null
  photoType: string | null
  createdAt: number
}

// Prefix for localStorage
const QUEUE_KEY = 'trailalert_offline_reports_queue'

export function getOfflineQueue(): QueuedReport[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(QUEUE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data) as QueuedReport[]
  } catch (e) {
    return []
  }
}

export function saveToOfflineQueue(report: QueuedReport) {
  if (typeof window === 'undefined') return
  const queue = getOfflineQueue()
  queue.push(report)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function removeFromOfflineQueue(id: string) {
  if (typeof window === 'undefined') return
  const queue = getOfflineQueue()
  const newQueue = queue.filter(r => r.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue))
}

// Call this function when the app comes back online
export async function syncOfflineQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return

  const queue = getOfflineQueue()
  if (queue.length === 0) return

  const supabase = createClient()
  
  for (const report of queue) {
    let photoUrl: string | null = null

    // Upload the base64 photo if it exists
    if (report.photoDataUrl && report.photoType) {
      try {
        const ext = report.photoType.split('/').pop() ?? 'jpg'
        const path = `${Date.now()}_${crypto.randomUUID()}.${ext}`
        
        // Convert Base64 back to Blob
        const res = await fetch(report.photoDataUrl)
        const blob = await res.blob()

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('closure-photos')
          .upload(path, blob, { contentType: report.photoType, upsert: false })

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('closure-photos')
            .getPublicUrl(uploadData.path)
          photoUrl = publicUrl
        }
      } catch (err) {
        console.error('Failed to upload offline photo', err)
      }
    }

    // Insert the report
    const { error: insertError } = await supabase
      .from('closures')
      .insert({
        latitude:     report.latitude,
        longitude:    report.longitude,
        title:        report.title,
        description:  report.description,
        closure_type: report.closure_type,
        severity:     report.severity,
        expected_end: report.expected_end,
        photo_url:    photoUrl,
        reported_by:  report.reported_by,
        status:       'active',
      })

    if (!insertError) {
      // Successfully submitted, remove from local queue
      removeFromOfflineQueue(report.id)
    } else {
      console.error('Failed to sync offline report', insertError)
      // Keep in queue for next time
    }
  }
}

// Convert a File object to a Base64 string so we can store it in localStorage
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}
