import { legalConfig } from "@/lib/legal";

const Privacy = () => {
  const { providerName, providerAddressLines, email } = legalConfig;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy (Datenschutzerklärung)</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This policy describes how personal data is processed when using this service.
        </p>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Controller</h2>
          <div className="text-sm">
            <div className="font-medium">{providerName}</div>
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              {providerAddressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
            <div className="mt-2 text-sm">
              Contact:{" "}
              {email ? (
                <a className="underline underline-offset-4" href={`mailto:${email}`}>
                  {email}
                </a>
              ) : (
                <span className="text-muted-foreground">
                  Not set (configure <code className="font-mono">VITE_LEGAL_EMAIL</code>)
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Cookies and tracking</h2>
          <p className="text-sm text-muted-foreground">
            We do not use tracking cookies or similar technologies for analytics, advertising, or cross-site tracking.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Processing when you use the service</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <div className="font-medium text-foreground">Server logs</div>
              <p className="mt-1">
                When you access the service, technical data may be processed (e.g., IP address, time of access, requested
                page, user agent) to deliver the site and ensure security and stability.
              </p>
            </div>
            <div>
              <div className="font-medium text-foreground">Account and authentication</div>
              <p className="mt-1">
                If you create an account or sign in, your authentication data (such as email address and session tokens)
                is processed to provide login and session management. Session information may be stored in your browser
                (for example in local storage) to keep you signed in.
              </p>
            </div>
            <div>
              <div className="font-medium text-foreground">Content you create</div>
              <p className="mt-1">
                If you use features like calendars and notes, the content you enter and related metadata is stored and
                processed to provide the functionality of the service.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Recipients / processors</h2>
          <p className="text-sm text-muted-foreground">
            Depending on how you deploy this service, hosting providers and infrastructure vendors (e.g., database/auth
            providers) may process data on our behalf as processors. If you self-host, you are responsible for choosing
            and documenting your processors.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Legal bases</h2>
          <p className="text-sm text-muted-foreground">
            Processing is based on GDPR Art. 6(1)(b) (performance of a contract / providing the service) and Art. 6(1)(f)
            (legitimate interests in secure and reliable operation). Where consent is required, Art. 6(1)(a) applies.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Retention</h2>
          <p className="text-sm text-muted-foreground">
            We retain personal data only as long as necessary to provide the service, comply with legal obligations, or
            resolve disputes. You can request deletion of your account data unless legal retention obligations apply.
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Your rights</h2>
          <p className="text-sm text-muted-foreground">
            You have the right to access, rectification, erasure, restriction, data portability, and to object to certain
            processing, as well as the right to lodge a complaint with a supervisory authority.
          </p>
        </section>

        <section className="mt-10 space-y-2">
          <h2 className="text-lg font-semibold">Disclaimer</h2>
          <p className="text-sm text-muted-foreground">
            This page is provided as a template and does not constitute legal advice. Requirements may differ depending
            on your business model, hosting setup, and jurisdiction.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Privacy;

