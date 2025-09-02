"use client";

import Link from "next/link";
import { COMPANY } from "@/lib/company";

export default function Home() {
  const brandName = COMPANY?.name || "SiteBid AI";
  const logoUrl = COMPANY?.logoUrl || "";
  const phone = COMPANY?.phone || "";
  const email = COMPANY?.email || "";
  const addressLines = Array.isArray(COMPANY?.addressLines) ? COMPANY!.addressLines : [];

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="h-10 w-10 rounded-md ring-1 ring-white/10"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-indigo-600 grid place-items-center font-bold">
                SB
              </div>
            )}
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-indigo-500">SiteBid</span>{" "}
              <span className="text-white">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/estimate/new" className="text-gray-300 hover:text-white">
              Estimators
            </Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-300 hover:text-white">
              Docs
            </Link>
            <Link href="/company" className="text-gray-300 hover:text-white">
              Company
            </Link>
            <Link href="/company#contact" className="text-gray-300 hover:text-white">
              Contact
            </Link>
            <Link
              href="/estimate/new/driveway"
              className="px-3 py-2 bg-indigo-600 rounded-lg font-semibold hover:scale-105 transition"
            >
              Start an Estimate
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-10">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-6xl font-extrabold mb-6 text-indigo-500">
            SiteBid AI
          </h1>
          <p className="text-xl mb-2 text-gray-400">
            AI-Powered Estimating for Excavation Contractors
          </p>
          <p className="text-lg mb-6 text-gray-300">
            Accurate, fast bids for driveways, culverts, ponds, basements, trench work, and septic systems.
          </p>

          {/* Platform contact (platform-only, not contractor info) */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition text-gray-200"
              >
                📞 {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition text-gray-200"
              >
                ✉️ {email}
              </a>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/estimate/new/driveway"
              className="px-6 py-3 bg-indigo-600 text-lg font-semibold rounded-lg shadow-lg hover:scale-105 transform transition"
            >
              Start Driveway Estimate
            </Link>
            <Link
              href="/estimate/new"
              className="px-6 py-3 bg-white/10 border border-white/10 text-lg font-semibold rounded-lg shadow-lg hover:bg-white/15 transition"
            >
              Browse All Estimators
            </Link>
          </div>
        </section>

        {/* Specializations */}
        <section className="mt-16 space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-gray-100">
              Built-in Estimators
            </h2>
            <p className="text-lg mb-8 text-gray-300">
              Choose a scope to generate a detailed, professional bid. Each estimator collects contractor & customer details right on the page.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProjectCard
              title="Driveways"
              description="Strip, grade, base/top lifts, trucking, compaction & markup—dialed."
              link="/estimate/new/driveway"
              accent="indigo"
            />
            <ProjectCard
              title="Culverts"
              description="Trench, bedding, pipe, restoration (asphalt/riprap), end sections."
              link="/estimate/new/culvert"
              accent="emerald"
            />
            <ProjectCard
              title="Ponds"
              description="Bowl cuts, slopes, beach/stone ring, overflow pipe, clay import."
              link="/estimate/new/pond"
              accent="cyan"
            />
            <ProjectCard
              title="Basements"
              description="Overdig box + ramp, under-slab stone, perimeter drain, trucking."
              link="/estimate/new/basement"
              accent="amber"
            />
            <ProjectCard
              title="Trench-Work"
              description="Linear trench with pipe, bedding, tracer/warning tape & restoration."
              link="/estimate/new/trench"
              accent="rose"
            />
            <ProjectCard
              title="Septic Systems"
              description="Gravel or chamber systems, tank & d-box, fabric, hauling & fees."
              link="/estimate/new/septic"
              accent="violet"
            />
          </div>
        </section>

        {/* Why section */}
        <section className="mt-20">
          <div className="grid md:grid-cols-3 gap-6">
            <WhyCard
              title="Your branding, every bid"
              body="Each estimator includes a Company & Customer form and renders your logo, contact info, and site address directly in the BidPreview."
            />
            <WhyCard
              title="Click-to-PDF + Print"
              body="Every quote view supports browser print and a one-click PDF export button."
            />
            <WhyCard
              title="Markups, permits, extras"
              body="Overhead, contingency, profit, and pass-through permit fees are first-class fields—no spreadsheets required."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-100">
            Ready to Start?
          </h2>
          <p className="text-xl mb-8 text-gray-300">
            Save time and money with fast, consistent, professional bids.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/estimate/new"
              className="px-8 py-4 bg-orange-600 text-lg font-semibold rounded-lg shadow-lg hover:scale-105 transform transition"
            >
              Get Your Estimate
            </Link>
            <Link
              href="/company"
              className="px-8 py-4 bg-white/10 border border-white/10 text-lg font-semibold rounded-lg shadow-lg hover:bg-white/15 transition"
            >
              About SiteBid AI
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-800">
        <div className="mx-auto max-w-7xl p-8 text-center sm:text-left grid gap-6 sm:grid-cols-4">
          <div>
            <div className="text-2xl font-bold">{brandName}</div>
            <div className="text-gray-400 text-sm mt-2">
              AI estimating built for dirt-moving pros.
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">Product</div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li><Link className="hover:text-white" href="/estimate/new">Estimators</Link></li>
              <li><Link className="hover:text-white" href="/pricing">Pricing</Link></li>
              <li><Link className="hover:text-white" href="/docs">Docs</Link></li>
              <li><Link className="hover:text-white" href="/changelog">Changelog</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold mb-2">Company</div>
            <ul className="text-gray-300 text-sm space-y-1">
              <li><Link className="hover:text-white" href="/company">Company</Link></li>
              <li><Link className="hover:text-white" href="/company#contact">Contact</Link></li>
              <li><Link className="hover:text-white" href="/legal/terms">Terms</Link></li>
              <li><Link className="hover:text-white" href="/legal/privacy">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold mb-2">Contact</div>
            <ul className="text-gray-300 text-sm space-y-1">
              {phone && (
                <li>
                  <a className="hover:text-white" href={`tel:${phone}`}>{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <a className="hover:text-white" href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {addressLines.length > 0 && (
                <li className="text-gray-400">
                  {addressLines.map((l, i) => <div key={i}>{l}</div>)}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm pb-8">
          © {new Date().getFullYear()} {brandName} — All Rights Reserved
        </div>
      </footer>
    </div>
  );
}

function ProjectCard({
  title,
  description,
  link,
  accent = "indigo",
}: {
  title: string;
  description: string;
  link: string;
  accent?: "indigo" | "emerald" | "cyan" | "amber" | "rose" | "violet";
}) {
  const ring =
    accent === "indigo" ? "ring-indigo-600" :
    accent === "emerald" ? "ring-emerald-600" :
    accent === "cyan" ? "ring-cyan-600" :
    accent === "amber" ? "ring-amber-600" :
    accent === "rose" ? "ring-rose-600" : "ring-violet-600";

  const badgeBg =
    accent === "indigo" ? "bg-indigo-600/20" :
    accent === "emerald" ? "bg-emerald-600/20" :
    accent === "cyan" ? "bg-cyan-600/20" :
    accent === "amber" ? "bg-amber-600/20" :
    accent === "rose" ? "bg-rose-600/20" : "bg-violet-600/20";

  const badgeDot =
    accent === "indigo" ? "bg-indigo-400" :
    accent === "emerald" ? "bg-emerald-400" :
    accent === "cyan" ? "bg-cyan-400" :
    accent === "amber" ? "bg-amber-400" :
    accent === "rose" ? "bg-rose-400" : "bg-violet-400";

  return (
    <div className="bg-gray-800/70 text-gray-200 p-6 rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transform transition ring-1 ring-white/5">
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ${badgeBg}`}>
        <span className={`h-2 w-2 rounded-full ${badgeDot}`} />
        Estimator
      </div>
      <h3 className="text-2xl font-semibold mt-3 mb-3">{title}</h3>
      <p className="text-gray-400 mb-5">{description}</p>
      <Link
        href={link}
        className={`inline-block px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 transition border ${ring}`}
      >
        Get Estimate
      </Link>
    </div>
  );
}

function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-gray-800/70 p-6 rounded-xl ring-1 ring-white/5">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{body}</p>
    </div>
  );
}
