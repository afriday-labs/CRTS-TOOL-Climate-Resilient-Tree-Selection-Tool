import type { DroughtStressIndex } from '../data/treeSpecies';

export interface GeocodedCity {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface SiteClimateCalibration {
  locationLabel: string;
  latitude: number;
  longitude: number;
  projectedSummerPeakC: number;
  projectedSummerMeanHighC: number;
  projectedWinterMinC: number;
  annualMeanTempC: number;
  annualPrecipMm: number;
  derivedUsdaZone: number;
  derivedDroughtStress: DroughtStressIndex;
  sourceLabel: string;
}

export interface GbifOccurrencePoint {
  key: number;
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
  stateProvince?: string;
  locality?: string;
  eventDate?: string;
  year?: number;
  elevation?: number;
  basisOfRecord?: string;
  institutionCode?: string;
}

export interface GbifCountryCount {
  countryCode: string;
  count: number;
}

export interface GbifSpeciesResult {
  taxonKey: number;
  scientificName: string;
  canonicalName: string;
  family?: string;
  genus?: string;
  totalOccurrences: number;
  ukOccurrences: number;
  topCountries: GbifCountryCount[];
  points: GbifOccurrencePoint[];
}

export interface GbifCatalogSearchItem {
  taxonKey: number;
  canonicalName: string;
  scientificName: string;
  commonName?: string;
  family?: string;
  genus?: string;
  occurrenceCount: number;
}

const gbifDistributionCache = new Map<string, GbifSpeciesResult>();

function winterMinToUsdaZone(minTempC: number): number {
  if (minTempC <= -37) return 3;
  if (minTempC <= -31.5) return 4;
  if (minTempC <= -26) return 5;
  if (minTempC <= -20.5) return 6;
  if (minTempC <= -15) return 7;
  if (minTempC <= -9.5) return 8;
  if (minTempC <= -4) return 9;
  if (minTempC <= 1.5) return 10;
  return 11;
}

export async function searchCitiesOpenMeteo(query: string): Promise<GeocodedCity[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q
  )}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding lookup failed (${res.status})`);
  }
  const data = (await res.json()) as { results?: GeocodedCity[] };
  return data.results ?? [];
}

export async function fetchSiteClimateProjection(
  city: GeocodedCity
): Promise<SiteClimateCalibration> {
  // Use Open-Meteo CMIP6 High-Resolution Climate API (2018-2022 baseline; scenario deltas apply +2°C for 2050 and +4°C for 2090)
  const climateUrl =
    `https://climate-api.open-meteo.com/v1/climate?latitude=${city.latitude.toFixed(3)}` +
    `&longitude=${city.longitude.toFixed(3)}` +
    `&start_date=2018-01-01&end_date=2022-12-31` +
    `&models=MRI_AGCM3_2_S&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`;

  const res = await fetch(climateUrl);
  if (!res.ok) {
    throw new Error(`Open-Meteo Climate API returned ${res.status}`);
  }

  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: Array<number | null>;
      temperature_2m_min?: Array<number | null>;
      precipitation_sum?: Array<number | null>;
    };
  };

  const tmaxList = (data.daily?.temperature_2m_max ?? []).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );
  const tminList = (data.daily?.temperature_2m_min ?? []).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );
  const precipList = (data.daily?.precipitation_sum ?? []).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );

  if (tmaxList.length === 0 || tminList.length === 0) {
    throw new Error('Insufficient climate projection series returned for this coordinate.');
  }

  const sortedMax = [...tmaxList].sort((a, b) => a - b);
  const sortedMin = [...tminList].sort((a, b) => a - b);

  const p98Max = sortedMax[Math.min(sortedMax.length - 1, Math.floor(sortedMax.length * 0.985))];
  const p85Max = sortedMax[Math.min(sortedMax.length - 1, Math.floor(sortedMax.length * 0.85))];
  const p02Min = sortedMin[Math.max(0, Math.floor(sortedMin.length * 0.015))];

  const totalPrecip = precipList.reduce((acc, v) => acc + v, 0);
  const years = Math.max(1, precipList.length / 365);
  const annualPrecipMm = Math.round(totalPrecip / years);

  const avgMax = tmaxList.reduce((acc, v) => acc + v, 0) / tmaxList.length;
  const avgMin = tminList.reduce((acc, v) => acc + v, 0) / tminList.length;
  const annualMeanTempC = Number(((avgMax + avgMin) / 2).toFixed(1));

  const projectedSummerPeakC = Math.round(Math.min(46, Math.max(22, p98Max)));
  const projectedSummerMeanHighC = Math.round(Math.min(projectedSummerPeakC, Math.max(15, p85Max)));
  const projectedWinterMinC = Math.round(p02Min);

  const derivedUsdaZone = winterMinToUsdaZone(projectedWinterMinC);
  const derivedDroughtStress: DroughtStressIndex =
    annualPrecipMm < 520 || projectedSummerPeakC >= 39
      ? 'Severe'
      : annualPrecipMm < 820 || projectedSummerPeakC >= 33
      ? 'Moderate'
      : 'Low';

  const label = [city.name, city.admin1, city.country].filter(Boolean).slice(0, 2).join(', ');

  return {
    locationLabel: label,
    latitude: city.latitude,
    longitude: city.longitude,
    projectedSummerPeakC,
    projectedSummerMeanHighC,
    projectedWinterMinC,
    annualMeanTempC,
    annualPrecipMm,
    derivedUsdaZone,
    derivedDroughtStress,
    sourceLabel: 'Open-Meteo CMIP6 (2020 Baseline)',
  };
}

export function getCachedGbifDistribution(speciesName: string): GbifSpeciesResult | null {
  const key = speciesName.toLowerCase().replace(/×/g, 'x').trim();
  return gbifDistributionCache.get(key) ?? null;
}

export async function fetchGbifDistribution(
  speciesName: string,
  limit = 100
): Promise<GbifSpeciesResult> {
  const cleanName = speciesName.replace(/×/g, 'x').trim();
  const cacheKey = `${cleanName.toLowerCase()}_${limit}`;
  const cached = gbifDistributionCache.get(cleanName.toLowerCase());
  if (cached && cached.points.length >= Math.min(limit, cached.totalOccurrences)) {
    return cached;
  }

  const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(
    cleanName
  )}&strict=false`;

  const matchRes = await fetch(matchUrl);
  if (!matchRes.ok) {
    throw new Error(`GBIF species match failed (${matchRes.status})`);
  }

  const matchData = (await matchRes.json()) as {
    usageKey?: number;
    acceptedUsageKey?: number;
    scientificName?: string;
    canonicalName?: string;
    family?: string;
    genus?: string;
    matchType?: string;
  };

  const taxonKey = matchData.acceptedUsageKey ?? matchData.usageKey;
  if (!taxonKey || matchData.matchType === 'NONE') {
    throw new Error(`No matching taxon found in GBIF for "${speciesName}".`);
  }

  const occUrl = `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&hasCoordinate=true&hasGeospatialIssue=false&limit=${limit}&facet=country&facetLimit=8`;
  const occRes = await fetch(occUrl);
  if (!occRes.ok) {
    throw new Error(`GBIF occurrence search failed (${occRes.status})`);
  }

  const occData = (await occRes.json()) as {
    count?: number;
    facets?: Array<{
      field: string;
      counts?: Array<{ name: string; count: number }>;
    }>;
    results?: Array<{
      key: number;
      decimalLatitude?: number;
      decimalLongitude?: number;
      country?: string;
      countryCode?: string;
      stateProvince?: string;
      locality?: string;
      eventDate?: string;
      year?: number;
      elevation?: number;
      basisOfRecord?: string;
      institutionCode?: string;
    }>;
  };

  const countryFacet = occData.facets?.find((f) => f.field === 'COUNTRY')?.counts ?? [];
  const topCountries: GbifCountryCount[] = countryFacet.map((c) => ({
    countryCode: c.name,
    count: c.count,
  }));

  let ukOccurrences = topCountries.find((c) => c.countryCode === 'GB')?.count ?? -1;
  if (ukOccurrences === -1) {
    try {
      const ukRes = await fetch(
        `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&country=GB&hasCoordinate=true&limit=0`
      );
      if (ukRes.ok) {
        const ukData = (await ukRes.json()) as { count?: number };
        ukOccurrences = ukData.count ?? 0;
      } else {
        ukOccurrences = 0;
      }
    } catch {
      ukOccurrences = 0;
    }
  }

  const points: GbifOccurrencePoint[] = (occData.results ?? [])
    .filter(
      (r) =>
        typeof r.decimalLatitude === 'number' &&
        typeof r.decimalLongitude === 'number' &&
        Math.abs(r.decimalLatitude) <= 85
    )
    .map((r) => ({
      key: r.key,
      lat: r.decimalLatitude as number,
      lng: r.decimalLongitude as number,
      country: r.country,
      countryCode: r.countryCode,
      stateProvince: r.stateProvince,
      locality: r.locality,
      eventDate: r.eventDate ? r.eventDate.slice(0, 10) : undefined,
      year: r.year,
      elevation: typeof r.elevation === 'number' ? Math.round(r.elevation) : undefined,
      basisOfRecord: r.basisOfRecord,
      institutionCode: r.institutionCode,
    }));

  const result: GbifSpeciesResult = {
    taxonKey,
    scientificName: matchData.scientificName ?? speciesName,
    canonicalName: matchData.canonicalName ?? speciesName,
    family: matchData.family,
    genus: matchData.genus,
    totalOccurrences: occData.count ?? points.length,
    ukOccurrences,
    topCountries,
    points,
  };

  gbifDistributionCache.set(cleanName.toLowerCase(), result);
  gbifDistributionCache.set(cacheKey, result);
  return result;
}

export async function fetchGbifOccurrenceCountFast(
  speciesName: string
): Promise<{ canonicalName: string; totalOccurrences: number; taxonKey: number } | null> {
  const cleanName = speciesName.replace(/×/g, 'x').trim();
  const cached = gbifDistributionCache.get(cleanName.toLowerCase());
  if (cached) {
    return {
      canonicalName: cached.canonicalName,
      totalOccurrences: cached.totalOccurrences,
      taxonKey: cached.taxonKey,
    };
  }
  const matchRes = await fetch(
    `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(cleanName)}&strict=false`
  );
  if (!matchRes.ok) return null;
  const matchData = (await matchRes.json()) as {
    usageKey?: number;
    acceptedUsageKey?: number;
    canonicalName?: string;
    matchType?: string;
  };
  const taxonKey = matchData.acceptedUsageKey ?? matchData.usageKey;
  if (!taxonKey || matchData.matchType === 'NONE') return null;

  const occRes = await fetch(
    `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&hasCoordinate=true&hasGeospatialIssue=false&limit=0`
  );
  if (!occRes.ok) return null;
  const occData = (await occRes.json()) as { count?: number };
  return {
    canonicalName: matchData.canonicalName ?? speciesName,
    totalOccurrences: occData.count ?? 0,
    taxonKey,
  };
}

export interface GbifCatalogPageResult {
  items: GbifCatalogSearchItem[];
  offset: number;
  limit: number;
  totalCount: number;
  endOfRecords: boolean;
}

const gbifTaxonCountCache = new Map<number, number>();

export async function searchGbifTreeSpeciesPage(
  query: string,
  offset = 0,
  limit = 20
): Promise<GbifCatalogPageResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { items: [], offset: 0, limit, totalCount: 0, endOfRecords: true };
  }

  // GBIF Backbone Taxonomy UUID: d7dddbf4-2cf0-4f39-9b2a-bb099caae36c, Tracheophyta phylumKey: 7707728
  const url =
    `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(q)}` +
    `&rank=SPECIES&status=ACCEPTED&datasetKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c` +
    `&highertaxonKey=7707728&limit=${limit}&offset=${offset}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GBIF species search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    count?: number;
    endOfRecords?: boolean;
    results?: Array<{
      key: number;
      nubKey?: number;
      canonicalName?: string;
      scientificName?: string;
      family?: string;
      genus?: string;
      nameType?: string;
      vernacularNames?: Array<{ vernacularName?: string; language?: string }>;
    }>;
  };

  const seen = new Set<string>();
  const candidates: Array<{
    taxonKey: number;
    canonicalName: string;
    scientificName: string;
    commonName?: string;
    family?: string;
    genus?: string;
  }> = [];

  for (const r of data.results ?? []) {
    const canon = r.canonicalName?.trim();
    if (!canon || r.nameType === 'HYBRID' || canon.includes(' x ') || canon.includes('×')) {
      continue;
    }
    const lower = canon.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    const engVernacular =
      r.vernacularNames?.find((v) => v.language === 'eng' && v.vernacularName)?.vernacularName ??
      r.vernacularNames?.find((v) => v.vernacularName)?.vernacularName;

    candidates.push({
      taxonKey: r.nubKey ?? r.key,
      canonicalName: canon,
      scientificName: r.scientificName ?? canon,
      commonName: engVernacular,
      family: r.family,
      genus: r.genus,
    });
  }

  // Fetch exact georeferenced occurrence counts from api.gbif.org in parallel (cached per taxonKey)
  const enriched = await Promise.all(
    candidates.map(async (item) => {
      const cachedCount = gbifTaxonCountCache.get(item.taxonKey);
      if (cachedCount !== undefined) {
        return { ...item, occurrenceCount: cachedCount };
      }
      try {
        const countRes = await fetch(
          `https://api.gbif.org/v1/occurrence/search?taxonKey=${item.taxonKey}&hasCoordinate=true&hasGeospatialIssue=false&limit=0`
        );
        if (countRes.ok) {
          const countJson = (await countRes.json()) as { count?: number };
          const count = countJson.count ?? 0;
          gbifTaxonCountCache.set(item.taxonKey, count);
          return { ...item, occurrenceCount: count };
        }
      } catch {
        // Ignore single count failure
      }
      return { ...item, occurrenceCount: 0 };
    })
  );

  const totalCount = data.count ?? offset + enriched.length;
  const endOfRecords = Boolean(data.endOfRecords) || offset + limit >= totalCount;

  return {
    items: enriched.sort((a, b) => b.occurrenceCount - a.occurrenceCount),
    offset,
    limit,
    totalCount,
    endOfRecords,
  };
}

export async function searchGbifTreeSpecies(
  query: string,
  maxItems = 18
): Promise<GbifCatalogSearchItem[]> {
  const page = await searchGbifTreeSpeciesPage(query, 0, maxItems);
  return page.items;
}
