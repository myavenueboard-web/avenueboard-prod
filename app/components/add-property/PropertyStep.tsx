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

export default function PropertyStep({
  propertyForm,
  setPropertyForm,
}: PropertyStepProps) {
  return (
    <>
      <div>
  <h3 className="text-[17px] font-semibold tracking-[-0.04em] text-zinc-900 sm:text-[20px]">
    Enter property details and continue.
  </h3>
</div>

      <form className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
        <FormField label="Street Address">
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
        </FormField>

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
              <span className="text-[12px] text-zinc-400">(Optional)</span>
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

        <FormField label="Property Label">
          <input
            value={propertyForm.propertyLabel}
            onChange={(e) =>
              setPropertyForm({
                ...propertyForm,
                propertyLabel: e.target.value,
              })
            }
            placeholder="e.g. Willow's Apartment"
            className={inputClass}
          />
        </FormField>
      </form>
    </>
  );
}