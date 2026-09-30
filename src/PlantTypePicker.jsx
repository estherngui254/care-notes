import { useEffect, useRef, useState } from 'react'
import { PLANT_TYPES } from './plantTypes.js'

export default function PlantTypePicker({ value, onChange }) {
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

  function toggle(type) {
    onChange(value.includes(type) ? value.filter((item) => item !== type) : [...value, type])
  }

  const label = value.length === 0 ? 'Choose plant types' : `${value.length} selected`

  return (
    <div className="picker" ref={rootRef}>
      <button type="button" className="secondary picker-toggle" id="plant-types"
        aria-haspopup="true" aria-expanded={open} aria-controls="plant-types-panel"
        onClick={() => setOpen((current) => !current)}>
        <span>{label}</span><span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="picker-panel" id="plant-types-panel" role="group" aria-label="Indoor plant types">
          <ul>
            {PLANT_TYPES.map((type) => (
              <li key={type}>
                <label className="picker-option">
                  <input type="checkbox" checked={value.includes(type)} onChange={() => toggle(type)} />
                  {type}
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
