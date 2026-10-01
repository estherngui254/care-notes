export const SYMPTOMS = [
  'Fine webbing on leaves',
  'Cottony white clumps',
  'Sticky residue on leaves',
  'Small brown bumps on stems or leaves',
  'Clusters of tiny insects on new growth',
  'Tiny flying insects',
  'Silvery streaks or speckling',
  'Yellowing leaves',
  'Brown leaf tips',
  'Brown or black spots on leaves',
  'White powdery coating',
  'Mushy stems or base',
  'Wilting despite moist soil',
  'Fuzzy grey mold',
  'Black sooty coating',
  'Curled or distorted new growth',
  'Leaves dropping',
]

export const KIND_LABELS = { pest: 'Pest', disease: 'Disease', care: 'Care problem' }

export const PROBLEMS = [
  {
    id: 'spider-mites',
    name: 'Spider mites',
    kind: 'pest',
    signs: ['Fine webbing on leaves', 'Silvery streaks or speckling', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Tiny sap-sucking mites, often on the underside of leaves. They thrive in warm, dry air.',
    treatment: [
      'Isolate the plant from your others.',
      'Rinse the leaves, top and underside, with lukewarm water.',
      'Wipe with insecticidal soap or neem oil, following the label. Repeat every 5 to 7 days for about 3 weeks.',
      'Raise the humidity around the plant.',
    ],
  },
  {
    id: 'mealybugs',
    name: 'Mealybugs',
    kind: 'pest',
    signs: ['Cottony white clumps', 'Sticky residue on leaves', 'Yellowing leaves', 'Curled or distorted new growth'],
    about: 'Soft white insects that hide in leaf joints and under leaves, and leave a sticky honeydew.',
    treatment: [
      'Isolate the plant.',
      'Dab each insect with a cotton swab dipped in 70% isopropyl alcohol.',
      'Follow up with insecticidal soap, and repeat weekly until none are left.',
      'Check the roots and the underside of leaves for hidden ones.',
    ],
  },
  {
    id: 'aphids',
    name: 'Aphids',
    kind: 'pest',
    signs: ['Clusters of tiny insects on new growth', 'Sticky residue on leaves', 'Curled or distorted new growth', 'Yellowing leaves'],
    about: 'Small green, black or brown insects that cluster on soft new growth and flower buds.',
    treatment: [
      'Spray them off with a strong stream of water.',
      'Wipe with insecticidal soap or neem oil, following the label.',
      'Prune and bin badly infested shoots.',
      'Check again every few days.',
    ],
  },
  {
    id: 'scale',
    name: 'Scale insects',
    kind: 'pest',
    signs: ['Small brown bumps on stems or leaves', 'Sticky residue on leaves', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Armoured insects that look like small brown or tan bumps and barely move.',
    treatment: [
      'Scrape the bumps off gently with a fingernail or soft brush, or touch each with an alcohol-soaked swab.',
      'Treat the whole plant with horticultural oil or insecticidal soap, following the label.',
      'Repeat every 7 to 10 days, since young scale are easier to kill than adults.',
    ],
  },
  {
    id: 'fungus-gnats',
    name: 'Fungus gnats',
    kind: 'pest',
    signs: ['Tiny flying insects', 'Yellowing leaves', 'Wilting despite moist soil'],
    about: 'Small dark flies around the soil. Their larvae feed on roots in constantly wet soil.',
    treatment: [
      'Let the top 2 to 3 cm of soil dry out between waterings.',
      'Place yellow sticky traps near the soil.',
      'Use a Bti (Bacillus thuringiensis israelensis) soil treatment, following the label.',
      'Do not let water sit in the saucer.',
    ],
  },
  {
    id: 'thrips',
    name: 'Thrips',
    kind: 'pest',
    signs: ['Silvery streaks or speckling', 'Curled or distorted new growth', 'Brown or black spots on leaves'],
    about: 'Slender insects that scrape leaves and flowers, leaving silvery streaks and tiny black specks.',
    treatment: [
      'Isolate the plant.',
      'Hang blue sticky traps and remove badly damaged leaves.',
      'Treat with insecticidal soap or spinosad, following the label, and repeat weekly.',
    ],
  },
  {
    id: 'whiteflies',
    name: 'Whiteflies',
    kind: 'pest',
    signs: ['Tiny flying insects', 'Sticky residue on leaves', 'Yellowing leaves', 'Black sooty coating'],
    about: 'Small white insects that fly up in a cloud when the plant is disturbed.',
    treatment: [
      'Hang yellow sticky traps.',
      'Spray the underside of leaves with insecticidal soap, following the label.',
      'Repeat every few days, since eggs hatch in waves.',
    ],
  },
  {
    id: 'powdery-mildew',
    name: 'Powdery mildew',
    kind: 'disease',
    signs: ['White powdery coating', 'Curled or distorted new growth', 'Yellowing leaves'],
    about: 'A fungus that forms a white, dusty film on leaves and buds, common in humid, still air.',
    treatment: [
      'Remove the worst-affected leaves.',
      'Improve air flow and avoid wetting the leaves.',
      'Treat with a fungicide, potassium bicarbonate or neem oil, following the label.',
    ],
  },
  {
    id: 'root-rot',
    name: 'Root rot',
    kind: 'disease',
    signs: ['Mushy stems or base', 'Wilting despite moist soil', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Roots rot in soil that stays waterlogged, so the plant wilts even though the soil is wet.',
    treatment: [
      'Take the plant out of its pot and check the roots. Healthy ones are firm and pale.',
      'Trim black or mushy roots with clean scissors.',
      'Repot in fresh, well-draining mix in a pot with drainage holes.',
      'Water less, and only when the top of the soil is dry.',
    ],
  },
  {
    id: 'leaf-spot',
    name: 'Leaf spot (fungal or bacterial)',
    kind: 'disease',
    signs: ['Brown or black spots on leaves', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Spots, often with a yellow halo, spread by water splashing between leaves.',
    treatment: [
      'Remove affected leaves and bin them.',
      'Water the soil, not the leaves, and avoid misting.',
      'Space plants out for air flow.',
      'Use a fungicide if the spots keep spreading.',
    ],
  },
  {
    id: 'grey-mold',
    name: 'Grey mold (Botrytis)',
    kind: 'disease',
    signs: ['Fuzzy grey mold', 'Mushy stems or base', 'Brown or black spots on leaves'],
    about: 'A fuzzy grey mold on soft, damaged or dying tissue, common in cool, damp, crowded conditions.',
    treatment: [
      'Remove all infected parts and bin them.',
      'Lower the humidity and increase air flow.',
      'Avoid overcrowding and clear fallen leaves from the soil.',
    ],
  },
  {
    id: 'sooty-mold',
    name: 'Sooty mold',
    kind: 'disease',
    signs: ['Black sooty coating', 'Sticky residue on leaves'],
    about: 'A black film growing on the honeydew left by sap-sucking pests. It is a sign of a pest nearby.',
    treatment: [
      'Wipe the leaves with a damp cloth.',
      'Find and treat the pest causing the honeydew, such as aphids, scale, mealybugs or whiteflies.',
    ],
  },
  {
    id: 'dry-air',
    name: 'Dry air or uneven watering',
    kind: 'care',
    signs: ['Brown leaf tips', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Not a pest or disease. Crispy brown tips usually come from dry air, uneven watering or mineral build-up.',
    treatment: [
      'Water thoroughly when the top of the soil is dry, then empty the saucer.',
      'Raise the humidity, for example with a pebble tray or by grouping plants.',
      'Flush the soil with water now and then to wash out mineral salts.',
      'Keep the plant away from heaters and vents.',
    ],
  },
]

export function findProblem(name) {
  return PROBLEMS.find((problem) => problem.name === name) ?? null
}

// Ranks problems by how many of the chosen symptoms they share. A guide only, not a diagnosis.
export function matchProblems(symptoms, limit = 3) {
  if (!symptoms || symptoms.length === 0) return []
  return PROBLEMS
    .map((problem) => {
      const matched = problem.signs.filter((sign) => symptoms.includes(sign))
      return { problem, matched, score: matched.length / problem.signs.length }
    })
    .filter((match) => match.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length || b.score - a.score || a.problem.name.localeCompare(b.problem.name))
    .slice(0, limit)
}
