-- Plant Care Notes: sample plants to try the app with.
--
-- Run this after supabase/schema.sql: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it puts the ten demo plants back exactly as written below and touches
-- nothing else.
--
-- Where the data goes: the account demo@example.com if that account exists, otherwise the earliest
-- account in the project. Register in the app first (any address works), confirm the address, then
-- run this file. Every row it adds has an id that starts with "seed-", so it is easy to spot and
-- remove. Photos are left empty on purpose: they are added from a device.

-- ---------------------------------------------------------------------------------------------------
-- Check the setup is ready
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.plants') is null then
    raise exception 'The plants table is missing. Run supabase/schema.sql first, then this file';
  end if;
  if not exists (select 1 from auth.users) then
    raise exception 'There is no account yet. Register in the app (for example demo@example.com), confirm the address, then run this file again';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Ten plants: care notes, watering schedules, care profiles and problems to work through.
-- The shapes match what the app writes (see src/storage.js and src/PlantForm.jsx).
-- ---------------------------------------------------------------------------------------------------

insert into public.plants (user_id, id, data, updated_at)
select account.id, plant.id, plant.data, plant.updated_at
from (
  values
    ('seed-monstera', '2026-10-02T09:14:00Z'::timestamptz, '{
  "id": "seed-monstera",
  "name": "Monstera",
  "careNote": "New leaf unfurling by the window. Turn the pot a quarter each watering so it grows evenly.",
  "recommendations": ["Bright indirect light", "Water when the top inch of soil is dry", "Wipe the leaves to remove dust"],
  "lastWatered": "2026-10-02",
  "waterEveryDays": 7,
  "photo": "",
  "issues": [
    {
      "id": "seed-issue-monstera-mealybugs",
      "date": "2026-09-21",
      "photo": "",
      "symptoms": ["Cottony white clumps", "Sticky residue on leaves"],
      "suspected": "Mealybugs",
      "notes": "White clumps in the leaf joints after the plant came back indoors. Treated the same day.",
      "resolved": true,
      "stepsDone": [
        "Isolate the plant.",
        "Dab each insect with a cotton swab dipped in 70% isopropyl alcohol.",
        "Follow up with insecticidal soap.",
        "Repeat weekly until none are left, and check the roots."
      ]
    }
  ],
  "careProfile": {
    "scientificName": "Monstera deliciosa",
    "light": "Bright indirect light; some gentle morning sun is fine.",
    "water": "Water when the top 2 to 3 cm of soil is dry, then drain the saucer.",
    "humidity": "Likes average to high humidity; wipe the leaves if the air is dry.",
    "temperature": "18 to 27 C; keep away from cold drafts.",
    "soil": "Light, well-draining mix with perlite and bark.",
    "fertiliser": "Feed monthly in spring and summer, none in winter.",
    "petSafety": "Toxic to cats and dogs if chewed; keep out of reach."
  },
  "createdAt": "2026-09-16T10:24:00.000Z"
}'::jsonb),
    ('seed-snake-plant', '2026-09-24T07:50:00Z'::timestamptz, '{
  "id": "seed-snake-plant",
  "name": "Snake Plant",
  "careNote": "The toughest plant in the room. Almost forgotten on purpose; the roots hate sitting in wet soil.",
  "recommendations": ["Low light is fine", "Let the soil dry out between waterings", "Water less in winter"],
  "lastWatered": "2026-09-24",
  "waterEveryDays": 21,
  "photo": "",
  "issues": [],
  "careProfile": {
    "scientificName": "Dracaena trifasciata",
    "light": "Tolerates low light; grows faster in bright, indirect light.",
    "water": "Let the soil dry out completely between waterings.",
    "humidity": "Any humidity; it does not mind dry air.",
    "temperature": "15 to 27 C; avoid temperatures below 10 C.",
    "soil": "Sharp, free-draining mix; a cactus compost works well.",
    "fertiliser": "Feed lightly once a month in spring and summer.",
    "petSafety": "Mildly toxic to cats and dogs if eaten."
  },
  "createdAt": "2026-09-16T10:31:00.000Z"
}'::jsonb),
    ('seed-peace-lily', '2026-10-04T19:22:00Z'::timestamptz, '{
  "id": "seed-peace-lily",
  "name": "Peace Lily",
  "careNote": "Droops when thirsty and perks up within hours of watering. Stand it out of direct sun.",
  "recommendations": ["Keep the soil evenly moist", "Mist the leaves regularly", "Low light is fine"],
  "lastWatered": "2026-10-04",
  "waterEveryDays": 5,
  "photo": "",
  "issues": [
    {
      "id": "seed-issue-peace-lily-root-rot",
      "date": "2026-10-04",
      "photo": "",
      "symptoms": ["Wilting despite moist soil", "Yellowing leaves"],
      "suspected": "Root rot",
      "notes": "Watered on Sunday but three lower leaves are still drooping and yellow. The soil feels wet two inches down, so the pot may be holding too much water.",
      "resolved": false,
      "stepsDone": ["Take the plant out of its pot and check the roots. Healthy ones are firm and pale."]
    }
  ],
  "careProfile": {
    "scientificName": "Spathiphyllum wallisii",
    "light": "Happy in low to medium light; keep it out of direct sun.",
    "water": "Water when the top inch of soil is dry; do not let it stand in water.",
    "humidity": "Likes humidity; mist the leaves or stand the pot on a pebble tray.",
    "temperature": "18 to 27 C; keep away from cold drafts and radiators.",
    "soil": "Well-draining compost that holds some moisture.",
    "fertiliser": "Feed every second month in spring and summer.",
    "petSafety": "Toxic to cats and dogs if eaten."
  },
  "createdAt": "2026-09-18T18:05:00.000Z"
}'::jsonb),
    ('seed-maidenhair-fern', '2026-10-03T08:05:00Z'::timestamptz, '{
  "id": "seed-maidenhair-fern",
  "name": "Maidenhair Fern",
  "careNote": "Loves steam: stand it near the bathroom door and never let it dry right out.",
  "recommendations": ["Prefers high humidity", "Mist the leaves regularly", "Keep the soil evenly moist"],
  "lastWatered": "2026-10-03",
  "waterEveryDays": 3,
  "photo": "",
  "issues": [
    {
      "id": "seed-issue-fern-fungus-gnats",
      "date": "2026-09-29",
      "photo": "",
      "symptoms": ["Tiny flying insects", "Wilting despite moist soil"],
      "suspected": "Fungus gnats",
      "notes": "Tiny flies rise from the soil whenever the pot is moved. They appeared about a week after repotting into a mix that stayed too wet.",
      "resolved": false,
      "stepsDone": []
    }
  ],
  "careProfile": {
    "scientificName": "Adiantum raddianum",
    "light": "Medium, indirect light; direct sun scorches the fronds.",
    "water": "Keep the soil lightly moist; never let it dry right out.",
    "humidity": "Needs high humidity; mist daily or stand in a steamy bathroom.",
    "temperature": "16 to 24 C; sensitive to cold drafts.",
    "soil": "Loose, moisture-retaining mix with perlite.",
    "fertiliser": "Feed at half strength monthly in spring and summer.",
    "petSafety": "Non-toxic to cats and dogs."
  },
  "createdAt": "2026-09-20T12:40:00.000Z"
}'::jsonb),
    ('seed-pothos', '2026-09-30T18:40:00Z'::timestamptz, '{
  "id": "seed-pothos",
  "name": "Golden Pothos",
  "careNote": "Trailing over the bookshelf. Trim the long runners in spring to keep it bushy.",
  "recommendations": ["Water weekly", "Bright indirect light", "Prune dead or yellow leaves"],
  "lastWatered": "2026-09-30",
  "waterEveryDays": 7,
  "photo": "",
  "issues": [],
  "careProfile": {
    "scientificName": "Epipremnum aureum",
    "light": "Bright indirect light; tolerates lower light but grows slower.",
    "water": "Water when the top inch of soil is dry.",
    "humidity": "Any humidity; it does not mind dry air.",
    "temperature": "17 to 29 C; keep away from cold drafts.",
    "soil": "Standard potting mix with perlite for drainage.",
    "fertiliser": "Feed monthly in spring and summer.",
    "petSafety": "Toxic to cats and dogs if eaten."
  },
  "createdAt": "2026-09-21T08:12:00.000Z"
}'::jsonb),
    ('seed-aloe', '2026-09-26T17:10:00Z'::timestamptz, '{
  "id": "seed-aloe",
  "name": "Aloe Vera",
  "careNote": "Sunny windowsill plant. The gel in the leaves is used for small burns; keep it out of harsh midday sun in summer.",
  "recommendations": ["Bright direct light", "Let the soil dry out between waterings", "Well-draining soil"],
  "lastWatered": "2026-09-19",
  "waterEveryDays": 14,
  "photo": "",
  "issues": [
    {
      "id": "seed-issue-aloe-unidentified",
      "date": "2026-09-26",
      "photo": "",
      "symptoms": [],
      "suspected": "",
      "notes": "Two lower leaves turned pale and papery after the pot was moved away from the window. Not sure whether this is age or too much water, so keeping an eye on it.",
      "resolved": false,
      "stepsDone": []
    }
  ],
  "careProfile": {
    "scientificName": "Aloe vera",
    "light": "Bright direct light; a sunny windowsill is ideal.",
    "water": "Let the soil dry out completely between waterings; water less in winter.",
    "humidity": "Any humidity; it does not mind dry air.",
    "temperature": "13 to 27 C; keep above 10 C.",
    "soil": "Sharp, free-draining cactus mix in a pot with drainage holes.",
    "fertiliser": "Feed once in spring and once in summer, at half strength.",
    "petSafety": "Mildly toxic to cats and dogs if eaten."
  },
  "createdAt": "2026-09-22T16:45:00.000Z"
}'::jsonb),
    ('seed-calathea', '2026-10-04T09:15:00Z'::timestamptz, '{
  "id": "seed-calathea",
  "name": "Calathea",
  "careNote": "Folds its leaves up at night. Rainwater or filtered water keeps the edges from going brown.",
  "recommendations": ["Prefers high humidity", "Keep the soil evenly moist", "Mist the leaves regularly"],
  "lastWatered": "2026-10-04",
  "waterEveryDays": 4,
  "photo": "",
  "issues": [
    {
      "id": "seed-issue-calathea-leaf-spot",
      "date": "2026-10-02",
      "photo": "",
      "symptoms": ["Brown or black spots on leaves"],
      "suspected": "Leaf spot (fungal or bacterial)",
      "notes": "Brown spots with yellow rings on two older leaves after the pot stood in water for a few days.",
      "resolved": false,
      "stepsDone": [
        "Remove affected leaves and bin them.",
        "Water the soil, not the leaves, and avoid misting."
      ]
    }
  ],
  "careProfile": {
    "scientificName": "Calathea orbifolia",
    "light": "Medium, indirect light; direct sun fades the pattern.",
    "water": "Keep the soil evenly moist with rainwater or filtered water.",
    "humidity": "Loves high humidity; mist the leaves or use a pebble tray.",
    "temperature": "18 to 24 C; sensitive to cold drafts and heating vents.",
    "soil": "Light, peat-free mix that stays slightly moist.",
    "fertiliser": "Feed monthly at half strength in spring and summer.",
    "petSafety": "Non-toxic to cats and dogs."
  },
  "createdAt": "2026-09-25T19:30:00.000Z"
}'::jsonb),
    ('seed-rubber-plant', '2026-09-28T08:20:00Z'::timestamptz, '{
  "id": "seed-rubber-plant",
  "name": "Rubber Plant",
  "careNote": "Wipe the glossy leaves monthly; they collect dust and the plant drops lower leaves if ignored.",
  "recommendations": ["Bright indirect light", "Wipe the leaves to remove dust", "Water when the top inch of soil is dry"],
  "lastWatered": "2026-09-28",
  "waterEveryDays": 7,
  "photo": "",
  "issues": [],
  "careProfile": {
    "scientificName": "Ficus elastica",
    "light": "Bright indirect light; some morning sun is fine.",
    "water": "Water when the top inch of soil is dry; empty the saucer afterwards.",
    "humidity": "Average humidity; wipe the leaves monthly.",
    "temperature": "16 to 24 C; keep away from cold drafts.",
    "soil": "Free-draining, loam-based compost.",
    "fertiliser": "Feed monthly in spring and summer.",
    "petSafety": "Mildly toxic to cats and dogs; the sap can irritate skin."
  },
  "createdAt": "2026-09-27T11:05:00.000Z"
}'::jsonb),
    ('seed-hoya', '2026-10-01T14:20:00Z'::timestamptz, '{
  "id": "seed-hoya",
  "name": "Hoya",
  "careNote": "Not watered yet since it came home; the nursery said to wait two weeks. Flowers on old wood, so do not cut the mature stems.",
  "recommendations": ["Bright direct light", "Water every 2 weeks", "Use a pot with drainage holes"],
  "lastWatered": "",
  "waterEveryDays": 14,
  "photo": "",
  "issues": [],
  "careProfile": {
    "scientificName": "Hoya carnosa",
    "light": "Bright indirect light; some gentle morning sun encourages flowers.",
    "water": "Water every 2 weeks; let the top of the mix dry out first.",
    "humidity": "Prefers higher humidity but copes with average air.",
    "temperature": "16 to 26 C; keep away from cold drafts.",
    "soil": "Very free-draining mix in a pot with drainage holes.",
    "fertiliser": "Feed monthly in spring and summer with a balanced feed.",
    "petSafety": "Non-toxic to cats and dogs."
  },
  "createdAt": "2026-10-01T14:20:00.000Z"
}'::jsonb),
    ('seed-kentia-palm', '2026-10-04T09:50:00Z'::timestamptz, '{
  "id": "seed-kentia-palm",
  "name": "Kentia Palm",
  "careNote": "Tall floor plant for the hall, bought at the Sunday market. Wipe the fronds monthly to keep the dust off.",
  "recommendations": [],
  "lastWatered": "2026-10-04",
  "waterEveryDays": 7,
  "photo": "",
  "issues": [],
  "careProfile": null,
  "createdAt": "2026-10-04T09:50:00.000Z"
}'::jsonb)
) as plant (id, updated_at, data)
-- The account the demo data belongs to: demo@example.com if it exists, otherwise the earliest one.
cross join (
  select coalesce(
    (select id from auth.users where lower(email) = 'demo@example.com'),
    (select id from auth.users order by created_at asc, id asc limit 1)
  ) as id
) account
on conflict (user_id, id)
do update set data = excluded.data, updated_at = excluded.updated_at;
