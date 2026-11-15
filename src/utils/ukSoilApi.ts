export const BGS_UKSO_WMS_URL =
  'https://map.bgs.ac.uk/arcgis/services/UKSO/UKSO_BGS/MapServer/WMSServer';

export type BgsSoilWmsLayerId =
  | 'none'
  | 'Parent.Material.Soil.texture'
  | 'Parent.Material.Parent.calcareous.content'
  | 'Parent.Material.Soil.layer.thickness'
  | 'Peat.Coverage';

export const BGS_SOIL_WMS_LAYERS: Array<{
  id: BgsSoilWmsLayerId;
  label: string;
  description: string;
}> = [
  {
    id: 'none',
    label: 'Off',
    description: 'No soil overlay',
  },
  {
    id: 'Parent.Material.Soil.texture',
    label: 'Soil Texture (BGS UKSO)',
    description: 'GBR BGS Parent Material Soil Texture',
  },
  {
    id: 'Parent.Material.Parent.calcareous.content',
    label: 'Calcareous / Chalk (BGS UKSO)',
    description: 'Parent carbonate & chalk content',
  },
  {
    id: 'Parent.Material.Soil.layer.thickness',
    label: 'Soil Depth (BGS UKSO)',
    description: 'Parent material soil layer thickness',
  },
  {
    id: 'Peat.Coverage',
    label: 'Peat Coverage (BGS UKSO)',
    description: 'GBR BGS Peat Coverage',
  },
];

export const SOIL_PREFERENCE_OPTIONS = [
  'Well-drained Loam',
  'Clay-tolerant',
  'Chalk / Alkaline',
  'Sandy / Rocky',
  'Acidic / Loamy',
  'Moist / Alluvial',
] as const;

export interface UkSiteSoilData {
  lat: number;
  lng: number;
  source: 'bgs-ukso' | 'soilgrids' | 'manual';
  sourceLabel: string;
  soilGroup?: string;
  soilGroupDesc?: string;
  soilTexture?: string;
  soilDepth?: string;
  soilDepthDesc?: string;
  carbonateContent?: string;
  parentMaterial?: string;
  grainDescription?: string;
  peatPresence?: string;
  waterErosion?: string;
  phTopsoil?: number;
  clayPct?: number;
  sandPct?: number;
  siltPct?: number;
  recommendedSoilPreference: string;
  manualOverride?: boolean;
  note?: string;
}

function deriveRecommendedSoilPreference(params: {
  soilGroup?: string;
  soilTexture?: string;
  carbonateContent?: string;
  parentMaterial?: string;
  peatPresence?: string;
  phTopsoil?: number;
  clayPct?: number;
  sandPct?: number;
}): string {
  const combined = [
    params.soilGroup,
    params.soilTexture,
    params.parentMaterial,
    params.peatPresence,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  const carb = (params.carbonateContent ?? '').toUpperCase();

  if (
    carb.includes('HIGH') ||
    carb.includes('MODERATE') ||
    combined.includes('CHALK') ||
    combined.includes('LIMESTONE') ||
    combined.includes('CALCAREOUS') ||
    (params.phTopsoil !== undefined && params.phTopsoil >= 7.3)
  ) {
    return 'Chalk / Alkaline';
  }

  if (
    combined.includes('PEAT') ||
    combined.includes('ALLUV') ||
    combined.includes('FLUVIAL') ||
    combined.includes('FEN')
  ) {
    if (combined.includes('CLAY') || params.soilGroup?.toUpperCase() === 'HEAVY') {
      return 'Clay-tolerant';
    }
    return 'Moist / Alluvial';
  }

  if (
    params.soilGroup?.toUpperCase() === 'HEAVY' ||
    combined.includes('CLAY') ||
    (params.clayPct !== undefined && params.clayPct >= 30)
  ) {
    return 'Clay-tolerant';
  }

  if (
    params.soilGroup?.toUpperCase() === 'LIGHT' ||
    combined.includes('SAND') ||
    combined.includes('GRAVEL') ||
    combined.includes('ROCK') ||
    (params.sandPct !== undefined && params.sandPct >= 55)
  ) {
    return 'Sandy / Rocky';
  }

  if (params.phTopsoil !== undefined && params.phTopsoil <= 5.7) {
    return 'Acidic / Loamy';
  }

  return 'Well-drained Loam';
}

function isWithinGreatBritainApprox(lat: number, lng: number): boolean {
  return lat >= 49.8 && lat <= 60.9 && lng >= -8.7 && lng <= 1.8;
}

async function fetchBgsUksoFeatureInfo(
  lat: number,
  lng: number,
  signal: AbortSignal
): Promise<Partial<UkSiteSoilData> | null> {
  const delta = 0.015;
  const bbox = `${(lng - delta).toFixed(5)},${(lat - delta).toFixed(5)},${(lng + delta).toFixed(
    5
  )},${(lat + delta).toFixed(5)}`;

  const url =
    `${BGS_UKSO_WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo` +
    `&LAYERS=Parent.Material.Soil.texture,Peat.Coverage` +
    `&QUERY_LAYERS=Parent.Material.Soil.texture,Peat.Coverage` +
    `&CRS=CRS:84&BBOX=${bbox}&WIDTH=101&HEIGHT=101&I=50&J=50` +
    `&INFO_FORMAT=application/geo%2Bjson`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`BGS UKSO WMS returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    features?: Array<{
      layerName?: string;
      properties?: Record<string, string | number | null | undefined>;
    }>;
  };

  const features = data.features ?? [];
  if (features.length === 0) return null;

  const textureFeature =
    features.find((f) => f.layerName === 'Parent.Material.Soil.texture') ?? features[0];
  const peatFeature = features.find((f) => f.layerName === 'Peat.Coverage');

  const props = textureFeature?.properties ?? {};
  const peatProps = peatFeature?.properties ?? {};

  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

  const peatDesc =
    str(peatProps.PEAT_CLASS) ||
    str(peatProps.DESCRIPTION) ||
    str(peatProps.DESC) ||
    (peatFeature && Object.keys(peatProps).length > 0 ? 'Peat mapped at coordinate' : undefined);

  if (!props || Object.keys(props).length === 0) {
    return peatDesc ? { peatPresence: peatDesc } : null;
  }

  return {
    soilGroup: str(props.SOIL_GROUP),
    soilGroupDesc: str(props.SOIL_GROUP_DESC),
    soilTexture: str(props.SIMPLE_TEX),
    soilDepth: str(props.SOIL_DEPTH),
    soilDepthDesc: str(props.SOIL_DEPTH_DESC),
    carbonateContent: str(props.CACO3_RANK),
    parentMaterial: str(props.ESB_DESC) || str(props.GEN_PMLITH),
    grainDescription: str(props.GEN_GRAIN_DESC),
    waterErosion: str(props.WATER_ERZ),
    peatPresence: peatDesc,
  };
}

async function fetchSoilGridsTopsoil(
  lat: number,
  lng: number,
  signal: AbortSignal
): Promise<{
  phTopsoil?: number;
  clayPct?: number;
  sandPct?: number;
  siltPct?: number;
} | null> {
  const url =
    `https://rest.isric.org/soilgrids/v2.0/properties/query` +
    `?lon=${lng.toFixed(4)}&lat=${lat.toFixed(4)}` +
    `&property=phh2o&property=clay&property=sand&property=silt&depth=0-5cm&value=mean`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    properties?: {
      layers?: Array<{
        name?: string;
        depths?: Array<{ values?: { mean?: number | null } }>;
      }>;
    };
  };

  const layers = json.properties?.layers ?? [];
  const getMean = (name: string): number | undefined => {
    const val = layers.find((l) => l.name === name)?.depths?.[0]?.values?.mean;
    return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
  };

  const phRaw = getMean('phh2o');
  const clayRaw = getMean('clay');
  const sandRaw = getMean('sand');
  const siltRaw = getMean('silt');

  if (phRaw === undefined && clayRaw === undefined && sandRaw === undefined) {
    return null;
  }

  return {
    phTopsoil: phRaw !== undefined ? Number((phRaw / 10).toFixed(1)) : undefined,
    clayPct: clayRaw !== undefined ? Math.round(clayRaw / 10) : undefined,
    sandPct: sandRaw !== undefined ? Math.round(sandRaw / 10) : undefined,
    siltPct: siltRaw !== undefined ? Math.round(siltRaw / 10) : undefined,
  };
}

export async function fetchUkSiteSoilData(lat: number, lng: number): Promise<UkSiteSoilData> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8500);

  try {
    const [bgsResult, soilGridsResult] = await Promise.allSettled([
      fetchBgsUksoFeatureInfo(lat, lng, controller.signal),
      fetchSoilGridsTopsoil(lat, lng, controller.signal),
    ]);

    const bgs = bgsResult.status === 'fulfilled' ? bgsResult.value : null;
    const sg = soilGridsResult.status === 'fulfilled' ? soilGridsResult.value : null;

    if (!bgs && !sg) {
      const bgsReason =
        bgsResult.status === 'rejected'
          ? bgsResult.reason instanceof Error
            ? bgsResult.reason.message
            : 'WMS request blocked or timed out'
          : isWithinGreatBritainApprox(lat, lng)
          ? 'No terrestrial UKSO soil polygon found at these exact coordinates'
          : 'Coordinates appear outside Great Britain UKSO soil coverage';
      throw new Error(bgsReason);
    }

    const recommendedSoilPreference = deriveRecommendedSoilPreference({
      soilGroup: bgs?.soilGroup,
      soilTexture: bgs?.soilTexture,
      carbonateContent: bgs?.carbonateContent,
      parentMaterial: bgs?.parentMaterial,
      peatPresence: bgs?.peatPresence,
      phTopsoil: sg?.phTopsoil,
      clayPct: sg?.clayPct,
      sandPct: sg?.sandPct,
    });

    const source: UkSiteSoilData['source'] = bgs ? 'bgs-ukso' : 'soilgrids';
    const sourceLabel =
      bgs && sg
        ? 'BGS UKSO WMS + ISRIC SoilGrids (0–5 cm)'
        : bgs
        ? 'BGS UKSO Soil Property WMS'
        : 'ISRIC SoilGrids v2.0 (Fallback)';

    return {
      lat,
      lng,
      source,
      sourceLabel,
      ...bgs,
      ...sg,
      recommendedSoilPreference,
      note: !bgs
        ? 'BGS UKSO WMS returned no polygon here; showing SoilGrids topsoil fallback. Use manual override if site soil differs.'
        : undefined,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export function createManualSoilData(
  lat: number,
  lng: number,
  soilPreference: string,
  note?: string
): UkSiteSoilData {
  return {
    lat,
    lng,
    source: 'manual',
    sourceLabel: 'Manual Site Soil Selection',
    soilTexture: soilPreference,
    recommendedSoilPreference: soilPreference,
    manualOverride: true,
    note:
      note ??
      'Manually selected soil profile for this site. Switch back to live query anytime.',
  };
}
