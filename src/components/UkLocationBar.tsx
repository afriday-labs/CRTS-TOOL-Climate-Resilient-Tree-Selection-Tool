import { Crosshair, Loader2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { CLIMATE_PRESETS } from '../data/treeSpecies';
import {
  fetchSiteClimateProjection,
  type SiteClimateCalibration,
} from '../utils/openApis';

interface UkLocationBarProps {
  activePresetId: string;
  liveClimate: SiteClimateCalibration | null;
  onSelectLocation: (presetId: string) => void;
  onApplyCustomCoordinates: (calibration: SiteClimateCalibration) => void;
}

const UK_PRESETS = CLIMATE_PRESETS.filter((p) => p.isUkLocation);

export function UkLocationBar({
  activePresetId,
  liveClimate,
  onSelectLocation,
  onApplyCustomCoordinates,
}: UkLocationBarProps) {
  const isCustomActive = activePresetId === 'live-api' && liveClimate !== null;
  const [customOpen, setCustomOpen] = useState(false);
  const [siteLabel, setSiteLabel] = useState('');
  const [latInput, setLatInput] = useState('51.4787');
  const [lngInput, setLngInput] = useState('-0.2956');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLatChange = (val: string) => {
    // Support pasting "lat, lon" directly from Google Maps / GIS tools
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
    try {
      const formattedCoords = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
      const label = siteLabel.trim() || `Custom (${formattedCoords})`;
      const calibration = await fetchSiteClimateProjection({
        id: 0,
        name: label,
        country: '',
        latitude: lat,
        longitude: lng,
      });
      onApplyCustomCoordinates(calibration);
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
      aria-label="UK regional site locations and custom coordinate input"
      className="bg-white border border-[#E2E7E2] rounded-lg p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#1B5E3F]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#141A16]">
            UK Site Locations
          </h2>
        </div>
        <p className="text-xs text-[#5A655D]">
          Select a regional UK climate preset or enter custom site coordinates (Lat / Lon).
        </p>
      </div>

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
              }}
              aria-pressed={isActive}
              className={`text-left px-3 py-2.5 rounded-md border transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#1B5E3F] bg-[#EEF5F0] text-[#141A16]'
                  : 'border-[#DCE2DD] bg-[#FAFBFA] text-[#2A332D] hover:border-[#9EB0A3] hover:bg-white'
              }`}
            >
              <div className="text-xs font-semibold truncate">
                {loc.shortLabel ?? loc.label}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-[#5A655D] mt-0.5 truncate">
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
              ? 'border-[#1B5E3F] bg-[#EEF5F0] text-[#141A16]'
              : 'border-dashed border-[#B8C4BA] bg-[#FAFBFA] text-[#2A332D] hover:border-[#1B5E3F] hover:bg-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
            <Crosshair className="w-3.5 h-3.5 text-[#1B5E3F] shrink-0" aria-hidden="true" />
            <span className="truncate">
              {isCustomActive ? liveClimate.locationLabel : 'Custom Site'}
            </span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-[#5A655D] mt-0.5 truncate">
            {isCustomActive
              ? `MAT ${liveClimate.annualMeanTempC.toFixed(0)}° · ${liveClimate.projectedSummerPeakC}° peak · ${liveClimate.derivedDroughtStress}`
              : 'Enter Lat / Lon'}
          </div>
        </button>
      </div>

      {customOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="mt-3.5 pt-3.5 border-t border-[#EAEFEA] space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-4">
              <label
                htmlFor="custom-site-name"
                className="block text-[11px] font-medium text-[#4A554E] mb-1"
              >
                Site Name (optional)
              </label>
              <input
                id="custom-site-name"
                type="text"
                value={siteLabel}
                onChange={(e) => setSiteLabel(e.target.value)}
                placeholder="e.g. Kew Gardens, York Park"
                className="w-full px-3 py-1.5 text-xs bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] placeholder:text-[#78857C] focus:outline-none focus:border-[#1B5E3F]"
              />
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="custom-site-lat"
                className="block text-[11px] font-medium text-[#4A554E] mb-1"
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
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] focus:outline-none focus:border-[#1B5E3F]"
              />
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="custom-site-lng"
                className="block text-[11px] font-medium text-[#4A554E] mb-1"
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
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-[#FAFBFA] border border-[#DCE2DD] rounded-md text-[#141A16] focus:outline-none focus:border-[#1B5E3F]"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B5E3F] rounded-md hover:bg-[#154A31] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
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
            <div className="p-2 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#991B1B]">
              {error}
            </div>
          )}

          {isCustomActive && (
            <div className="text-[11px] font-mono tabular-nums text-[#3E4841] flex flex-wrap items-center gap-3 bg-[#F7F9F7] px-3 py-2 rounded border border-[#E2E7E2]">
              <span className="font-semibold text-[#1B5E3F]">{liveClimate.locationLabel}</span>
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
    </section>
  );
}
