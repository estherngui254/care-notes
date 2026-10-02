import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import jsQR from 'jsqr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./qr.js', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, qrSvg: vi.fn(real.qrSvg), qrPngDataUrl: vi.fn(real.qrPngDataUrl) }
})

import App from './App.jsx'
import QrShare from './QrShare.jsx'
import { qrMatrix, qrPngDataUrl, qrSvg } from './qr.js'
import { SITE_URL } from './site.js'

// Draws the module grid as pixels (with the quiet zone readers need) and reads it back like a phone would.
async function decode(text) {
  const modules = await qrMatrix(text)
  const scale = 8
  const quiet = 4
  const side = (modules.size + quiet * 2) * scale
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255)
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (!modules.get(row, col)) continue
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const at = (((row + quiet) * scale + y) * side + (col + quiet) * scale + x) * 4
          pixels[at] = 16; pixels[at + 1] = 38; pixels[at + 2] = 27
        }
      }
    }
  }
  return jsQR(pixels, side, side)
}

beforeEach(() => {
  qrSvg.mockClear()
  qrPngDataUrl.mockClear()
})

describe('QR code', () => {
  it('decodes back to the address of the live site', async () => {
    expect(SITE_URL).toBe('https://estherngui254.github.io/care-notes/')
    const result = await decode(SITE_URL)
    expect(result).not.toBeNull()
    expect(result.data).toBe(SITE_URL)
  })

  it('draws dark modules on a white background whatever the theme', async () => {
    document.documentElement.dataset.theme = 'dark'
    const svg = await qrSvg(SITE_URL)
    expect(svg).toContain('<svg')
    expect(svg).toContain('#ffffff')
    expect(svg).toContain('#10261b')
    delete document.documentElement.dataset.theme
  })
})

describe('Share section', () => {
  it('shows the QR code with an accessible name and a link to the site', async () => {
    render(<QrShare />)
    expect(screen.getByText(/making the qr code/i)).toBeInTheDocument()
    const code = await screen.findByRole('img', { name: /qr code that opens plant care notes/i })
    expect(code.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('heading', { name: /open it on your phone/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: SITE_URL })).toHaveAttribute('href', SITE_URL)
    expect(qrSvg).toHaveBeenCalledWith(SITE_URL)
  })

  it('copies the link', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<QrShare />)
    await user.click(screen.getByRole('button', { name: /copy link/i }))
    expect(writeText).toHaveBeenCalledWith(SITE_URL)
    expect(await screen.findByText('Link copied.')).toBeInTheDocument()
  })

  it('explains what to do when copying is not allowed', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true })
    render(<QrShare />)
    await user.click(screen.getByRole('button', { name: /copy link/i }))
    expect(await screen.findByText(/could not copy automatically/i)).toBeInTheDocument()
  })

  it('downloads the code as an image', async () => {
    const user = userEvent.setup()
    qrPngDataUrl.mockResolvedValueOnce('data:image/png;base64,AAAA')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<QrShare />)
    await user.click(screen.getByRole('button', { name: /download qr code/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    const link = click.mock.contexts[0]
    expect(link.download).toBe('plant-care-notes-qr.png')
    expect(link.href).toBe('data:image/png;base64,AAAA')
    expect(await screen.findByText(/qr code image saved/i)).toBeInTheDocument()
    click.mockRestore()
  })

  it('falls back to the link when the code cannot be made', async () => {
    qrSvg.mockRejectedValueOnce(new Error('offline'))
    render(<QrShare />)
    expect(await screen.findByText(/qr code could not be made/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download qr code/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: SITE_URL })).toBeInTheDocument()
  })

  it('appears in the app with a menu link', async () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Share' })).toHaveAttribute('href', '#share')
    expect(await screen.findByRole('img', { name: /qr code/i })).toBeInTheDocument()
  })
})
