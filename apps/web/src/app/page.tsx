import Link from "next/link";
import { Card, CardContent } from "@vkieu/mui";
import { Icon } from "@vkieu/mui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-outline-variant bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-bold text-surface-foreground">Strata</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full h-10 px-4 text-[14px] font-medium text-primary hover:bg-primary/8 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full h-10 px-4 text-[14px] font-medium bg-primary text-primary-foreground hover:shadow-sm transition-all"
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
            <h1 className="text-4xl lg:text-6xl font-bold text-surface-foreground tracking-tight">
              Enterprise Workforce Management,{" "}
              <span className="text-primary">Simplified</span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-surface-variant-foreground leading-relaxed max-w-2xl">
              Strata helps organizations manage their people, teams, capacity, and budgets
              in one unified platform. Built for enterprises with complex organizational structures.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full h-14 px-7 text-[14px] font-medium bg-primary text-primary-foreground hover:shadow-sm transition-all"
              >
                Start Free Trial
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full h-14 px-7 text-[14px] font-medium border border-outline text-primary hover:bg-primary/8 transition-all"
              >
                See Features
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-outline-variant bg-surface-container-low/50 py-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-surface-foreground text-center">
              Everything you need to manage your workforce
            </h2>
            <p className="mt-4 text-center text-surface-variant-foreground max-w-xl mx-auto">
              From org charts to capacity planning, Strata covers the full spectrum of workforce operations.
            </p>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Card key={feature.title} variant="outlined" interactive>
                  <CardContent>
                    <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center mb-4">
                      <Icon name={feature.icon} size={24} className="text-primary-container-foreground" />
                    </div>
                    <h3 className="text-[16px] leading-6 font-medium text-surface-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-5 text-surface-variant-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-surface-foreground">
              Ready to streamline your workforce management?
            </h2>
            <p className="mt-4 text-surface-variant-foreground max-w-lg mx-auto">
              Join organizations that trust Strata to manage their teams, budgets, and organizational structures.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full h-14 px-7 text-[14px] font-medium bg-primary text-primary-foreground hover:shadow-sm transition-all"
              >
                Get Started Today
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">S</span>
            </div>
            <span className="text-sm font-medium text-surface-foreground">Strata</span>
          </div>
          <p className="text-xs text-surface-variant-foreground">
            © {new Date().getFullYear()} Strata. Enterprise Workforce Management.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "apartment",
    title: "Organization Charts",
    description:
      "Interactive, drag-and-drop org charts with real-time hierarchy management and role visualization.",
  },
  {
    icon: "group",
    title: "People Management",
    description:
      "Centralized employee records with UIN tracking, department assignments, and employment lifecycle management.",
  },
  {
    icon: "bar_chart",
    title: "Capacity Planning",
    description:
      "Allocate team members across squads with percentage-based capacity tracking and utilization heatmaps.",
  },
  {
    icon: "payments",
    title: "Budget Tracking",
    description:
      "Department-level budget planning with actual spend calculations, variance tracking, and over-budget alerts.",
  },
  {
    icon: "calendar_month",
    title: "Leave Management",
    description:
      "Request and approve leave with overlap detection, team calendar views, and configurable policies.",
  },
  {
    icon: "admin_panel_settings",
    title: "Roles & Permissions",
    description:
      "Scoped access control with SELF, TEAM, and ORGANIZATION permission levels. SSO integration included.",
  },
];
