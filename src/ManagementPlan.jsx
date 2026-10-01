// A management plan for one pest, disease or deficiency. With `done` and `onToggle` the
// "do now" steps become a checklist, otherwise they are a plain list (used in the guide).
export default function ManagementPlan({ problem, done, onToggle, idPrefix = problem.id }) {
  const interactive = Array.isArray(done) && typeof onToggle === 'function'
  const finished = interactive ? problem.treatment.filter((step) => done.includes(step)).length : 0

  return (
    <div className="plan">
      <p className="treatment-title">Management plan: {problem.name}</p>
      <p className="treatment-about">{problem.about}</p>

      <p className="treatment-title">
        Do now{interactive && <span className="progress"> ({finished} of {problem.treatment.length} done)</span>}
      </p>
      {interactive ? (
        <ul className="steps">
          {problem.treatment.map((step, index) => {
            const id = `${idPrefix}-step-${index}`
            return (
              <li key={step}>
                <input id={id} type="checkbox" checked={done.includes(step)} onChange={() => onToggle(step)} />
                <label htmlFor={id}>{step}</label>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul>
          {problem.treatment.map((step) => <li key={step}>{step}</li>)}
        </ul>
      )}

      <p className="treatment-title">Prevent a repeat</p>
      <ul>
        {problem.prevention.map((step) => <li key={step}>{step}</li>)}
      </ul>

      <p className="treatment-title">Check again</p>
      <p className="plan-text">{problem.monitor}</p>

      <p className="treatment-title">Get help if</p>
      <p className="plan-text">{problem.getHelp}</p>
    </div>
  )
}
