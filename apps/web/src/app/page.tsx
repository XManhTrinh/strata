import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-bold text-foreground">Strata</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="h-9 px-4 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-6xl mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground tracking-tight">
              Enterprise Workforce Management,{" "}
              <span className="text-primary">Simplified</span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Strata helps organizations manage their people, teams, capacity, and budgets 
              in one unified platform. Built for enterprises with complex organizational structures.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="h-12 px-8 rounded-md bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="h-12 px-8 rounded-md border border-border text-base font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center"
              >
                See Features
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-card/50 py-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-foreground text-center">
              Everything you need to manage your workforce
            </h2>
            <p className="mt-4 text-center text-muted-foreground max-w-xl mx-auto">
              From org charts to capacity planning, Strata covers the full spectrum of workforce operations.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Ready to streamline your workforce management?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
              Join organizations that trust Strata to manage their teams, budgets, and organizational structures.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex h-12 px-8 rounded-md bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors items-center"
            >
              Get Started Today
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">S</span>
            </div>
            <span className="text-sm font-medium text-foreground">Strata</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Strata. Enterprise Workforce Management.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "🏢",
    title: "Organization Charts",
    description:
      "Interactive, drag-and-drop org charts with real-time hierarchy management and role visualization.",
  },
  {
    icon: "👥",
    title: "People Management",
    description:
      "Centralized employee records with UIN tracking, department assignments, and employment lifecycle management.",
  },
  {
    icon: "📊",
    title: "Capacity Planning",
    description:
      "Allocate team members across squads with percentage-based capacity tracking and utilization heatmaps.",
  },
  {
    icon: "💰",
    title: "Budget Tracking",
    description:
      "Department-level budget planning with actual spend calculations, variance tracking, and over-budget alerts.",
  },
  {
    icon: "📅",
    title: "Leave Management",
    description:
      "Request and approve leave with overlap detection, team calendar views, and configurable policies.",
  },
  {
    icon: "🔐",
    title: "Roles & Permissions",
    description:
      "Scoped access control with SELF, TEAM, and ORGANIZATION permission levels. SSO integration included.",
  },
];
