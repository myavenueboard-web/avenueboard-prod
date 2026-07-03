import { useEffect, useMemo, useRef, useState } from "react";
import FormField, { inputClass } from "./FormField";

type PropertyForm = {
  streetAddress: string;
  city: string;
  stateName: string;
  zip: string;
  propertyType: string;
  units: string;
  unitName: string;
  propertyLabel: string;
};

type PropertyStepProps = {
  propertyForm: PropertyForm;
  setPropertyForm: React.Dispatch<React.SetStateAction<PropertyForm>>;
};

type AddressSuggestion = {
  placeId: string;
  description: string;
};

type GoogleAddressParts = {
  streetAddress: string;
  city: string;
  stateName: string;
  zip: string;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string;
                types?: string[];
                componentRestrictions?: { country: string };
              },
              callback: (
                predictions:
                  | Array<{ place_id: string; description: string }>
                  | null,
                status: string
              ) => void
            ) => void;
          };
          PlacesService: new (element: HTMLDivElement) => {
            getDetails: (
              request: { placeId: string; fields: string[] },
              callback: (
                place:
                  | {
                      address_components?: Array<{
                        long_name: string;
                        short_name: string;
                        types: string[];
                      }>;
                    }
                  | null,
                status: string
              ) => void
            ) => void;
          };
          PlacesServiceStatus: {
            OK: string;
          };
        };
      };
    };
  }
}

export default function PropertyStep({
  propertyForm,
  setPropertyForm,
}: PropertyStepProps) {
  const {
    configured: addressAutocompleteConfigured,
    loading: addressSuggestionsLoading,
    suggestions: addressSuggestions,
    getPlaceDetails,
  } = useGoogleAddressAutocomplete(propertyForm.streetAddress);

  async function applyAddressSuggestion(suggestion: AddressSuggestion) {
    const details = await getPlaceDetails(suggestion.placeId);

    if (!details) return;

    setPropertyForm((current) => ({
      ...current,
      streetAddress: details.streetAddress || current.streetAddress,
      city: details.city || current.city,
      stateName: details.stateName || current.stateName,
      zip: details.zip || current.zip,
    }));
  }

  return (
    <>
      <div>
  <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[20px]">
    Enter property details and continue.
  </h3>
</div>

      <form className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
        <div className="block">
          <p className="mb-1.5 text-[15px] font-medium text-zinc-900 sm:mb-2">
            Street Address
          </p>
          <input
            value={propertyForm.streetAddress}
            onChange={(e) =>
              setPropertyForm({
                ...propertyForm,
                streetAddress: e.target.value,
              })
            }
            placeholder="⌖  e.g. 12 Oak Street"
            className={inputClass}
          />

          {addressAutocompleteConfigured && addressSuggestions.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              {addressSuggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onClick={() => applyAddressSuggestion(suggestion)}
                  className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3.5 py-2.5 text-left text-[14px] font-medium text-zinc-700 transition last:border-b-0 hover:bg-blue-50/60 hover:text-slate-950"
                >
                  <span className="min-w-0 truncate">
                    {suggestion.description}
                  </span>
                  <span className="shrink-0 text-[#2563EB]">Use</span>
                </button>
              ))}
            </div>
          )}

          {addressAutocompleteConfigured &&
            addressSuggestionsLoading &&
            propertyForm.streetAddress.trim().length >= 3 && (
              <p className="mt-2 text-[14px] font-medium text-zinc-400">
                Looking up matching addresses...
              </p>
            )}

        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="City">
            <input
              value={propertyForm.city}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, city: e.target.value })
              }
              placeholder="San Francisco"
              className={inputClass}
            />
          </FormField>

          <FormField label="State">
            <input
              value={propertyForm.stateName}
              onChange={(e) =>
                setPropertyForm({
                  ...propertyForm,
                  stateName: e.target.value,
                })
              }
              placeholder="CA"
              className={inputClass}
            />
          </FormField>

          <FormField label="ZIP">
            <input
              value={propertyForm.zip}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, zip: e.target.value })
              }
              placeholder="94102"
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Property Type">
            <select
              value={propertyForm.propertyType}
              onChange={(e) =>
                setPropertyForm({
                  ...propertyForm,
                  propertyType: e.target.value,
                })
              }
              className={inputClass}
            >
              <option>Apartment</option>
              <option>Single Family Home</option>
              <option>Townhome</option>
              <option>Condo</option>
              <option>Duplex</option>
            </select>
          </FormField>

          <FormField label="Number Of Units">
            <select
              value={propertyForm.units}
              onChange={(e) =>
                setPropertyForm({ ...propertyForm, units: e.target.value })
              }
              className={inputClass}
            >
              <option>1 Unit</option>
              <option>2 Units</option>
              <option>3 Units</option>
              <option>4 Units</option>
              <option>5+ Units</option>
            </select>
          </FormField>
        </div>

        <FormField
          label={
            <>
              Unit Name / Identifier{" "}
              <span className="text-[13.5px] text-zinc-400">(Optional)</span>
            </>
          }
        >
          <input
            value={propertyForm.unitName}
            onChange={(e) =>
              setPropertyForm({ ...propertyForm, unitName: e.target.value })
            }
            placeholder="▧  e.g. Apt 2B"
            className={inputClass}
          />
        </FormField>

        <div className="block">
          <p className="mb-1.5 text-[15px] font-medium text-zinc-900 sm:mb-2">
            Property Label
          </p>
          <input
            value={propertyForm.propertyLabel}
            onChange={(e) =>
              setPropertyForm({
                ...propertyForm,
                propertyLabel: e.target.value,
              })
            }
            placeholder="Name this property for your board"
            className={inputClass}
          />

          <p className="mt-2 text-[14px] font-medium text-zinc-400">
            Examples: Willow’s Apartment, Downtown Apartment, Unit 2B
          </p>
        </div>
      </form>
    </>
  );
}

function useGoogleAddressAutocomplete(input: string) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";
  const configured = Boolean(apiKey);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const placesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!configured) return;

    if (window.google?.maps?.places) {
      setReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-avenueboard-google-places="true"]'
    );

    if (existingScript) {
      const handleLoad = () => setReady(true);
      existingScript.addEventListener("load", handleLoad);
      return () => existingScript.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.avenueboardGooglePlaces = "true";
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.head.appendChild(script);
  }, [apiKey, configured]);

  useEffect(() => {
    const query = input.trim();

    if (!configured || !ready || query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const service = new window.google!.maps!.places!.AutocompleteService();
    let cancelled = false;
    setLoading(true);

    const timeoutId = window.setTimeout(() => {
      service.getPlacePredictions(
        {
          input: query,
          types: ["address"],
          componentRestrictions: { country: "us" },
        },
        (predictions, status) => {
          if (cancelled) return;

          const okStatus = window.google?.maps?.places?.PlacesServiceStatus.OK;
          setLoading(false);
          setSuggestions(
            status === okStatus
              ? (predictions || []).slice(0, 5).map((prediction) => ({
                  placeId: prediction.place_id,
                  description: prediction.description,
                }))
              : []
          );
        }
      );
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [configured, input, ready]);

  const getPlaceDetails = useMemo(
    () => async (placeId: string): Promise<GoogleAddressParts | null> => {
      if (!configured || !ready || !window.google?.maps?.places) return null;

      if (!placesContainerRef.current) {
        placesContainerRef.current = document.createElement("div");
      }

      const service = new window.google.maps.places.PlacesService(
        placesContainerRef.current
      );

      return new Promise((resolve) => {
        service.getDetails(
          {
            placeId,
            fields: ["address_components"],
          },
          (place, status) => {
            const okStatus =
              window.google?.maps?.places?.PlacesServiceStatus.OK;

            if (status !== okStatus || !place?.address_components) {
              resolve(null);
              return;
            }

            resolve(parseGoogleAddressComponents(place.address_components));
          }
        );
      });
    },
    [configured, ready]
  );

  return {
    configured,
    loading,
    suggestions,
    getPlaceDetails,
  };
}

function parseGoogleAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>
) {
  const byType = (type: string) =>
    components.find((component) => component.types.includes(type));
  const streetNumber = byType("street_number")?.long_name || "";
  const route = byType("route")?.long_name || "";
  const city =
    byType("locality")?.long_name ||
    byType("postal_town")?.long_name ||
    byType("sublocality")?.long_name ||
    "";
  const stateName = byType("administrative_area_level_1")?.short_name || "";
  const zip = byType("postal_code")?.long_name || "";

  return {
    streetAddress: [streetNumber, route].filter(Boolean).join(" "),
    city,
    stateName,
    zip,
  };
}
