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
        <h1 className="text-[20px] font-semibold tracking-[-0.04em] sm:text-[25px]">
  Add Tenant
</h1>

<p className="mt-1 text-[13px] text-zinc-500 sm:text-[14px]">
  Add the tenant who will receive the portal invite.
</p>
      </div>

      <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        <div className="rounded-[22px] border border-[#E45E8A] bg-[#FFF8FB] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
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
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Additional Tenants
                </h3>

                <p className="mt-1 text-[13px] text-zinc-500">
                  Optional contacts only. No portal invites will be sent.
                </p>
              </div>

              <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-[13px] font-medium text-zinc-500">
                {additionalTenants.length} added
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {additionalTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex flex-col gap-3 rounded-xl bg-[#F8F9FA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-zinc-900">
                      {tenant.firstName} {tenant.lastName}
                    </p>

                    <p className="mt-1 break-words text-[12px] text-zinc-500">
                      {tenant.email || "No email"}{" "}
                      {tenant.phone ? `• ${tenant.phone}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAdditionalTenant(tenant.id)}
                    className="w-fit text-[12px] font-medium text-red-500"
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
          className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-[15px] font-medium text-[#B9476D] transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
        >
          + Add Additional Tenant
        </button>
      </form>
    </>
  );
}