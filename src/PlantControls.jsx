import { CARE_RECOMMENDATIONS } from './careRecommendations.js'
import { SORT_OPTIONS } from './plantUtils.js'

export default function PlantControls({ query, recommendation, sort, onQuery, onRecommendation, onSort, onClear, filtering }) {
  return (
    <div className="controls" role="search" aria-label="Find and sort plants">
      <div className="control control-wide">
        <label htmlFor="plant-search">Search</label>
        <input id="plant-search" type="search" value={query} placeholder="Name, care note or recommendation"
          onChange={(event) => onQuery(event.target.value)} />
      </div>
      <div className="control">
        <label htmlFor="plant-filter">Recommendation</label>
        <select id="plant-filter" value={recommendation} onChange={(event) => onRecommendation(event.target.value)}>
          <option value="">All recommendations</option>
          {CARE_RECOMMENDATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="control">
        <label htmlFor="plant-sort">Sort by</label>
        <select id="plant-sort" value={sort} onChange={(event) => onSort(event.target.value)}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      {filtering && <button type="button" className="secondary control-clear" onClick={onClear}>Clear filters</button>}
    </div>
  )
}
