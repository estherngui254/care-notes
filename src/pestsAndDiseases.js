// Symptoms seen on both kinds of problem come first, then pest-only, then nutrient-only.
const SHARED_SYMPTOMS = [
  'Yellowing leaves',
  'Brown leaf tips',
  'Leaves dropping',
  'Curled or distorted new growth',
  'Wilting despite moist soil',
]

const PEST_SYMPTOMS = [
  'Fine webbing on leaves',
  'Cottony white clumps',
  'Sticky residue on leaves',
  'Small brown bumps on stems or leaves',
  'Clusters of tiny insects on new growth',
  'Tiny flying insects',
  'Silvery streaks or speckling',
  'Brown or black spots on leaves',
  'White powdery coating',
  'Mushy stems or base',
  'Fuzzy grey mold',
  'Black sooty coating',
]

const NUTRIENT_SYMPTOMS = [
  'Lower leaves yellowing evenly',
  'Yellowing between veins on older leaves',
  'Yellowing between veins on new leaves',
  'Yellow or brown edges on older leaves',
  'Purple or reddish tinge on leaves',
  'Slow or stunted growth',
  'Dying growing tips',
  'Few or no flowers',
  'White crust on soil or pot rim',
]

export const SYMPTOMS = [...SHARED_SYMPTOMS, ...PEST_SYMPTOMS, ...NUTRIENT_SYMPTOMS]

export const CATEGORIES = [
  { value: 'all', label: 'Not sure' },
  { value: 'pest', label: 'Pest or disease' },
  { value: 'nutrient', label: 'Nutrient problem' },
]

export function symptomsFor(category) {
  if (category === 'pest') return [...SHARED_SYMPTOMS, ...PEST_SYMPTOMS]
  if (category === 'nutrient') return [...SHARED_SYMPTOMS, ...NUTRIENT_SYMPTOMS]
  return SYMPTOMS
}

export function kindsFor(category) {
  if (category === 'pest') return ['pest', 'disease', 'care']
  if (category === 'nutrient') return ['deficiency', 'care']
  return ['pest', 'disease', 'deficiency', 'care']
}

export const KIND_LABELS = {
  pest: 'Pest',
  disease: 'Disease',
  deficiency: 'Nutrient deficiency',
  care: 'Care problem',
}

export const KIND_GROUPS = [
  { kind: 'pest', title: 'Pests' },
  { kind: 'disease', title: 'Diseases' },
  { kind: 'deficiency', title: 'Nutrient deficiencies' },
  { kind: 'care', title: 'Care problems' },
]

export const NUTRIENT_TIP = 'Older leaves affected first usually points to nitrogen, phosphorus, potassium or magnesium, which the plant moves to new growth. New growth affected first usually points to iron or calcium, which it cannot move. Overwatering, root problems and pests can look the same, so rule those out first.'

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
      'Wipe with insecticidal soap or neem oil, following the label.',
      'Repeat every 5 to 7 days for about 3 weeks.',
    ],
    prevention: ['Raise the humidity, for example by grouping plants.', 'Wipe leaves regularly and look under them each week.', 'Quarantine new plants for 2 weeks.'],
    monitor: 'Check the underside of leaves every few days for 3 weeks. Webbing or new speckling means they are still there.',
    getHelp: 'The webbing keeps spreading after 3 weeks of treatment, or most leaves are damaged.',
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
      'Follow up with insecticidal soap.',
      'Repeat weekly until none are left, and check the roots.',
    ],
    prevention: ['Quarantine new plants for 2 weeks.', 'Do not overfeed with nitrogen, which attracts them.', 'Check leaf joints each time you water.'],
    monitor: 'Look in leaf joints and under leaves every few days for a month. New white fluff means they are back.',
    getHelp: 'They are in the roots, or the plant is badly infested and still declining after a month.',
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
    prevention: ['Do not overfeed with nitrogen, which makes soft growth they like.', 'Check new shoots weekly.', 'Keep plants healthy and not stressed.'],
    monitor: 'Check new growth and buds every 2 to 3 days for 2 weeks. They multiply fast.',
    getHelp: 'The colony returns after three treatments, or ants are farming them on outdoor plants.',
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
    prevention: ['Inspect stems and leaf undersides when you bring a plant home.', 'Quarantine new plants for 2 weeks.', 'Prune out heavily infested stems.'],
    monitor: 'Look for new bumps and sticky leaves every week for 6 weeks.',
    getHelp: 'The infestation covers most of the plant, or it keeps returning after repeated treatment.',
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
    prevention: ['Water only when the top of the soil is dry.', 'Use a well-draining mix and a pot with drainage holes.', 'Keep decaying leaves off the soil.'],
    monitor: 'Count the flies on the sticky trap each week. The numbers should fall within 2 to 3 weeks.',
    getHelp: 'Seedlings or cuttings are wilting from larvae in the roots, or flies persist after a month.',
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
      'Treat with insecticidal soap or spinosad, following the label.',
      'Repeat weekly for at least 3 weeks.',
    ],
    prevention: ['Quarantine new plants and cut flowers.', 'Check flowers and new growth each week.', 'Keep weeds and dead plant material away.'],
    monitor: 'Look at new leaves and flowers every few days. Fresh silvery streaks mean they are still active.',
    getHelp: 'Damage keeps appearing after 3 weeks, or the plant is in a greenhouse or conservatory.',
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
    prevention: ['Quarantine new plants.', 'Shake the plant gently and look for a cloud of flies each week.', 'Remove heavily infested leaves.'],
    monitor: 'Check the sticky traps and underside of leaves every 2 to 3 days for 3 weeks.',
    getHelp: 'The numbers do not fall after 3 weeks of treatment.',
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
    prevention: ['Give plants space and air flow.', 'Water the soil, not the leaves.', 'Put plants in brighter light.'],
    monitor: 'Check new leaves weekly. New white patches mean the treatment needs repeating.',
    getHelp: 'It spreads to most of the plant, or comes back every season.',
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
    prevention: ['Always use a pot with drainage holes and empty the saucer.', 'Water only when the top of the soil is dry.', 'Use a mix that drains well, for example with perlite.'],
    monitor: 'Check the soil moisture before every watering. New leaves growing normally is a good sign, usually within 4 to 6 weeks.',
    getHelp: 'Most of the roots are black and mushy, or the stem base is soft. Take cuttings from healthy stems if you can.',
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
    prevention: ['Water at soil level, in the morning.', 'Clear fallen leaves from the soil.', 'Do not crowd plants.'],
    monitor: 'Check leaves weekly and remove any new spotted ones early.',
    getHelp: 'Spots keep spreading after the affected leaves are removed and watering is changed.',
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
    prevention: ['Deadhead spent flowers and remove dying leaves promptly.', 'Keep air moving and avoid wet foliage overnight.', 'Do not overwater in cool weather.'],
    monitor: 'Check soft tissue and flowers every few days for 2 weeks.',
    getHelp: 'The mold reaches the main stem, or keeps returning in the same spot.',
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
    prevention: ['Treat sap-sucking pests early.', 'Wipe leaves regularly.'],
    monitor: 'The black film should stop coming back once the pest is gone. Check again after 2 weeks.',
    getHelp: 'You cannot find the pest, or the film returns after the leaves are cleaned.',
  },
  {
    id: 'nitrogen',
    name: 'Nitrogen deficiency',
    kind: 'deficiency',
    signs: ['Lower leaves yellowing evenly', 'Slow or stunted growth', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Nitrogen is moved to new growth, so the oldest, lowest leaves turn evenly pale yellow first and growth slows.',
    treatment: [
      'Feed with a balanced liquid fertiliser at half the label strength.',
      'Repeat every 2 to 4 weeks in spring and summer.',
      'Refresh the potting mix if it is more than 1 to 2 years old, and check the plant is not root-bound.',
      'Do not feed more than the label says.',
    ],
    prevention: ['Feed regularly during the growing season, not in winter.', 'Repot into fresh mix every 1 to 2 years.', 'Water properly, since overwatering stops roots taking up nutrients.'],
    monitor: 'Look for healthy green new growth within 3 to 4 weeks. Leaves that have already turned yellow will not recover.',
    getHelp: 'Growth has not improved after 6 weeks of feeding. Check the roots for rot and the leaves for pests.',
  },
  {
    id: 'phosphorus',
    name: 'Phosphorus deficiency',
    kind: 'deficiency',
    signs: ['Purple or reddish tinge on leaves', 'Slow or stunted growth', 'Few or no flowers', 'Leaves dropping'],
    about: 'Dark green leaves with a purple or reddish tinge, stunted growth and few flowers. Cold roots can cause the same signs.',
    treatment: [
      'Make sure the roots are warm, ideally above 15 C.',
      'Feed with a fertiliser with a higher middle number (phosphorus), such as a bloom booster, at the label dose.',
      'Mix bone meal into the top of the soil as a slow organic option.',
    ],
    prevention: ['Use a balanced fertiliser in the growing season.', 'Keep plants away from cold windows and floors.', 'Keep soil pH near neutral for most houseplants.'],
    monitor: 'New growth should come in green within 4 weeks. Check again after warming the plant.',
    getHelp: 'The purple tinge keeps spreading after the plant is warmed and fed.',
  },
  {
    id: 'potassium',
    name: 'Potassium deficiency',
    kind: 'deficiency',
    signs: ['Yellow or brown edges on older leaves', 'Brown leaf tips', 'Few or no flowers', 'Slow or stunted growth'],
    about: 'Older leaves get yellow, then brown, scorched-looking edges. Stems are weak and flowering and fruiting are poor.',
    treatment: [
      'Feed with a fertiliser with a higher last number (potassium), such as a tomato or flowering feed, at the label dose.',
      'Trim leaves that are mostly scorched.',
      'Water evenly, since dry spells reduce uptake.',
    ],
    prevention: ['Feed with a balanced fertiliser in the growing season.', 'Avoid very sandy or very old soil.', 'Do not let the plant dry out completely and often.'],
    monitor: 'Look at new leaves for clean, green edges over 4 to 6 weeks.',
    getHelp: 'Edges keep browning after feeding. Check for salt build-up and dry air, which look similar.',
  },
  {
    id: 'magnesium',
    name: 'Magnesium deficiency',
    kind: 'deficiency',
    signs: ['Yellowing between veins on older leaves', 'Yellowing leaves', 'Leaves dropping'],
    about: 'Older leaves turn yellow between the veins while the veins stay green, often in a herringbone pattern.',
    treatment: [
      'Dissolve 1 teaspoon of Epsom salts (magnesium sulfate) in 1 litre of water and water it in once.',
      'Check the result after 4 weeks before repeating.',
      'Use a fertiliser that includes magnesium.',
    ],
    prevention: ['Use a complete fertiliser that lists magnesium.', 'Avoid overfeeding with potassium, which blocks magnesium.', 'Flush the soil now and then.'],
    monitor: 'New leaves should come in with even green colour. Do not repeat Epsom salts more than every 4 weeks.',
    getHelp: 'Yellowing continues after two treatments. Check watering and roots.',
  },
  {
    id: 'iron',
    name: 'Iron deficiency',
    kind: 'deficiency',
    signs: ['Yellowing between veins on new leaves', 'Yellowing leaves', 'Slow or stunted growth'],
    about: 'Young leaves turn pale yellow between green veins. It is often caused by soil that is too alkaline or too wet, not by a lack of iron in the soil.',
    treatment: [
      'Check the watering first. Waterlogged roots cannot take up iron.',
      'Feed with a chelated iron product, following the label.',
      'For acid-loving plants such as azaleas, gardenias and hydrangeas, repot in an acidic mix.',
      'Use rainwater or filtered water if your tap water is hard.',
    ],
    prevention: ['Use the right soil for the plant, acidic for acid-loving ones.', 'Avoid overwatering.', 'Use rainwater or filtered water on sensitive plants.'],
    monitor: 'New leaves should come in greener within 4 to 6 weeks. Older yellow leaves will not recover.',
    getHelp: 'New growth stays yellow after correcting the soil and watering. Consider a soil pH test.',
  },
  {
    id: 'calcium',
    name: 'Calcium deficiency',
    kind: 'deficiency',
    signs: ['Dying growing tips', 'Curled or distorted new growth', 'Slow or stunted growth'],
    about: 'New growth is distorted, with scorched or dying tips, because calcium cannot move from older leaves. Uneven watering is a common cause.',
    treatment: [
      'Water evenly, since irregular watering stops calcium moving to new growth.',
      'Use a fertiliser that includes calcium, or a calcium supplement, following the label.',
      'Remove badly damaged new growth.',
    ],
    prevention: ['Keep a steady watering routine.', 'Do not use only softened or distilled water.', 'Avoid very acidic soil unless the plant needs it.'],
    monitor: 'Check new leaves for normal shape over 4 to 6 weeks. Damaged tissue will not heal.',
    getHelp: 'New growth keeps dying back. Check for pests such as thrips, which cause similar damage.',
  },
  {
    id: 'overfertilising',
    name: 'Fertiliser build-up (overfeeding)',
    kind: 'care',
    signs: ['White crust on soil or pot rim', 'Brown leaf tips', 'Yellowing leaves', 'Leaves dropping', 'Wilting despite moist soil'],
    about: 'Too much fertiliser leaves salts in the soil that burn roots and leaf edges. It can look like a deficiency, so do not feed more until you have ruled it out.',
    treatment: [
      'Stop fertilising for 6 to 8 weeks.',
      'Scrape off any white crust from the soil surface and pot rim.',
      'Flush the soil with plain water, using about 3 times the pot volume, and let it drain fully.',
      'Trim burnt leaf tips, and repot in fresh mix if the plant is badly affected.',
    ],
    prevention: ['Dilute fertiliser to half the label strength.', 'Never feed a dry or stressed plant.', 'Flush the soil with plain water every 3 months.'],
    monitor: 'New growth should look healthy within 4 to 6 weeks. Resume feeding at half strength after that.',
    getHelp: 'The plant keeps declining after flushing and repotting. Check the roots for rot.',
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
    prevention: ['Water on a steady routine.', 'Use rainwater or filtered water on sensitive plants.', 'Keep away from drafts, heaters and air conditioning.'],
    monitor: 'New leaves should grow without brown tips. Trim the old brown tips with clean scissors if they bother you.',
    getHelp: 'New leaves keep browning after you fix watering and humidity. Check for fertiliser build-up.',
  },
]

export function findProblem(name) {
  return PROBLEMS.find((problem) => problem.name === name) ?? null
}

// Ranks problems by how many of the chosen symptoms they share. A guide only, not a diagnosis.
export function matchProblems(symptoms, limit = 3, kinds = null) {
  if (!symptoms || symptoms.length === 0) return []
  return PROBLEMS
    .filter((problem) => !kinds || kinds.includes(problem.kind))
    .map((problem) => {
      const matched = problem.signs.filter((sign) => symptoms.includes(sign))
      return { problem, matched, score: matched.length / problem.signs.length }
    })
    .filter((match) => match.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length || b.score - a.score || a.problem.name.localeCompare(b.problem.name))
    .slice(0, limit)
}
