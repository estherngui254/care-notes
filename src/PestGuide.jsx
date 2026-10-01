import { BookIcon } from './icons.jsx'
import ManagementPlan from './ManagementPlan.jsx'
import { KIND_GROUPS, KIND_LABELS, NUTRIENT_TIP, PROBLEMS } from './pestsAndDiseases.js'

export default function PestGuide() {
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
      {KIND_GROUPS.map(({ kind, title }) => (
        <div key={kind} className="guide-group">
          <h3>{title}</h3>
          <div className="guide-list">
            {PROBLEMS.filter((problem) => problem.kind === kind).map((problem) => (
              <details key={problem.id} className="guide-item">
                <summary>
                  {problem.name} <span className="kind">{KIND_LABELS[problem.kind]}</span>
                </summary>
                <p className="treatment-title">Signs</p>
                <ul className="chips" aria-label={`Signs of ${problem.name}`}>
                  {problem.signs.map((sign) => <li key={sign}>{sign}</li>)}
                </ul>
                <ManagementPlan problem={problem} idPrefix={`guide-${problem.id}`} />
              </details>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
