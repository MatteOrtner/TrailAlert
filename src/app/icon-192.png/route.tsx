import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          192,
          height:         192,
          borderRadius:   36,
          background:     '#0f1115',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width:          140,
            height:         140,
            borderRadius:   24,
            background:     '#f59e0b',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexDirection:  'column',
            gap:            0,
          }}
        >
          <span style={{ fontSize: 64, lineHeight: 1, color: '#0f1115', fontWeight: 900 }}>
            TA
          </span>
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  )
}
