import { formatDate, wateringStatus } from './plantUtils.js'
import IssuePanel from './IssuePanel.jsx'

const PROFILE_ROWS = [
  ['scientificName', 'Scientific name'],
  ['light', 'Light'],
  ['water', 'Water'],
  ['humidity', 'Humidity'],
  ['temperature', 'Temperature'],
  ['soil', 'Soil'],
  ['fertiliser', 'Fertiliser'],
  ['petSafety', 'Pets'],
]

export default function PlantCard({ plant, today, onEdit, onDelete, onIssuesChange }) {
  const status = wateringStatus(plant, today)
  return (
    <li className="record">
      {plant.photo && <img className="record-photo" src={plant.photo} alt={`Photo of ${plant.name}`} />}
      <div className="record-copy">
        <h3>{plant.name}</h3>
        {status.label && <p className={`status status-${status.tone}`}>{status.label}</p>}
        {plant.careNote && <p>{plant.careNote}</p>}
        {plant.recommendations?.length > 0 && (
          <ul className="chips" aria-label="Care recommendations">
            {plant.recommendations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        {plant.lastWatered && <p className="watered">Last watered: {formatDate(plant.lastWatered)}</p>}
      </div>
      <div className="record-actions">
        <button type="button" className="secondary" aria-label={`Edit ${plant.name}`} onClick={() => onEdit(plant)}>Edit</button>
        <button type="button" className="danger" aria-label={`Delete ${plant.name}`} onClick={() => onDelete(plant)}>Delete</button>
      </div>
      {plant.careProfile && (
        <details className="issues profile no-print">
          <summary>Care requirements</summary>
          <dl className="care-grid">
            {PROFILE_ROWS.filter(([key]) => plant.careProfile[key]).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{plant.careProfile[key]}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <IssuePanel plant={plant} onChange={(issues) => onIssuesChange(plant.id, issues)} />
    </li>
  )
}
