import { useEffect, useState } from 'react'
import { QrIcon } from './icons.jsx'
import { qrPngDataUrl, qrSvg } from './qr.js'
import { SITE_NAME, SITE_URL } from './site.js'

export default function QrShare() {
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    qrSvg(SITE_URL)
      .then((markup) => { if (!cancelled) setSvg(markup) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(SITE_URL)
      setMessage('Link copied.')
    } catch {
      setMessage('Could not copy automatically. Select the link above and copy it.')
    }
  }

  async function downloadCode() {
    try {
      const link = document.createElement('a')
      link.href = await qrPngDataUrl(SITE_URL)
      link.download = 'plant-care-notes-qr.png'
      link.click()
      setMessage('QR code image saved.')
    } catch {
      setMessage('Could not create the image. Take a screenshot of the code instead.')
    }
  }

  return (
    <section className="share no-print" id="share" aria-labelledby="share-heading">
      <div className="share-code">
        {svg ? (
          <div className="qr-code" role="img" aria-label={`QR code that opens ${SITE_NAME}`}
            dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="qr-code qr-placeholder" role="status">
            {failed ? 'The QR code could not be made. Use the link instead.' : 'Making the QR code…'}
          </div>
        )}
      </div>
      <div className="share-copy">
        <p className="eyebrow">Share the app</p>
        <h2 id="share-heading"><QrIcon size={22} /> Open it on your phone</h2>
        <p className="hint">
          Point your phone's camera at the code to open {SITE_NAME}. Share it with anyone who keeps plants.
          The app then installs from the browser menu and works offline.
        </p>
        <p className="share-url"><a href={SITE_URL}>{SITE_URL}</a></p>
        <div className="actions">
          <button type="button" className="secondary" onClick={copyLink}>Copy link</button>
          <button type="button" className="secondary" onClick={downloadCode} disabled={failed}>Download QR code</button>
        </div>
        {message && <p className="hint" role="status">{message}</p>}
      </div>
    </section>
  )
}
