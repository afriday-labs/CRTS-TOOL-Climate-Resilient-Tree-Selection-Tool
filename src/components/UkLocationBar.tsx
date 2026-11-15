import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { CLIMATE_PRESETS } from '../data/treeSpecies';
import {
  fetchSiteClimateProjection,
  type SiteClimateCalibration,
} from '../utils/openApis';
import {
  createManualSoilData,
  fetchUkSiteSoilData,
  SOIL_PREFERENCE_OPTIONS,
  type UkSiteSoilData,
} from '../utils/ukSoilApi';

interface UkLocationBarProps {
  activePresetId: string;
  liveClimate: SiteClimateCalibration | null;
  siteSoil: UkSiteSoilData | null;
  onSelectLocation: (presetId: string) => void;
  onApplyCustomCoordinates: (calibration: SiteClimateCalibration) => void;
  onUpdateSiteSoil: (soil: UkSiteSoilData | null) => void;
  onFilterBySoilPreference?: (soilPreference: string) => void;
}

const UK_PRESETS = CLIMATE_PRESETS.filter((p) => p.isUkLocation);

export function UkLocationBar({
  activePresetId,
  liveClimate,
  siteSoil,
  onSelectLocation,
  onApplyCustomCoordinates,
  onUpdateSiteSoil,
  onFilterBySoilPreference,
}: UkLocationBarProps) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const isCustomActive = activePresetId === 'live-api' && liveClimate !== null;
  const [customOpen, setCustomOpen] = useState(false);
  const [siteLabel, setSiteLabel] = useState('');
  const [latInput, setLatInput] = useState('51.4787');
  const [lngInput, setLngInput] = useState('-0.2956');
  const [loading, setLoading] = useState(false);
  const [soilLoading, setSoilLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soilError, setSoilError] = useState<string | null>(null);

  const activePreset = CLIMATE_PRESETS.find((p) => p.id === activePresetId) ?? null;

  const currentLat =
    isCustomActive && liveClimate
      ? liveClimate.latitude
      : activePreset
      ? activePreset.lat
      : Number(latInput) || 51.51;
  const currentLng =
    isCustomActive && liveClimate
      ? liveClimate.longitude
      : activePreset
      ? activePreset.lng
      : Number(lngInput) || -0.13;
  const currentLabel = isCustomActive
    ? liveClimate.locationLabel
    : activePreset?.label ?? 'Custom Site';

  const summaryText = isCustomActive
    ? `${liveClimate.locationLabel} · MAT ${liveClimate.annualMeanTempC.toFixed(1)}°C · ${liveClimate.projectedSummerPeakC}°C peak · ${liveClimate.derivedDroughtStress}`
    : activePreset
    ? `${activePreset.shortLabel ?? activePreset.label} · MAT ${activePreset.matC.toFixed(1)}°C · ${activePreset.summerMaxC}°C peak · ${activePreset.droughtStress}`
    : 'Custom climate site';

  const handleLatChange = (val: string) => {
    if (val.includes(',')) {
      const parts = val.split(',').map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        setLatInput(parts[0]);
        setLngInput(parts[1]);
        return;
      }
    }
    setLatInput(val);
  };

  const handleFetchSoilForCoords = async (lat: number, lng: number) => {
    setSoilLoading(true);
    setSoilError(null);
    try {
      const soilData = await fetchUkSiteSoilData(lat, lng);
      onUpdateSiteSoil(soilData);
    } catch (err) {
      setSoilError(
        err instanceof Error
          ? `${err.message}. Choose a soil type manually below.`
          : 'Unable to reach BGS UKSO soil service. Choose a soil type manually below.'
      );
    } finally {
      setSoilLoading(false);
    }
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latInput.trim());
    const lng = Number(lngInput.trim());

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Enter a valid Latitude between -90 and 90 (e.g. 51.4787).');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Enter a valid Longitude between -180 and 180 (e.g. -0.2956).');
      return;
    }

    setLoading(true);
    setError(null);
    setSoilError(null);
    try {
      const formattedCoords = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(
        lng
      ).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
      const label = siteLabel.trim() || `Custom (${formattedCoords})`;

      const [climateResult, soilResult] = await Promise.allSettled([
        fetchSiteClimateProjection({
          id: 0,
          name: label,
          country: '',
          latitude: lat,
          longitude: lng,
        }),
        fetchUkSiteSoilData(lat, lng),
      ]);

      if (climateResult.status === 'rejected') {
        throw climateResult.reason;
      }

      onApplyCustomCoordinates(climateResult.value);

      if (soilResult.status === 'fulfilled') {
        onUpdateSiteSoil(soilResult.value);
      } else {
        setSoilError(
          soilResult.reason instanceof Error
            ? `${soilResult.reason.message}. You can select a manual soil override below.`
            : 'Live UK soil service timed out or blocked; select a manual soil override below.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load climate data for these coordinates.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="UK regional site locations, custom coordinates, and UK soil data"
      className="bg-white border border-[#E2DFD7] rounded-lg overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setSectionOpen((prev) => !prev)}
        aria-expanded={sectionOpen}
        className="w-full px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-[#FAF9F6] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {sectionOpen ? (
            <ChevronDown className="w-4 h-4 text-[#5C5C58] shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#5C5C58] shrink-0" aria-hidden="true" />
          )}
          <MapPin className="w-4 h-4 text-[#2F4F3E] shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#1A1A1A] tracking-tight">
            UK Site Locations &amp; Soil
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-[#5C5C58]">
          <span>{summaryText}</span>
          {siteSoil && (
            <span className="px-2 py-0.5 text-[11px] font-sans bg-[#ECEFE9] text-[#2F4F3E] rounded border border-[#C9D3C8]">
              Soil: {siteSoil.recommendedSoilPreference}
            </span>
          )}
        </div>
      </button>

      {sectionOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-[#EAE7DF] space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {UK_PRESETS.map((loc) => {
              const isActive = activePresetId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setCustomOpen(false);
                    onSelectLocation(loc.id);
                    void handleFetchSoilForCoords(loc.lat, loc.lng);
                  }}
                  aria-pressed={isActive}
                  className={`text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#2F4F3E] bg-[#ECEFE9] text-[#1A1A1A]'
                      : 'border-[#E2DFD7] bg-[#F7F6F2] text-[#1A1A1A] hover:border-[#C9D3C8] hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">
                    {loc.shortLabel ?? loc.label}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#5C5C58] mt-0.5 truncate">
                    MAT {loc.matC.toFixed(0)}° · {loc.summerMaxC}° peak · {loc.droughtStress}
                  </div>
                </button>
              );
            })}

            {/* 7th Tab: Custom Coordinates */}
            <button
              type="button"
              onClick={() => setCustomOpen((prev) => !prev)}
              aria-expanded={customOpen}
              aria-pressed={isCustomActive}
              className={`text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                isCustomActive || customOpen
                  ? 'border-[#2F4F3E] bg-[#ECEFE9] text-[#1A1A1A]'
                  : 'border-dashed border-[#C9D3C8] bg-[#F7F6F2] text-[#1A1A1A] hover:border-[#2F4F3E] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
                <Crosshair className="w-3.5 h-3.5 text-[#2F4F3E] shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isCustomActive ? liveClimate.locationLabel : 'Custom Site'}
                </span>
              </div>
              <div className="text-[11px] font-mono tabular-nums text-[#5C5C58] mt-0.5 truncate">
                {isCustomActive
                  ? `MAT ${liveClimate.annualMeanTempC.toFixed(0)}° · ${liveClimate.projectedSummerPeakC}° peak · ${liveClimate.derivedDroughtStress}`
                  : 'Enter Lat / Lon'}
              </div>
            </button>
          </div>

          {customOpen && (
            <form
              onSubmit={handleApplyCustom}
              className="pt-3.5 border-t border-[#EAE7DF] space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-4">
                  <label
                    htmlFor="custom-site-name"
                    className="block text-[11px] font-medium text-[#5C5C58] mb-1"
                  >
                    Site Name (optional)
                  </label>
                  <input
                    id="custom-site-name"
                    type="text"
                    value={siteLabel}
                    onChange={(e) => setSiteLabel(e.target.value)}
                    placeholder="e.g. Kew Gardens, York Park"
                    className="w-full px-3 py-1.5 text-xs bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] placeholder:text-[#7A7A74] focus:outline-none focus:border-[#2F4F3E]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="custom-site-lat"
                    className="block text-[11px] font-medium text-[#5C5C58] mb-1"
                  >
                    Latitude (or paste Lat, Lon)
                  </label>
                  <input
                    id="custom-site-lat"
                    type="text"
                    inputMode="decimal"
                    value={latInput}
                    onChange={(e) => handleLatChange(e.target.value)}
                    placeholder="51.4787"
                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] focus:outline-none focus:border-[#2F4F3E]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="custom-site-lng"
                    className="block text-[11px] font-medium text-[#5C5C58] mb-1"
                  >
                    Longitude
                  </label>
                  <input
                    id="custom-site-lng"
                    type="text"
                    inputMode="decimal"
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    placeholder="-0.2956"
                    className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[#1A1A1A] focus:outline-none focus:border-[#2F4F3E]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2F4F3E] rounded-md hover:bg-[#243D30] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5" />
                    )}
                    <span>Apply Site</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2 bg-[#FDF2F2] border border-[#E7C6C6] rounded text-xs text-[#9E2A2B]">
                  {error}
                </div>
              )}

              {isCustomActive && (
                <div className="text-[11px] font-mono tabular-nums text-[#454541] flex flex-wrap items-center gap-3 bg-[#F2F0EA] px-3 py-2 rounded border border-[#E2DFD7]">
                  <span className="font-semibold text-[#2F4F3E]">{liveClimate.locationLabel}</span>
                  <span>·</span>
                  <span>
                    {liveClimate.latitude.toFixed(4)}°, {liveClimate.longitude.toFixed(4)}°
                  </span>
                  <span>·</span>
                  <span>MAT {liveClimate.annualMeanTempC}°C</span>
                  <span>·</span>
                  <span>Summer Peak {liveClimate.projectedSummerPeakC}°C</span>
                  <span>·</span>
                  <span>Winter Min {liveClimate.projectedWinterMinC}°C</span>
                  <span>·</span>
                  <span>{liveClimate.annualPrecipMm} mm/yr</span>
                </div>
              )}
            </form>
          )}

          {/* Open UK Soil Data Inspector + Manual Override */}
          <div className="pt-3.5 border-t border-[#EAE7DF] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#2F4F3E]" aria-hidden="true" />
                <span className="text-xs font-semibold text-[#1A1A1A]">
                  Site UK Soil Profile ({currentLabel})
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#7A7A74]">
                  {currentLat.toFixed(3)}°, {currentLng.toFixed(3)}°
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleFetchSoilForCoords(currentLat, currentLng)}
                  disabled={soilLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#2F4F3E] bg-[#ECEFE9] border border-[#C9D3C8] rounded hover:bg-[#E4E8E0] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {soilLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>{siteSoil ? 'Refresh BGS UKSO Soil' : 'Inspect UK Soil (BGS UKSO)'}</span>
                </button>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-[#5C5C58]">
                  <span>Manual Override:</span>
                  <select
                    aria-label="Manual site soil override"
                    value={siteSoil?.manualOverride ? siteSoil.recommendedSoilPreference : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        void handleFetchSoilForCoords(currentLat, currentLng);
                      } else {
                        setSoilError(null);
                        onUpdateSiteSoil(createManualSoilData(currentLat, currentLng, val));
                      }
                    }}
                    className="px-2 py-1 text-[11px] bg-[#F7F6F2] border border-[#E2DFD7] rounded text-[#1A1A1A] focus:outline-none focus:border-[#2F4F3E]"
                  >
                    <option value="">Auto (BGS UKSO / SoilGrids)</option>
                    {SOIL_PREFERENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {soilError && (
              <div className="p-2.5 bg-[#FAF5EC] border border-[#E3D1B4] rounded text-xs text-[#7D4A10]">
                {soilError}
              </div>
            )}

            {siteSoil && (
              <div className="bg-[#F7F6F2] border border-[#E2DFD7] rounded-md p-3 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-[#5C5C58]">
                    Source: <span className="font-medium text-[#1A1A1A]">{siteSoil.sourceLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#5C5C58]">
                      Matched Soil Filter:{' '}
                      <strong className="text-[#2F4F3E]">
                        {siteSoil.recommendedSoilPreference}
                      </strong>
                    </span>
                    {onFilterBySoilPreference && (
                      <button
                        type="button"
                        onClick={() => onFilterBySoilPreference(siteSoil.recommendedSoilPreference)}
                        className="px-2 py-0.5 text-[11px] font-medium text-white bg-[#2F4F3E] rounded hover:bg-[#243D30] transition-colors cursor-pointer"
                      >
                        Filter Trees to Soil
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-[#EAE7DF]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#7A7A74]">
                      Texture / Group
                    </div>
                    <div className="font-medium text-[#1A1A1A] mt-0.5">
                      {siteSoil.soilTexture ?? '—'}
                      {siteSoil.soilGroup ? ` (${siteSoil.soilGroup})` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#7A7A74]">
                      Soil Depth
                    </div>
                    <div className="font-medium text-[#1A1A1A] mt-0.5">
                      {siteSoil.soilDepth ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#7A7A74]">
                      Carbonate / pH
                    </div>
                    <div className="font-mono tabular-nums font-medium text-[#1A1A1A] mt-0.5">
                      {siteSoil.carbonateContent ?? '—'}
                      {siteSoil.phTopsoil !== undefined ? ` · pH ${siteSoil.phTopsoil}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#7A7A74]">
                      Parent Material
                    </div>
                    <div className="font-medium text-[#1A1A1A] mt-0.5 truncate" title={siteSoil.parentMaterial}>
                      {siteSoil.parentMaterial ?? '—'}
                    </div>
                  </div>
                </div>

                {(siteSoil.soilGroupDesc || siteSoil.soilDepthDesc || siteSoil.peatPresence || siteSoil.note) && (
                  <p className="text-[11px] text-[#5C5C58] pt-1">
                    {[
                      siteSoil.soilGroupDesc,
                      siteSoil.soilDepthDesc,
                      siteSoil.peatPresence ? `Peat: ${siteSoil.peatPresence}` : null,
                      siteSoil.note,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
