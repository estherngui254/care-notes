// QR codes are drawn dark on white in every theme. Readers expect that, and many cannot
// scan a light-on-dark code, so these colours never follow dark mode.
const OPTIONS = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#10261b', light: '#ffffff' } }

// Loaded on demand so the main app stays small.
async function library() {
  const mod = await import('qrcode')
  return mod.default ?? mod
}

export async function qrSvg(text) {
  return (await library()).toString(text, { ...OPTIONS, type: 'svg' })
}

export async function qrPngDataUrl(text, width = 768) {
  return (await library()).toDataURL(text, { ...OPTIONS, width })
}

// The raw module grid, used to check a code decodes back to its text.
export async function qrMatrix(text) {
  const { modules } = (await library()).create(text, { errorCorrectionLevel: OPTIONS.errorCorrectionLevel })
  return modules
}
