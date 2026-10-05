import { Fragment, useEffect, useMemo, useState } from 'react'
import { BookIcon } from './icons.jsx'
import ManagementPlan from './ManagementPlan.jsx'
import { KIND_GROUPS, NUTRIENT_TIP, PROBLEMS } from './pestsAndDiseases.js'

const ALL = 'all'

export default function PestGuide() {
  const [query, setQuery] = useState('')
  const [sign, setSign] = useState(ALL)
  const [openKinds, setOpenKinds] = useState(() => new Set())
  const [openId, setOpenId] = useState(null)

  const signs = useMemo(
    () => [...new Set(PROBLEMS.flatMap((problem) => problem.signs))].sort((a, b) => a.localeCompare(b)),
    [],
  )

  const filtering = query.trim() !== '' || sign !== ALL

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return PROBLEMS.filter((problem) => {
      if (sign !== ALL && !problem.signs.includes(sign)) return false
      if (term && !problem.name.toLowerCase().includes(term)
        && !problem.about.toLowerCase().includes(term)
        && !problem.signs.some((item) => item.toLowerCase().includes(term))) return false
      return true
    })
  }, [query, sign])

  // While a filter is active, open every section that still has matches so the results are visible.
  useEffect(() => {
    if (!filtering) return
    setOpenKinds((prev) => {
      const next = new Set(prev)
      for (const { kind } of KIND_GROUPS) {
        if (rows.some((problem) => problem.kind === kind)) next.add(kind)
      }
      return next
    })
  }, [filtering, rows])

  function toggleSection(kind) {
    setOpenKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  function clearFilters() {
    setQuery('')
    setSign(ALL)
  }

  return (
    <details className="guide no-print" id="guide">
      <summary className="block-summary"><BookIcon size={20} /> Pest, disease and nutrient guide</summary>
      <div className="block-body">
      <p className="hint">
        Compare what you see on your plant with these descriptions. This is general guidance, not a diagnosis.
        Always follow the product label, keep treatments away from pets and children, and ask a local nursery
        if a problem keeps coming back.
      </p>
      <p className="tip"><strong>Nutrient tip:</strong> {NUTRIENT_TIP}</p>

      <div className="controls guide-filters" role="search" aria-label="Filter the field guide">
        <div className="control control-wide">
          <label htmlFor="guide-search">Search the guide</label>
          <input id="guide-search" type="search" value={query} placeholder="Name, sign or description"
            onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="control control-wide">
          <label htmlFor="guide-sign">Sign</label>
          <select id="guide-sign" value={sign} onChange={(event) => setSign(event.target.value)}>
            <option value={ALL}>All signs</option>
            {signs.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {filtering && (
          <button type="button" className="secondary control-clear" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      <p className="guide-count" aria-live="polite">
        {filtering
          ? `Showing ${rows.length} of ${PROBLEMS.length} problems`
          : `${PROBLEMS.length} problems in the guide`}
      </p>

      {rows.length === 0 ? (
        <div className="guide-empty">
          No problems match your filters.
          <button type="button" className="link" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        KIND_GROUPS.map(({ kind, title }) => {
          const sectionRows = rows.filter((problem) => problem.kind === kind)
          if (sectionRows.length === 0) return null
          return (
            <details key={kind} className="guide-section" open={openKinds.has(kind)}>
              <summary onClick={() => toggleSection(kind)}>
                <span className="guide-section-title">{title}</span>
                <span className="guide-section-count">
                  {sectionRows.length} {sectionRows.length === 1 ? 'problem' : 'problems'}
                </span>
              </summary>
              <table className="guide-table">
                <thead>
                  <tr>
                    <th scope="col">Problem</th>
                    <th scope="col" className="guide-col-signs">Signs to look for</th>
                    <th scope="col" className="guide-col-plan"><span className="sr-only">Management plan</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sectionRows.map((problem) => {
                    const open = openId === problem.id
                    const planId = `guide-plan-${problem.id}`
                    const shown = problem.signs.slice(0, 2)
                    const extra = problem.signs.length - shown.length
                    return (
                      <Fragment key={problem.id}>
                        <tr className={open ? 'is-open' : undefined}>
                          <th scope="row" className="guide-name">{problem.name}</th>
                          <td className="guide-col-signs">
                            <ul className="chips guide-signs" aria-label={`Signs of ${problem.name}`}>
                              {shown.map((item) => <li key={item}>{item}</li>)}
                              {extra > 0 && <li className="chips-more">+{extra} more</li>}
                            </ul>
                          </td>
                          <td className="guide-actions">
                            <button type="button" className="secondary guide-toggle" aria-expanded={open}
                              aria-controls={open ? planId : undefined}
                              onClick={() => setOpenId(open ? null : problem.id)}>
                              {open ? 'Hide plan' : 'View plan'}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="guide-detail" id={planId}>
                            <td colSpan={3}>
                              <p className="treatment-title">Signs</p>
                              <ul className="chips" aria-label={`All signs of ${problem.name}`}>
                                {problem.signs.map((item) => <li key={item}>{item}</li>)}
                              </ul>
                              <ManagementPlan problem={problem} idPrefix={`guide-${problem.id}`} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </details>
          )
        })
      )}
      </div>
    </details>
  )
}
