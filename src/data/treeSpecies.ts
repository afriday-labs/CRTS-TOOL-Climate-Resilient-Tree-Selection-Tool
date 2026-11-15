export type DroughtTolerance = 'Low' | 'Med' | 'High';

export type FoliageType = 'Deciduous' | 'Evergreen' | 'Conifer';

export type ResilienceStatus = 'Fully Resilient' | 'Borderline' | 'Unsuited';

export type DroughtStressIndex = 'Low' | 'Moderate' | 'Severe';

export type RecordConfidenceLevel = 'Low' | 'Medium' | 'Good';

export type MatRiskScore = 0 | 1 | 2 | 3;

export interface TreeSpecies {
  id: string;
  speciesName: string;
  commonName: string;
  nativeRegion: string;
  usdaZoneMin: number;
  usdaZoneMax: number;
  ukHardiness: 'H3' | 'H4' | 'H5' | 'H6' | 'H7';
  droughtTolerance: DroughtTolerance;
  maxTempC: number;
  minWinterTempC: number;
  soilPreference: string;
  foliageType: FoliageType;
  canopyHeightM: number;
  canopySpreadM: number;
  urbanTolerance: 'High' | 'Moderate' | 'Low';
  lat: number;
  lng: number;
  designNotes: string;
  recordsCount: number;
  ukRecordsCount?: number;
  matMinC: number;
  matOptimalMinC: number;
  matOptimalMaxC: number;
  matMaxC: number;
  matMedianC: number;
  annualPrecipMm: number;
  gbifSynced?: boolean;
}

export interface EvaluatedSpecies extends TreeSpecies {
  status: ResilienceStatus;
  thermalMarginC: number;
  reasons: string[];
  effectiveRecords: number;
  recordsLevel: RecordConfidenceLevel;
  effectiveMatC: number;
  matRiskNow: MatRiskScore;
  matRisk2050: MatRiskScore;
  matRisk2090: MatRiskScore;
}

export interface ClimatePreset {
  id: string;
  label: string;
  shortLabel?: string;
  climateSummary?: string;
  isUkLocation?: boolean;
  regionDetail: string;
  usdaZones: number[];
  ukZones: Array<'H3' | 'H4' | 'H5' | 'H6' | 'H7'>;
  summerMinC: number;
  summerMaxC: number;
  matC: number;
  droughtStress: DroughtStressIndex;
  lat: number;
  lng: number;
}

export const CLIMATE_PRESETS: ClimatePreset[] = [
  {
    id: 'london-uk',
    label: 'London (SE Urban)',
    shortLabel: 'London',
    climateSummary: 'SE Urban · 35°C · Moderate',
    isUkLocation: true,
    regionDetail: 'MAT 11.5°C · Urban Heat Island',
    usdaZones: [8, 9],
    ukZones: ['H4'],
    summerMinC: 24,
    summerMaxC: 35,
    matC: 11.5,
    droughtStress: 'Moderate',
    lat: 51.51,
    lng: -0.13,
  },
  {
    id: 'cambridge-uk',
    label: 'Cambridge (Dry East)',
    shortLabel: 'Cambridge',
    climateSummary: 'Dry East · 34°C · Moderate',
    isUkLocation: true,
    regionDetail: 'MAT 10.8°C · Low-Rainfall East Anglia',
    usdaZones: [8],
    ukZones: ['H5'],
    summerMinC: 23,
    summerMaxC: 34,
    matC: 10.8,
    droughtStress: 'Moderate',
    lat: 52.21,
    lng: 0.12,
  },
  {
    id: 'exeter-uk',
    label: 'Exeter (SW Maritime)',
    shortLabel: 'Exeter',
    climateSummary: 'SW Maritime · 31°C · Low',
    isUkLocation: true,
    regionDetail: 'MAT 11.1°C · Mild Oceanic Southwest',
    usdaZones: [9],
    ukZones: ['H4'],
    summerMinC: 21,
    summerMaxC: 31,
    matC: 11.1,
    droughtStress: 'Low',
    lat: 50.72,
    lng: -3.53,
  },
  {
    id: 'manchester-uk',
    label: 'Manchester (NW Wet)',
    shortLabel: 'Manchester',
    climateSummary: 'NW Pennine · 30°C · Low',
    isUkLocation: true,
    regionDetail: 'MAT 10.0°C · Cool Wet Northwest',
    usdaZones: [8],
    ukZones: ['H5'],
    summerMinC: 20,
    summerMaxC: 30,
    matC: 10.0,
    droughtStress: 'Low',
    lat: 53.48,
    lng: -2.24,
  },
  {
    id: 'edinburgh-uk',
    label: 'Edinburgh (East Scotland)',
    shortLabel: 'Edinburgh',
    climateSummary: 'E. Scotland · 28°C · Low',
    isUkLocation: true,
    regionDetail: 'MAT 9.0°C · Cool Maritime East',
    usdaZones: [7, 8],
    ukZones: ['H5'],
    summerMinC: 18,
    summerMaxC: 28,
    matC: 9.0,
    droughtStress: 'Low',
    lat: 55.95,
    lng: -3.19,
  },
  {
    id: 'inverness-uk',
    label: 'Inverness (Highlands)',
    shortLabel: 'Inverness',
    climateSummary: 'Highlands · 26°C · Low',
    isUkLocation: true,
    regionDetail: 'MAT 8.2°C · Northern Boreal Fringe',
    usdaZones: [7],
    ukZones: ['H6'],
    summerMinC: 17,
    summerMaxC: 26,
    matC: 8.2,
    droughtStress: 'Low',
    lat: 57.48,
    lng: -4.22,
  },
  {
    id: 'madrid-es',
    label: 'Madrid & Iberia',
    regionDetail: 'MAT 15.0°C · Arid Continental Summer',
    usdaZones: [9],
    ukZones: ['H4'],
    summerMinC: 31,
    summerMaxC: 42,
    matC: 15.0,
    droughtStress: 'Severe',
    lat: 40.42,
    lng: -3.7,
  },
  {
    id: 'boston-us',
    label: 'Boston & New England',
    regionDetail: 'MAT 10.7°C · Cold Winter / Warm Summer',
    usdaZones: [6, 7],
    ukZones: ['H6'],
    summerMinC: 26,
    summerMaxC: 36,
    matC: 10.7,
    droughtStress: 'Moderate',
    lat: 42.36,
    lng: -71.06,
  },
  {
    id: 'munich-de',
    label: 'Munich & Central Europe',
    regionDetail: 'MAT 9.1°C · Continental',
    usdaZones: [6, 7],
    ukZones: ['H6', 'H7'],
    summerMinC: 24,
    summerMaxC: 34,
    matC: 9.1,
    droughtStress: 'Moderate',
    lat: 48.14,
    lng: 11.58,
  },
  {
    id: 'phoenix-us',
    label: 'Phoenix & Sonoran Urban',
    regionDetail: 'MAT 22.0°C · Extreme Heat & Drought',
    usdaZones: [9, 10],
    ukZones: ['H3'],
    summerMinC: 37,
    summerMaxC: 45,
    matC: 22.0,
    droughtStress: 'Severe',
    lat: 33.45,
    lng: -112.07,
  },
];

export const USDA_ZONE_MIN_TEMP_C: Record<number, number> = {
  3: -40,
  4: -34,
  5: -29,
  6: -23,
  7: -18,
  8: -12,
  9: -7,
  10: -1,
  11: 4,
};

export const UK_HARDINESS_TO_USDA: Record<'H3' | 'H4' | 'H5' | 'H6' | 'H7', number[]> = {
  H3: [9, 10],
  H4: [8, 9],
  H5: [7, 8],
  H6: [5, 6],
  H7: [3, 4],
};

export const TREE_SPECIES_DATA: TreeSpecies[] = [
  // --- UK NATIVE BROADLEAVES ---
  {
    id: 'quercus-robur',
    speciesName: 'Quercus robur',
    commonName: 'English / Pedunculate Oak',
    nativeRegion: 'UK Native (England, Wales, Scotland, N. Ireland)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 35,
    minWinterTempC: -32,
    soilPreference: 'Clay-tolerant',
    foliageType: 'Deciduous',
    canopyHeightM: 30,
    canopySpreadM: 22,
    urbanTolerance: 'Moderate',
    lat: 52.1,
    lng: 1.5,
    recordsCount: 1719118,
    matMinC: 4,
    matOptimalMinC: 7,
    matOptimalMaxC: 12,
    matMaxC: 15,
    matMedianC: 9.6,
    annualPrecipMm: 860,
    designNotes: 'Keystone UK woodland oak supporting over 2,300 associated species; suffers under severe urban root compaction.',
  },
  {
    id: 'quercus-petraea',
    speciesName: 'Quercus petraea',
    commonName: 'Sessile Oak',
    nativeRegion: 'UK Native (Upland & Western Britain)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 36,
    minWinterTempC: -30,
    soilPreference: 'Acidic / Loamy',
    foliageType: 'Deciduous',
    canopyHeightM: 28,
    canopySpreadM: 18,
    urbanTolerance: 'Moderate',
    lat: 53.2,
    lng: -3.5,
    recordsCount: 412500,
    matMinC: 4,
    matOptimalMinC: 7,
    matOptimalMaxC: 12,
    matMaxC: 15,
    matMedianC: 9.3,
    annualPrecipMm: 980,
    designNotes: 'Slightly more drought-tolerant and better suited to upland acidic or free-draining rocky soils than Q. robur.',
  },
  {
    id: 'fagus-sylvatica',
    speciesName: 'Fagus sylvatica',
    commonName: 'European Beech',
    nativeRegion: 'UK Native (Southern & Central England, SE Wales)',
    usdaZoneMin: 5,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Low',
    maxTempC: 31,
    minWinterTempC: -27,
    soilPreference: 'Well-drained Loam',
    foliageType: 'Deciduous',
    canopyHeightM: 28,
    canopySpreadM: 20,
    urbanTolerance: 'Low',
    lat: 51.3,
    lng: -0.9,
    recordsCount: 684200,
    matMinC: 5,
    matOptimalMinC: 7,
    matOptimalMaxC: 11,
    matMaxC: 14,
    matMedianC: 9.1,
    annualPrecipMm: 940,
    designNotes: 'Shallow root system is highly vulnerable to soil compaction, summer drought, and bark sunscald above 31°C.',
  },
  {
    id: 'betula-pendula',
    speciesName: 'Betula pendula',
    commonName: 'Silver Birch',
    nativeRegion: 'UK Native (Widespread Great Britain & N. Ireland)',
    usdaZoneMin: 3,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Low',
    maxTempC: 30,
    minWinterTempC: -38,
    soilPreference: 'Acidic / Loamy',
    foliageType: 'Deciduous',
    canopyHeightM: 18,
    canopySpreadM: 10,
    urbanTolerance: 'Moderate',
    lat: 54.4,
    lng: -2.6,
    recordsCount: 924100,
    matMinC: 3,
    matOptimalMinC: 5,
    matOptimalMaxC: 10,
    matMaxC: 13,
    matMedianC: 7.4,
    annualPrecipMm: 880,
    designNotes: 'Boreal pioneer species thriving in cool northern zones; declines rapidly in prolonged warm-summer drought stress.',
  },
  {
    id: 'betula-pubescens',
    speciesName: 'Betula pubescens',
    commonName: 'Downy Birch',
    nativeRegion: 'UK Native (Northern & Western Britain, Peatlands)',
    usdaZoneMin: 2,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Low',
    maxTempC: 29,
    minWinterTempC: -42,
    soilPreference: 'Moist / Alluvial',
    foliageType: 'Deciduous',
    canopyHeightM: 16,
    canopySpreadM: 9,
    urbanTolerance: 'Low',
    lat: 56.8,
    lng: -4.1,
    recordsCount: 512000,
    matMinC: 2,
    matOptimalMinC: 4,
    matOptimalMaxC: 9,
    matMaxC: 12,
    matMedianC: 6.4,
    annualPrecipMm: 1020,
    designNotes: 'Tolerates wet peat and cold northern uplands better than B. pendula, but is unsuited to hot dry sites.',
  },
  {
    id: 'sorbus-aucuparia',
    speciesName: 'Sorbus aucuparia',
    commonName: 'Rowan / Mountain Ash',
    nativeRegion: 'UK Native (Upland & Widespread UK)',
    usdaZoneMin: 3,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Low',
    maxTempC: 29,
    minWinterTempC: -38,
    soilPreference: 'Acidic / Loamy',
    foliageType: 'Deciduous',
    canopyHeightM: 12,
    canopySpreadM: 7,
    urbanTolerance: 'Moderate',
    lat: 57.1,
    lng: -4.2,
    recordsCount: 845300,
    matMinC: 2,
    matOptimalMinC: 4,
    matOptimalMaxC: 9,
    matMaxC: 12,
    matMedianC: 6.9,
    annualPrecipMm: 1050,
    designNotes: 'Upland ecological tree suited to cool maritime or boreal settings; replace with Sorbus aria in warmer urban cores.',
  },
  {
    id: 'sorbus-aria',
    speciesName: 'Sorbus aria',
    commonName: 'Common Whitebeam',
    nativeRegion: 'UK Native (Chalk & Limestone Downs, S. England)',
    usdaZoneMin: 5,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'High',
    maxTempC: 37,
    minWinterTempC: -26,
    soilPreference: 'Chalk / Alkaline',
    foliageType: 'Deciduous',
    canopyHeightM: 14,
    canopySpreadM: 9,
    urbanTolerance: 'High',
    lat: 51.2,
    lng: -0.4,
    recordsCount: 44600,
    matMinC: 6,
    matOptimalMinC: 8,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 10.8,
    annualPrecipMm: 820,
    designNotes: 'White felted leaf undersides reflect heat and tolerate dry chalk downland and exposed urban streetscapes.',
  },
  {
    id: 'sorbus-torminalis',
    speciesName: 'Sorbus torminalis',
    commonName: 'Wild Service Tree',
    nativeRegion: 'UK Native (Ancient Woodlands, England & Wales)',
    usdaZoneMin: 5,
    usdaZoneMax: 9,
    ukHardiness: 'H6',
    droughtTolerance: 'High',
    maxTempC: 38,
    minWinterTempC: -24,
    soilPreference: 'Clay-tolerant',
    foliageType: 'Deciduous',
    canopyHeightM: 18,
    canopySpreadM: 12,
    urbanTolerance: 'High',
    lat: 51.0,
    lng: -0.2,
    recordsCount: 28700,
    matMinC: 6,
    matOptimalMinC: 9,
    matOptimalMaxC: 14,
    matMaxC: 17,
    matMedianC: 11.4,
    annualPrecipMm: 780,
    designNotes: 'Ancient woodland native with superior heat and drought tolerance; outstanding russet autumn foliage.',
  },
  {
    id: 'acer-campestre',
    speciesName: 'Acer campestre',
    commonName: 'Field Maple',
    nativeRegion: 'UK Native (England & Wales)',
    usdaZoneMin: 5,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 36,
    minWinterTempC: -27,
    soilPreference: 'Chalk / Alkaline',
    foliageType: 'Deciduous',
    canopyHeightM: 14,
    canopySpreadM: 10,
    urbanTolerance: 'High',
    lat: 51.8,
    lng: -1.1,
    recordsCount: 342600,
    matMinC: 5,
    matOptimalMinC: 8,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 10.4,
    annualPrecipMm: 810,
    designNotes: 'Compact UK native suited to chalky urban verges and moderate summer warming without excessive canopy bulk.',
  },
  {
    id: 'tilia-cordata',
    speciesName: 'Tilia cordata',
    commonName: 'Small-Leaved Lime',
    nativeRegion: 'UK Native (England & Wales Ancient Woods)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 35,
    minWinterTempC: -32,
    soilPreference: 'Well-drained Loam',
    foliageType: 'Deciduous',
    canopyHeightM: 22,
    canopySpreadM: 14,
    urbanTolerance: 'High',
    lat: 52.3,
    lng: -2.2,
    recordsCount: 262500,
    matMinC: 4,
    matOptimalMinC: 7,
    matOptimalMaxC: 11,
    matMaxC: 14,
    matMedianC: 8.8,
    annualPrecipMm: 860,
    designNotes: 'Pollinator-rich native boulevard tree; performs reliably in cool-to-temperate cities but suffers scorch under severe drought.',
  },
  {
    id: 'tilia-platyphyllos',
    speciesName: 'Tilia platyphyllos',
    commonName: 'Large-Leaved Lime',
    nativeRegion: 'UK Native (Limestone Woods, Wye Valley & N. England)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 36,
    minWinterTempC: -29,
    soilPreference: 'Chalk / Alkaline',
    foliageType: 'Deciduous',
    canopyHeightM: 26,
    canopySpreadM: 16,
    urbanTolerance: 'High',
    lat: 51.8,
    lng: -2.7,
    recordsCount: 118400,
    matMinC: 5,
    matOptimalMinC: 8,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 10.2,
    annualPrecipMm: 830,
    designNotes: 'Rarer UK native lime adapted to limestone gorges and calcareous loams; handles urban warmth slightly better than T. cordata.',
  },
  {
    id: 'carpinus-betulus',
    speciesName: 'Carpinus betulus',
    commonName: 'European Hornbeam',
    nativeRegion: 'UK Native (Southern & Eastern England, SE Wales)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 35,
    minWinterTempC: -30,
    soilPreference: 'Clay-tolerant',
    foliageType: 'Deciduous',
    canopyHeightM: 18,
    canopySpreadM: 12,
    urbanTolerance: 'High',
    lat: 51.7,
    lng: 0.2,
    recordsCount: 318900,
    matMinC: 5,
    matOptimalMinC: 8,
    matOptimalMaxC: 12,
    matMaxC: 15,
    matMedianC: 9.8,
    annualPrecipMm: 830,
    designNotes: 'Tolerates seasonal clay waterlogging and winter cold; upright cultivars work cleanly in restricted street profiles.',
  },
  {
    id: 'alnus-glutinosa',
    speciesName: 'Alnus glutinosa',
    commonName: 'Common Alder',
    nativeRegion: 'UK Native (Widespread Riparian & Wet Woodlands)',
    usdaZoneMin: 3,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Low',
    maxTempC: 33,
    minWinterTempC: -36,
    soilPreference: 'Moist / Alluvial',
    foliageType: 'Deciduous',
    canopyHeightM: 20,
    canopySpreadM: 11,
    urbanTolerance: 'Moderate',
    lat: 53.8,
    lng: -1.9,
    recordsCount: 584000,
    matMinC: 3,
    matOptimalMinC: 6,
    matOptimalMaxC: 11,
    matMaxC: 14,
    matMedianC: 8.6,
    annualPrecipMm: 940,
    designNotes: 'Nitrogen-fixing riparian tree ideal for SuDS detention basins and wet clays; struggles on dry chalk.',
  },
  {
    id: 'fraxinus-excelsior',
    speciesName: 'Fraxinus excelsior',
    commonName: 'European Ash',
    nativeRegion: 'UK Native (Widespread UK)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 34,
    minWinterTempC: -32,
    soilPreference: 'Chalk / Alkaline',
    foliageType: 'Deciduous',
    canopyHeightM: 28,
    canopySpreadM: 18,
    urbanTolerance: 'Moderate',
    lat: 52.8,
    lng: -1.1,
    recordsCount: 742000,
    matMinC: 4,
    matOptimalMinC: 7,
    matOptimalMaxC: 11,
    matMaxC: 14,
    matMedianC: 9.0,
    annualPrecipMm: 890,
    designNotes: 'Note: widespread Hymenoscyphus fraxineus (ash dieback) restricts UK planting; favour dieback-tolerant genotypes.',
  },
  {
    id: 'ulmus-glabra',
    speciesName: 'Ulmus glabra',
    commonName: 'Wych Elm',
    nativeRegion: 'UK Native (Northern & Western Britain, Uplands)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 33,
    minWinterTempC: -34,
    soilPreference: 'Well-drained Loam',
    foliageType: 'Deciduous',
    canopyHeightM: 26,
    canopySpreadM: 18,
    urbanTolerance: 'Moderate',
    lat: 54.9,
    lng: -2.4,
    recordsCount: 286400,
    matMinC: 3,
    matOptimalMinC: 6,
    matOptimalMaxC: 10,
    matMaxC: 14,
    matMedianC: 8.4,
    annualPrecipMm: 960,
    designNotes: 'Only undisputed native UK elm; suited to cool damp valleys and northern parks where Dutch elm disease pressure is lower.',
  },
  {
    id: 'crataegus-monogyna',
    speciesName: 'Crataegus monogyna',
    commonName: 'Common Hawthorn',
    nativeRegion: 'UK Native (Widespread Hedgerow & Scrub)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'High',
    maxTempC: 37,
    minWinterTempC: -30,
    soilPreference: 'Clay-tolerant',
    foliageType: 'Deciduous',
    canopyHeightM: 9,
    canopySpreadM: 7,
    urbanTolerance: 'High',
    lat: 51.9,
    lng: -0.9,
    recordsCount: 892000,
    matMinC: 4,
    matOptimalMinC: 7,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 9.8,
    annualPrecipMm: 800,
    designNotes: 'Resilient small wildlife tree thriving in wind, salt, clay, and dry urban verges across the UK.',
  },
  {
    id: 'corylus-avellana',
    speciesName: 'Corylus avellana',
    commonName: 'Common Hazel',
    nativeRegion: 'UK Native (Widespread Woodland Understory)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 35,
    minWinterTempC: -29,
    soilPreference: 'Well-drained Loam',
    foliageType: 'Deciduous',
    canopyHeightM: 8,
    canopySpreadM: 7,
    urbanTolerance: 'Moderate',
    lat: 52.4,
    lng: -1.8,
    recordsCount: 645000,
    matMinC: 4,
    matOptimalMinC: 7,
    matOptimalMaxC: 12,
    matMaxC: 15,
    matMedianC: 9.4,
    annualPrecipMm: 870,
    designNotes: 'Multi-stem native coppice species for woodland edges, hedgerows, and urban biodiversity shelterbelts.',
  },
  {
    id: 'malus-sylvestris',
    speciesName: 'Malus sylvestris',
    commonName: 'Crab Apple',
    nativeRegion: 'UK Native (Woodland Edge & Hedgerows)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 35,
    minWinterTempC: -28,
    soilPreference: 'Clay-tolerant',
    foliageType: 'Deciduous',
    canopyHeightM: 9,
    canopySpreadM: 8,
    urbanTolerance: 'High',
    lat: 51.6,
    lng: -1.3,
    recordsCount: 164200,
    matMinC: 5,
    matOptimalMinC: 7,
    matOptimalMaxC: 12,
    matMaxC: 15,
    matMedianC: 9.7,
    annualPrecipMm: 820,
    designNotes: 'Compact spring-blossom UK native supporting urban pollinators and birds; adapts well to heavy clay and neutral loams.',
  },
  {
    id: 'prunus-avium',
    speciesName: 'Prunus avium',
    commonName: 'Wild Cherry / Gean',
    nativeRegion: 'UK Native (Widespread Woodland & Edge)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 36,
    minWinterTempC: -29,
    soilPreference: 'Well-drained Loam',
    foliageType: 'Deciduous',
    canopyHeightM: 20,
    canopySpreadM: 12,
    urbanTolerance: 'Moderate',
    lat: 51.4,
    lng: -0.8,
    recordsCount: 388000,
    matMinC: 5,
    matOptimalMinC: 8,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 10.1,
    annualPrecipMm: 820,
    designNotes: 'Early spring blossom and autumn colour for parks; shallow spreading roots prefer open turf over narrow paving.',
  },
  {
    id: 'prunus-padus',
    speciesName: 'Prunus padus',
    commonName: 'Bird Cherry',
    nativeRegion: 'UK Native (Northern England, Wales & Scotland)',
    usdaZoneMin: 3,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Low',
    maxTempC: 31,
    minWinterTempC: -38,
    soilPreference: 'Moist / Alluvial',
    foliageType: 'Deciduous',
    canopyHeightM: 14,
    canopySpreadM: 9,
    urbanTolerance: 'Moderate',
    lat: 55.9,
    lng: -3.2,
    recordsCount: 312000,
    matMinC: 2,
    matOptimalMinC: 5,
    matOptimalMaxC: 10,
    matMaxC: 13,
    matMedianC: 7.4,
    annualPrecipMm: 880,
    designNotes: 'Cold-hardy riparian cherry suited to Scottish and northern UK woodlands and cool damp valley sites.',
  },
  {
    id: 'salix-caprea',
    speciesName: 'Salix caprea',
    commonName: 'Goat Willow',
    nativeRegion: 'UK Native (Widespread Damp Woods & Scrub)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 34,
    minWinterTempC: -34,
    soilPreference: 'Moist / Alluvial',
    foliageType: 'Deciduous',
    canopyHeightM: 10,
    canopySpreadM: 7,
    urbanTolerance: 'High',
    lat: 53.1,
    lng: -1.5,
    recordsCount: 418000,
    matMinC: 3,
    matOptimalMinC: 6,
    matOptimalMaxC: 11,
    matMaxC: 14,
    matMedianC: 8.9,
    annualPrecipMm: 860,
    designNotes: 'Early-pollen pioneer willow thriving in wet hollows, SuDS margins, and disturbed urban brownfields; less thirsty than S. alba.',
  },
  {
    id: 'populus-tremula',
    speciesName: 'Populus tremula',
    commonName: 'European Aspen',
    nativeRegion: 'UK Native (Widespread, especially Scotland)',
    usdaZoneMin: 2,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 34,
    minWinterTempC: -42,
    soilPreference: 'Acidic / Loamy',
    foliageType: 'Deciduous',
    canopyHeightM: 20,
    canopySpreadM: 10,
    urbanTolerance: 'Moderate',
    lat: 57.3,
    lng: -4.0,
    recordsCount: 348000,
    matMinC: 2,
    matOptimalMinC: 5,
    matOptimalMaxC: 11,
    matMaxC: 14,
    matMedianC: 7.8,
    annualPrecipMm: 790,
    designNotes: 'Pioneer aspen hardy across Highland Scotland and cool upland woodlands; vigorous root suckers.',
  },
  {
    id: 'populus-nigra',
    speciesName: 'Populus nigra',
    commonName: 'Black Poplar',
    nativeRegion: 'UK Native (Lowland Floodplains, England & Wales)',
    usdaZoneMin: 4,
    usdaZoneMax: 8,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 37,
    minWinterTempC: -30,
    soilPreference: 'Moist / Alluvial',
    foliageType: 'Deciduous',
    canopyHeightM: 28,
    canopySpreadM: 16,
    urbanTolerance: 'Moderate',
    lat: 51.8,
    lng: -0.5,
    recordsCount: 118500,
    matMinC: 5,
    matOptimalMinC: 8,
    matOptimalMaxC: 14,
    matMaxC: 17,
    matMedianC: 10.7,
    annualPrecipMm: 780,
    designNotes: 'Rare UK floodplain native; tolerates summer warmth better than aspen when roots reach alluvial moisture.',
  },

  // --- UK NATIVE EVERGREENS & CONIFERS ---
  {
    id: 'ilex-aquifolium',
    speciesName: 'Ilex aquifolium',
    commonName: 'English Holly',
    nativeRegion: 'UK Native (Widespread Woodland Understory)',
    usdaZoneMin: 6,
    usdaZoneMax: 9,
    ukHardiness: 'H6',
    droughtTolerance: 'Med',
    maxTempC: 35,
    minWinterTempC: -20,
    soilPreference: 'Well-drained Loam',
    foliageType: 'Evergreen',
    canopyHeightM: 14,
    canopySpreadM: 8,
    urbanTolerance: 'High',
    lat: 51.4,
    lng: -1.6,
    recordsCount: 682400,
    matMinC: 6,
    matOptimalMinC: 8,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 10.3,
    annualPrecipMm: 890,
    designNotes: 'Shade-tolerant native broadleaf evergreen resilient to urban air pollution and moderate dry spells once established.',
  },
  {
    id: 'pinus-sylvestris',
    speciesName: 'Pinus sylvestris',
    commonName: 'Scots Pine',
    nativeRegion: 'UK Native (Scottish Highlands & Sandy Heaths)',
    usdaZoneMin: 2,
    usdaZoneMax: 7,
    ukHardiness: 'H7',
    droughtTolerance: 'Med',
    maxTempC: 33,
    minWinterTempC: -42,
    soilPreference: 'Sandy / Rocky',
    foliageType: 'Conifer',
    canopyHeightM: 24,
    canopySpreadM: 10,
    urbanTolerance: 'Moderate',
    lat: 57.1,
    lng: -3.7,
    recordsCount: 789400,
    matMinC: 2,
    matOptimalMinC: 5,
    matOptimalMaxC: 10,
    matMaxC: 13,
    matMedianC: 7.2,
    annualPrecipMm: 790,
    designNotes: 'Cold-hardy native evergreen pine suited to sandy heathland and northern parks; vulnerable to pests under southern heat.',
  },
  {
    id: 'taxus-baccata',
    speciesName: 'Taxus baccata',
    commonName: 'English Yew',
    nativeRegion: 'UK Native (Chalk Downs & Limestone Woods)',
    usdaZoneMin: 5,
    usdaZoneMax: 8,
    ukHardiness: 'H7',
    droughtTolerance: 'High',
    maxTempC: 36,
    minWinterTempC: -26,
    soilPreference: 'Chalk / Alkaline',
    foliageType: 'Conifer',
    canopyHeightM: 16,
    canopySpreadM: 12,
    urbanTolerance: 'High',
    lat: 51.2,
    lng: -0.3,
    recordsCount: 214500,
    matMinC: 5,
    matOptimalMinC: 7,
    matOptimalMaxC: 13,
    matMaxC: 16,
    matMedianC: 9.9,
    annualPrecipMm: 860,
    designNotes: 'Shade-tolerant native evergreen conifer thriving on chalk downs; intolerant of stagnant waterlogged soils.',
  },
];

export function classifyRecordConfidence(
  count: number | undefined,
  datasetMaxCount?: number
): RecordConfidenceLevel {
  if (count === undefined || !Number.isFinite(count) || count <= 0) return 'Low';
  if (datasetMaxCount !== undefined && datasetMaxCount <= 500) {
    if (count < 10) return 'Low';
    if (count < 25) return 'Medium';
    return 'Good';
  }
  if (count < 10000) return 'Low';
  if (count < 50000) return 'Medium';
  return 'Good';
}

export function getMatRiskScore(species: TreeSpecies, matC: number): MatRiskScore {
  if (matC >= species.matOptimalMinC && matC <= species.matOptimalMaxC) {
    return 3;
  }
  if (
    (matC >= species.matOptimalMinC - 1.8 && matC < species.matOptimalMinC) ||
    (matC > species.matOptimalMaxC && matC <= species.matOptimalMaxC + 1.5)
  ) {
    return 2;
  }
  if (matC >= species.matMinC && matC <= species.matMaxC) {
    return 1;
  }
  return 0;
}

const DROUGHT_RANK: Record<DroughtTolerance, number> = {
  Low: 1,
  Med: 2,
  High: 3,
};

const STRESS_REQUIRED_RANK: Record<DroughtStressIndex, number> = {
  Low: 1,
  Moderate: 2,
  Severe: 3,
};

export function evaluateSpeciesResilience(
  species: TreeSpecies,
  expectedSummerMaxC: number,
  expectedSummerMinC: number,
  droughtStress: DroughtStressIndex,
  baseSiteMatC = 11.5,
  activeSiteMatC = baseSiteMatC
): EvaluatedSpecies {
  const reasons: string[] = [];

  // 1. Mean Annual Temperature (MAT) Niche Evaluation
  const activeMatRisk = getMatRiskScore(species, activeSiteMatC);
  let matScore = 0; // 0 = optimal (3), 1 = borderline/marginal (1-2), 2 = outside MAT envelope (0)

  if (activeMatRisk === 3) {
    matScore = 0;
    reasons.push(
      `Site MAT (${activeSiteMatC.toFixed(1)}°C) sits inside optimal MAT band (${species.matOptimalMinC}°–${species.matOptimalMaxC}°C)`
    );
  } else if (activeMatRisk >= 1) {
    matScore = 1;
    reasons.push(
      `Site MAT (${activeSiteMatC.toFixed(1)}°C) is at margin of MAT range (${species.matMinC}°–${species.matMaxC}°C)`
    );
  } else {
    matScore = 2;
    reasons.push(
      `Site MAT (${activeSiteMatC.toFixed(1)}°C) lies outside species MAT envelope (${species.matMinC}°–${species.matMaxC}°C)`
    );
  }

  // 2. Summer Thermal Threshold Evaluation
  const thermalMarginC = species.maxTempC - expectedSummerMaxC;
  let heatScore = 0;

  if (thermalMarginC >= 1) {
    heatScore = 0;
    reasons.push(`+${thermalMarginC}°C thermal headroom above ${expectedSummerMaxC}°C peak`);
  } else if (thermalMarginC >= -2) {
    heatScore = 1;
    reasons.push(
      thermalMarginC >= 0
        ? `At heat threshold (${species.maxTempC}°C vs ${expectedSummerMaxC}°C peak)`
        : `Exceeds max threshold (${species.maxTempC}°C) by ${Math.abs(thermalMarginC)}°C`
    );
  } else {
    heatScore = 2;
    reasons.push(`Severe heat risk: peak exceeds ${species.maxTempC}°C limit by ${Math.abs(thermalMarginC)}°C`);
  }

  if (expectedSummerMinC < 18 && species.matMinC >= 10 && species.maxTempC >= 43) {
    if (heatScore === 0) heatScore = 1;
    reasons.push('Cool summer minimum may limit wood ripening');
  }

  // 3. Drought Stress Index Evaluation
  const speciesDrought = DROUGHT_RANK[species.droughtTolerance];
  const requiredDrought = STRESS_REQUIRED_RANK[droughtStress];
  const droughtDelta = speciesDrought - requiredDrought;
  let droughtScore = 0;

  if (droughtDelta >= 0) {
    droughtScore = 0;
    reasons.push(`${species.droughtTolerance} drought tolerance meets ${droughtStress.toLowerCase()} stress`);
  } else if (droughtDelta === -1) {
    droughtScore = 1;
    reasons.push(`${species.droughtTolerance} drought tolerance requires irrigation under ${droughtStress.toLowerCase()} stress`);
  } else {
    droughtScore = 2;
    reasons.push(`Low drought tolerance unsuited for severe dry-summer sites`);
  }

  const worstScore = Math.max(matScore, heatScore, droughtScore);
  const status: ResilienceStatus =
    worstScore === 0 ? 'Fully Resilient' : worstScore === 1 ? 'Borderline' : 'Unsuited';

  const effectiveRecords = species.recordsCount;
  const recordsLevel = classifyRecordConfidence(effectiveRecords);
  const effectiveMatC = species.matMedianC;

  // BGCI Scenario Scores (Baseline MAT, +2°C 2050, +4°C 2090)
  const matRiskNow = getMatRiskScore(species, baseSiteMatC);
  const matRisk2050 = getMatRiskScore(species, baseSiteMatC + 2);
  const matRisk2090 = getMatRiskScore(species, baseSiteMatC + 4);

  return {
    ...species,
    status,
    thermalMarginC,
    reasons,
    effectiveRecords,
    recordsLevel,
    effectiveMatC,
    matRiskNow,
    matRisk2050,
    matRisk2090,
  };
}

export function exportSpeciesToCsv(rows: EvaluatedSpecies[]): string {
  const headers = [
    'Species Name',
    'GBIF Records',
    'Records Confidence',
    'Native Range',
    'Min Winter Temp (°C)',
    'Species MAT (°C)',
    'MAT Risk 2020 (0-3)',
    'MAT Risk 2050 (0-3)',
    'MAT Risk 2090 (0-3)',
    'Drought Tolerance',
    'Max Temperature Threshold (°C)',
    'Soil Preference',
    'Foliage Type',
    'Resilience Status',
    'Thermal Margin (°C)',
  ];

  const escape = (val: string | number) => {
    const str = String(val);
    return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.speciesName,
        r.effectiveRecords,
        r.recordsLevel,
        r.nativeRegion,
        r.minWinterTempC,
        r.effectiveMatC,
        r.matRiskNow,
        r.matRisk2050,
        r.matRisk2090,
        r.droughtTolerance,
        r.maxTempC,
        r.soilPreference,
        r.foliageType,
        r.status,
        r.thermalMarginC,
      ]
        .map(escape)
        .join(',')
    ),
  ];

  return lines.join('\n');
}
