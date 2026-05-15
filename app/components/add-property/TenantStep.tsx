import FormField, { inputClass } from "./FormField";

type TenantForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AdditionalTenant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type TenantStepProps = {
  tenantForm: TenantForm;
  setTenantForm: React.Dispatch<React.SetStateAction<TenantForm>>;
  additionalTenants: AdditionalTenant[];
  removeAdditionalTenant: (id: number) => void;
  openAdditionalTenantModal: () => void;
};

export default function TenantStep({
  tenantForm,
  setTenantForm,
  additionalTenants,
  removeAdditionalTenant,
  openAdditionalTenantModal,
}: TenantStepProps) {
  return (
    <>
      <div>
        <h1 className="text-[25px] font-semibold tracking-[-0.04em]">
          Add A Tenant
        </h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Add the primary tenant who will receive the portal invitation.
        </p>
      </div>

      <form className="mt-5 space-y-4">
        <div className="rounded-[22px] border border-[#E45E8A] bg-[#FFF8FB] p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-[16px] font-semibold text-zinc-900">
                  Primary Tenant
                </h3>
                <span className="rounded-full bg-[#FFF0F5] px-3 py-1 text-[12px] font-medium text-[#B9476D]">
                  Portal invite
                </span>
              </div>

              <p className="mt-2 text-[13px] leading-5 text-zinc-500">
                This tenant receives the secure setup link, payment access,
                reminders, and receipts.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name">
                <input
                  value={tenantForm.firstName}
                  onChange={(e) =>
                    setTenantForm({
                      ...tenantForm,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="Sarah"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Last Name">
                <input
                  value={tenantForm.lastName}
                  onChange={(e) =>
                    setTenantForm({
                      ...tenantForm,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Johnson"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Email Address">
              <input
                type="email"
                value={tenantForm.email}
                onChange={(e) =>
                  setTenantForm({
                    ...tenantForm,
                    email: e.target.value,
                  })
                }
                placeholder="tenant@email.com"
                className={inputClass}
              />
            </FormField>

            <FormField label="Phone Number">
              <input
                value={tenantForm.phone}
                onChange={(e) =>
                  setTenantForm({
                    ...tenantForm,
                    phone: e.target.value,
                  })
                }
                placeholder="(415) 555-0000"
                className={inputClass}
              />
            </FormField>
          </div>
        </div>

        {additionalTenants.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Additional Tenants
                </h3>
                <p className="mt-1 text-[13px] text-zinc-500">
                  Optional contacts only. No portal invites will be sent.
                </p>
              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[13px] font-medium text-zinc-500">
                {additionalTenants.length} added
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {additionalTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3"
                >
                  <div>
                    <p className="text-[13px] font-medium text-zinc-900">
                      {tenant.firstName} {tenant.lastName}
                    </p>
                    <p className="mt-1 text-[12px] text-zinc-500">
                      {tenant.email || "No email"}{" "}
                      {tenant.phone ? `• ${tenant.phone}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAdditionalTenant(tenant.id)}
                    className="text-[12px] font-medium text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={openAdditionalTenantModal}
          className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-[15px] font-medium text-[#B9476D] transition hover:-translate-y-0.5 hover:shadow-md"
        >
          + Add Additional Tenant
        </button>
      </form>
    </>
  );
}