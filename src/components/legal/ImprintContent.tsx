import { legalConfig } from "@/lib/legal";

export function ImprintContent() {
  const { providerName, providerAddressLines, phone, email, website, optional } = legalConfig;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Imprint (Impressum)</h1>
        <p className="text-sm text-muted-foreground">Information pursuant to § 5 DDG (Germany).</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Provider</h2>
        <div className="text-sm">
          <div className="font-medium">
            {providerName ? (
              providerName
            ) : (
              <span className="text-muted-foreground">
                Not set (configure <code className="font-mono">VITE_LEGAL_PROVIDER_NAME</code>)
              </span>
            )}
          </div>
          <div className="mt-1 space-y-0.5 text-muted-foreground">
            {providerAddressLines.length > 0 ? (
              providerAddressLines.map((line) => <div key={line}>{line}</div>)
            ) : (
              <div>
                Not set (configure <code className="font-mono">VITE_LEGAL_PROVIDER_ADDRESS</code>)
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <ul className="text-sm space-y-1">
          <li>
            Phone:{" "}
            {phone ? (
              <a className="underline underline-offset-4" href={`tel:${phone.replace(/\s+/g, "")}`}>
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">
                Not set (optional: <code className="font-mono">VITE_LEGAL_PHONE</code>)
              </span>
            )}
          </li>
          <li>
            Email:{" "}
            {email ? (
              <a className="underline underline-offset-4" href={`mailto:${email}`}>
                {email}
              </a>
            ) : (
              <span className="text-muted-foreground">
                Not set (configure <code className="font-mono">VITE_LEGAL_EMAIL</code>)
              </span>
            )}
          </li>
          {website && (
            <li>
              Website:{" "}
              <a className="underline underline-offset-4" href={website} target="_blank" rel="noreferrer">
                {website}
              </a>
            </li>
          )}
        </ul>
      </section>

      {(optional.vatId || optional.supervisoryAuthority) && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Additional information</h2>
          <ul className="text-sm space-y-1">
            {optional.vatId && <li>VAT ID (if applicable): {optional.vatId}</li>}
            {optional.supervisoryAuthority && <li>Supervisory authority (if applicable): {optional.supervisoryAuthority}</li>}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Professional information (if applicable)</h2>
        <div className="text-sm text-muted-foreground">
          If you provide services of a regulated profession, you may need to add details such as chamber membership and
          professional regulations.
        </div>
        <ul className="text-sm space-y-1">
          {optional.professionalInfo?.profession && <li>Profession: {optional.professionalInfo.profession}</li>}
          {optional.professionalInfo?.countryOfAward && <li>Country of award: {optional.professionalInfo.countryOfAward}</li>}
          <li>
            Chamber:{" "}
            {optional.professionalInfo?.chamber ? (
              optional.professionalInfo.chamber
            ) : (
              <span className="text-muted-foreground">
                Not set (optional: <code className="font-mono">VITE_LEGAL_CHAMBER</code>)
              </span>
            )}
          </li>
          <li>
            Professional rules:{" "}
            {optional.professionalInfo?.professionalRules ? (
              optional.professionalInfo.professionalRules
            ) : (
              <span className="text-muted-foreground">
                Not set (optional: <code className="font-mono">VITE_LEGAL_PROFESSIONAL_RULES</code>)
              </span>
            )}
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Liability</h2>
        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium">Liability for content</div>
            <p className="mt-1 text-muted-foreground">
              We make every effort to keep the information on these pages up to date. However, we cannot assume any
              liability for the accuracy, completeness, or timeliness of the content. As a service provider, we are
              responsible for our own content on these pages under the general laws.
            </p>
          </div>
          <div>
            <div className="font-medium">Liability for links</div>
            <p className="mt-1 text-muted-foreground">
              Our website may contain links to external websites. We have no influence over the content of those websites
              and therefore cannot assume any liability for their content. The respective provider or operator of the
              linked pages is always responsible for their content.
            </p>
          </div>
          <div>
            <div className="font-medium">Copyright</div>
            <p className="mt-1 text-muted-foreground">
              The content and works created by the site operator on these pages are subject to copyright law. Any
              duplication, processing, distribution, or any form of commercialization beyond the scope of copyright law
              requires the prior written consent of the respective author or creator.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Disclaimer</h2>
        <p className="text-sm text-muted-foreground">
          This page is provided as a template and does not constitute legal advice. Requirements may differ depending on
          your business model, hosting setup, and jurisdiction.
        </p>
      </section>
    </div>
  );
}

