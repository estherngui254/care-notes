import { formatDate, wateringStatus } from './plantUtils.js'

export default function PlantCard({ plant, today, onEdit, onDelete }) {
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
    </li>
  )
}
