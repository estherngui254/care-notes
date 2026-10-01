import { Fragment, useMemo, useState } from 'react'
import { BookIcon } from './icons.jsx'
import ManagementPlan from './ManagementPlan.jsx'
import { KIND_GROUPS, KIND_LABELS, NUTRIENT_TIP, PROBLEMS } from './pestsAndDiseases.js'

const ALL = 'all'

export default function PestGuide() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState(ALL)
  const [sign, setSign] = useState(ALL)
  const [openId, setOpenId] = useState(null)

  const signs = useMemo(
    () => [...new Set(PROBLEMS.flatMap((problem) => problem.signs))].sort((a, b) => a.localeCompare(b)),
    [],
  )

  const filtering = query.trim() !== '' || kind !== ALL || sign !== ALL

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return PROBLEMS.filter((problem) => {
      if (kind !== ALL && problem.kind !== kind) return false
      if (sign !== ALL && !problem.signs.includes(sign)) return false
      if (term && !problem.name.toLowerCase().includes(term)
        && !problem.about.toLowerCase().includes(term)
        && !problem.signs.some((item) => item.toLowerCase().includes(term))) return false
      return true
    })
  }, [query, kind, sign])

  function clearFilters() {
    setQuery('')
    setKind(ALL)
    setSign(ALL)
  }

  return (
    <section className="guide no-print" id="guide" aria-labelledby="guide-heading">
      <p className="eyebrow">Field guide</p>
      <h2 id="guide-heading"><BookIcon size={22} /> Pest, disease and nutrient guide</h2>
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
        <div className="control">
          <label htmlFor="guide-kind">Type</label>
          <select id="guide-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value={ALL}>All types</option>
            {KIND_GROUPS.map(({ kind: value, title }) => (
              <option key={value} value={value}>{title}</option>
            ))}
          </select>
        </div>
        <div className="control">
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

      <div className="guide-table-wrap">
        <table className="guide-table">
          <thead>
            <tr>
              <th scope="col">Problem</th>
              <th scope="col">Type</th>
              <th scope="col" className="guide-col-signs">Signs to look for</th>
              <th scope="col" className="guide-col-plan"><span className="sr-only">Management plan</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="guide-empty" colSpan={4}>
                  No problems match your filters.
                  <button type="button" className="link" onClick={clearFilters}>Clear filters</button>
                </td>
              </tr>
            )}
            {rows.map((problem) => {
              const open = openId === problem.id
              const planId = `guide-plan-${problem.id}`
              const shown = problem.signs.slice(0, 2)
              const extra = problem.signs.length - shown.length
              return (
                <Fragment key={problem.id}>
                  <tr className={open ? 'is-open' : undefined}>
                    <th scope="row" className="guide-name">{problem.name}</th>
                    <td><span className="kind">{KIND_LABELS[problem.kind]}</span></td>
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
                      <td colSpan={4}>
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
      </div>
    </section>
  )
}
