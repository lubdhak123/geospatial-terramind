/**
 * lib/diseaseData.ts
 *
 * Disease reference database.
 * Images are Google Image search queries — rendered via the DiseasePanel
 * component as clickable Unsplash/Google searches so no heavy assets
 * are stored locally.
 */

export type DiseaseKey =
  | 'rice_blast'
  | 'brown_spot'
  | 'bacterial_blight'
  | 'sheath_blight'
  | 'leaf_rust'
  | 'powdery_mildew'
  | 'root_rot'
  | 'none'

export interface DiseaseInfo {
  key: DiseaseKey
  name: string
  emoji: string
  /** Unsplash search term — used as ?query= param */
  imageQueries: string[]
  symptoms: string[]
  actions: string[]
  /** What environmental signals drive this disease */
  triggers: string[]
}

export const DISEASE_DB: Record<DiseaseKey, DiseaseInfo> = {
  rice_blast: {
    key: 'rice_blast',
    name: 'Rice Blast',
    emoji: '🍃',
    imageQueries: [
      'rice blast fungus leaf lesion',
      'Magnaporthe oryzae infected paddy leaf',
      'rice blast diamond shaped spots',
    ],
    symptoms: [
      'Diamond-shaped grey/white spots on leaves',
      'Lesion edges turn brown or reddish',
      'Leaf tips dying from tip downward',
      'Reduced grain formation in severe cases',
    ],
    actions: [
      'Apply Tricyclazole 0.6 g/L spray immediately',
      'Follow with Propiconazole 0.1% after 5 days',
      'Maintain 2 cm standing water in field',
      'Avoid excess nitrogen fertiliser — it accelerates spread',
      'Re-scout field in 5–7 days',
    ],
    triggers: [
      'High humidity (>80%) for 3+ consecutive days',
      'Low NDVI drop indicating leaf stress',
      'Temperature between 24–28°C',
      'Dense crop canopy trapping moisture',
    ],
  },

  brown_spot: {
    key: 'brown_spot',
    name: 'Brown Spot',
    emoji: '🟤',
    imageQueries: [
      'rice brown spot disease leaf',
      'Bipolaris oryzae brown oval lesions rice',
      'brown spot fungal infection paddy',
    ],
    symptoms: [
      'Small circular to oval brown spots on leaves',
      'Spots have yellow halo around them',
      'Grains can also show brown discolouration',
      'Affected leaves dry out and die prematurely',
    ],
    actions: [
      'Apply Mancozeb 2.5 g/L as foliar spray',
      'Ensure balanced potassium nutrition (> 120 kg/ha)',
      'Improve drainage to reduce leaf wetness duration',
      'Spray in early morning for better absorption',
    ],
    triggers: [
      'Potassium or silicon deficiency in soil',
      'Moisture stress followed by waterlogging',
      'Poor soil nutrition — low organic carbon',
      'High temperatures (28–34°C) with humidity spikes',
    ],
  },

  bacterial_blight: {
    key: 'bacterial_blight',
    name: 'Bacterial Blight',
    emoji: '⚡',
    imageQueries: [
      'bacterial blight rice yellowing leaves Xanthomonas',
      'rice bacterial blight leaf scorch',
      'kresek symptom bacterial blight paddy',
    ],
    symptoms: [
      'Water-soaked stripe along leaf margins',
      'Leaf edges turn yellow then dry straw-like',
      'Milky or yellow bacterial ooze on cut stem',
      'Severe cases: entire plant wilts (kresek stage)',
    ],
    actions: [
      'Remove and burn severely infected plants',
      'Spray Copper Oxychloride 3 g/L as protective measure',
      'Avoid high nitrogen — it worsens bacterial spread',
      'Drain flooded fields to reduce water-borne spread',
      'Do NOT use infected seeds for next season',
    ],
    triggers: [
      'Wind-driven rain spreading bacteria leaf to leaf',
      'Waterlogging and flooding events',
      'Very high humidity >85% sustained',
      'Wounds from storms or insects providing entry points',
    ],
  },

  sheath_blight: {
    key: 'sheath_blight',
    name: 'Sheath Blight',
    emoji: '🌿',
    imageQueries: [
      'sheath blight rice Rhizoctonia solani lesions',
      'rice sheath blight disease lower stem',
      'sheath blight greenish grey lesions paddy',
    ],
    symptoms: [
      'Greenish-grey oval lesions on leaf sheath near waterline',
      'Lesions spread upward toward flag leaf',
      'Centre of lesion turns white-grey with brown border',
      'Stems lodge (fall over) in severe infection',
    ],
    actions: [
      'Apply Hexaconazole 2 mL/L or Validamycin 2 mL/L',
      'Reduce plant density — increase row spacing next season',
      'Drain standing water to reduce fungal spread',
      'Apply fungicide at early tillering before lesions rise above waterline',
    ],
    triggers: [
      'Dense canopy from high nitrogen and close planting',
      'Standing water enabling fungal sclerotia to float',
      'High temperatures (28–32°C) with high humidity',
      'Low silicon status in soil',
    ],
  },

  leaf_rust: {
    key: 'leaf_rust',
    name: 'Leaf Rust',
    emoji: '🔴',
    imageQueries: [
      'wheat leaf rust orange pustules Puccinia',
      'crop leaf rust fungal disease orange spots',
      'leaf rust disease cereal crop close up',
    ],
    symptoms: [
      'Orange-red powdery pustules on upper leaf surface',
      'Pustules rupture and release rust-coloured spores',
      'Leaves yellow and dry around pustules',
      'Grain shrivelling in severe infection',
    ],
    actions: [
      'Apply Propiconazole 1 mL/L at first pustule sighting',
      'Follow with Tebuconazole 1.5 mL/L after 10 days',
      'Use rust-resistant varieties in next season',
      'Destroy volunteer crop and alternative hosts nearby',
    ],
    triggers: [
      'Cool nights (10–15°C) with warm days enabling spore spread',
      'Dew or high humidity providing moisture for germination',
      'Susceptible variety under nitrogen stress',
      'Spore-carrying wind from infected areas',
    ],
  },

  powdery_mildew: {
    key: 'powdery_mildew',
    name: 'Powdery Mildew',
    emoji: '⬜',
    imageQueries: [
      'powdery mildew white fungal coating leaf',
      'crop powdery mildew disease close up',
      'white powdery coating mildew infected leaf',
    ],
    symptoms: [
      'White powdery coating on upper leaf surface',
      'Affected tissue turns yellow then brown',
      'Young leaves and shoots most affected',
      'Plant growth slows, yield reduced',
    ],
    actions: [
      'Apply Sulphur-based fungicide (Wettable Sulphur 3 g/L)',
      'Spray Carbendazim 1 g/L as systemic treatment',
      'Improve air circulation — avoid over-crowding',
      'Avoid excess nitrogen which promotes soft growth',
    ],
    triggers: [
      'Dry weather with moderate humidity (60–80%)',
      'High nitrogen producing lush susceptible growth',
      'Poor air circulation in dense canopy',
      'Temperature between 20–27°C favouring fungal growth',
    ],
  },

  root_rot: {
    key: 'root_rot',
    name: 'Root Rot',
    emoji: '🪱',
    imageQueries: [
      'root rot diseased crop roots dark brown',
      'fungal root rot plant wilting disease',
      'waterlogged root rot crop damage',
    ],
    symptoms: [
      'Yellowing and wilting of lower leaves first',
      'Roots appear dark brown, soft, and water-soaked',
      'Plant pulls out of soil easily — no healthy root system',
      'Stunted growth, poor tillering',
    ],
    actions: [
      'Improve drainage immediately — reduce waterlogging',
      'Apply Trichoderma viride bio-fungicide to soil',
      'Drench with Metalaxyl + Mancozeb 2.5 g/L',
      'Avoid excessive irrigation for next 2 weeks',
      'Add compost to improve soil aeration',
    ],
    triggers: [
      'Prolonged waterlogging (>5 days) depriving roots of oxygen',
      'High moisture with warm soil temperature (>28°C)',
      'Compacted soil (high bulk density) restricting drainage',
      'Previous crop residues harbouring Pythium/Phytophthora',
    ],
  },

  none: {
    key: 'none',
    name: 'No Disease Detected',
    emoji: '✅',
    imageQueries: [],
    symptoms: [],
    actions: [
      'Continue current crop management practices',
      'Monitor field weekly for early signs',
      'Maintain balanced nutrition to keep plants healthy',
    ],
    triggers: [],
  },
}
