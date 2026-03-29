import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          512,
          height:         512,
          borderRadius:   96,
          background:     '#0f1115',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width:          376,
            height:         376,
            borderRadius:   64,
            background:     '#f59e0b',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 172, lineHeight: 1, color: '#0f1115', fontWeight: 900 }}>
            TA
          </span>
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
