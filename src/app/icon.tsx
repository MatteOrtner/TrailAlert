import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const size        = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  const imagePath = join(process.cwd(), 'public', 'branding', 'trailalert-brand.png')
  const imageBase64 = readFileSync(imagePath).toString('base64')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          backgroundImage: `url(data:image/png;base64,${imageBase64})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    ),
    { ...size },
  )
}
