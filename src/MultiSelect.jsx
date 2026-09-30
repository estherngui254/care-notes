import { useEffect, useRef, useState } from 'react'

export default function MultiSelect({ id, labelId, options, value, onChange, placeholder, groupLabel, invalid, describedBy }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle(option) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])
  }

  const label = value.length === 0 ? placeholder : `${value.length} selected`
  const panelId = `${id}-panel`

  return (
    <div className="picker" ref={rootRef}>
      <button type="button" className="secondary picker-toggle" id={id}
        aria-haspopup="true" aria-expanded={open} aria-controls={panelId}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        aria-labelledby={labelId ? `${labelId} ${id}-text` : undefined}
        onClick={() => setOpen((current) => !current)}>
        <span id={`${id}-text`}>{label}</span><span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="picker-panel" id={panelId} role="group" aria-label={groupLabel}>
          <ul>
            {options.map((option) => (
              <li key={option}>
                <label className="picker-option">
                  <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} />
                  {option}
                </label>
              </li>
            ))}
          </ul>
          {value.length > 0 && (
            <button type="button" className="secondary picker-clear" onClick={() => onChange([])}>Clear selection</button>
          )}
        </div>
      )}
    </div>
  )
}
