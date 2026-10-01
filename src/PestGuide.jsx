import { KIND_LABELS, PROBLEMS } from './pestsAndDiseases.js'

export default function PestGuide() {
  return (
    <section className="guide no-print" aria-labelledby="guide-heading">
      <h2 id="guide-heading">Pest and disease guide</h2>
      <p className="hint">
        Compare what you see on your plant with these descriptions. This is general guidance, not a diagnosis.
        Always follow the product label, keep treatments away from pets and children, and ask a local nursery
        if a problem keeps coming back.
      </p>
      <div className="guide-list">
        {PROBLEMS.map((problem) => (
          <details key={problem.id} className="guide-item">
            <summary>
              {problem.name} <span className="kind">{KIND_LABELS[problem.kind]}</span>
            </summary>
            <p>{problem.about}</p>
            <p className="treatment-title">Signs</p>
            <ul className="chips" aria-label={`Signs of ${problem.name}`}>
              {problem.signs.map((sign) => <li key={sign}>{sign}</li>)}
            </ul>
            <p className="treatment-title">What to try</p>
            <ul>
              {problem.treatment.map((step) => <li key={step}>{step}</li>)}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
