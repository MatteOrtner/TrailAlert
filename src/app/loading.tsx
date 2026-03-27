export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Pulsing map skeleton */}
        <div
          className="h-12 w-12 animate-pulse rounded-xl"
          style={{ background: 'var(--bg-card)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Karte wird geladen…
        </p>
      </div>
    </div>
  )
}
