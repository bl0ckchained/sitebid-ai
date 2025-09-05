"use client";

import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { useState, useEffect } from "react";

// Icons as React components
const CalculatorIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM21 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ProjectCard Component
const ProjectCard = ({ title, description, link, accent, icon }: { title: string; description: string; link: string; accent: string; icon: string }) => (
  <Link
    href={link}
    className={`group relative overflow-hidden rounded-xl bg-slate-800/50 border border-slate-700/50 p-6 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-${accent}-500/10`}
  >
    <div className="flex items-center gap-4 mb-4">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors duration-300">
        {title}
      </h3>
    </div>
    <p className="text-slate-300 leading-relaxed">
      {description}
    </p>
    <div className="mt-4 flex items-center text-blue-400 group-hover:text-blue-300 transition-colors duration-300">
      <span className="text-sm font-medium">Get Estimate</span>
      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </Link>
);

// BenefitCard Component
const BenefitCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="text-center p-6 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/50 transition-all duration-300 hover:scale-105">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4 text-blue-400">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-white mb-3">
      {title}
    </h3>
    <p className="text-slate-300 leading-relaxed">
      {description}
    </p>
  </div>
);

export default function Home() {
  const brandName = COMPANY?.name || "SiteBid AI";
  const logoUrl = COMPANY?.logoUrl || "";
  const phone = COMPANY?.phone || "";
  const email = COMPANY?.email || "";
  const addressLines = Array.isArray(COMPANY?.addressLines) ? COMPANY!.addressLines : [];
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Top Nav */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 shadow-lg' : 'bg-transparent'}`}>
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group animate-fade-in">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="h-10 w-10 rounded-lg ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-300"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center font-bold text-white shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                  SB
                </div>
              )}
              <span className="text-2xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">SiteBid</span>{" "}
                <span className="text-white">AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 text-sm">
              <Link href="/estimate/new" className="text-slate-300 hover:text-white transition-colors duration-200 flex items-center gap-2">
                <CalculatorIcon />
                Estimators
              </Link>
              <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors duration-200">
                Pricing
              </Link>
              <Link href="/docs" className="text-slate-300 hover:text-white transition-colors duration-200">
                Docs
              </Link>
              <Link href="/company" className="text-slate-300 hover:text-white transition-colors duration-200">
                Company
              </Link>
              <Link href="/company#contact" className="text-slate-300 hover:text-white transition-colors duration-200">
                Contact
              </Link>
              <Link
                href="/estimate/new/driveway"
                className="btn btn-primary ml-4"
              >
                Start Estimate
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white transition-colors duration-200"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-slate-700/50 pt-4 animate-slide-up">
              <div className="flex flex-col gap-4">
                <Link href="/estimate/new" className="text-slate-300 hover:text-white transition-colors duration-200 flex items-center gap-2">
                  <CalculatorIcon />
                  Estimators
                </Link>
                <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors duration-200">
                  Pricing
                </Link>
                <Link href="/docs" className="text-slate-300 hover:text-white transition-colors duration-200">
                  Docs
                </Link>
                <Link href="/company" className="text-slate-300 hover:text-white transition-colors duration-200">
                  Company
                </Link>
                <Link href="/company#contact" className="text-slate-300 hover:text-white transition-colors duration-200">
                  Contact
                </Link>
                <Link
                  href="/estimate/new/driveway"
                  className="btn btn-primary w-fit"
                >
                  Start Estimate
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-32 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              AI-Powered Construction Estimating
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-bounce-in">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                SiteBid AI
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-4 text-slate-300 max-w-3xl mx-auto animate-slide-up" style={{animationDelay: '0.2s'}}>
              Professional Estimating for Excavation Contractors
            </p>
            
            <p className="text-lg mb-12 text-slate-400 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.4s'}}>
              Generate accurate, professional bids for driveways, culverts, ponds, basements, trench work, and septic systems with AI-powered calculations.
            </p>

            {/* Contact Info */}
            {(phone || email) && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up" style={{animationDelay: '0.6s'}}>
                {phone && (
                  <a
                    href={`tel:${phone.replace(/\s+/g, "")}`}
                    className="px-6 py-3 rounded-lg border border-slate-600/50 bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-300 text-slate-200 backdrop-blur-sm"
                  >
                    📞 {phone}
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="px-6 py-3 rounded-lg border border-slate-600/50 bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-300 text-slate-200 backdrop-blur-sm"
                  >
                    ✉️ {email}
                  </a>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{animationDelay: '0.8s'}}>
              <Link
                href="/estimate/new/driveway"
                className="btn btn-primary text-lg px-8 py-4 shadow-xl shadow-blue-500/25"
              >
                Start Driveway Estimate
              </Link>
              <Link
                href="/estimate/new"
                className="btn btn-secondary text-lg px-8 py-4 bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50 backdrop-blur-sm"
              >
                Browse All Estimators
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Built-in Estimators
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Choose a project type to generate detailed, professional bids. Each estimator includes contractor and customer details with instant PDF export.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProjectCard
              title="Driveways"
              description="Strip, grade, base/top lifts, trucking, compaction & markup—perfectly calculated."
              link="/estimate/new/driveway"
              accent="blue"
              icon="🛣️"
            />
            <ProjectCard
              title="Culverts"
              description="Trench, bedding, pipe, restoration (asphalt/riprap), end sections."
              link="/estimate/new/culvert"
              accent="emerald"
              icon="🌉"
            />
            <ProjectCard
              title="Ponds"
              description="Bowl cuts, slopes, beach/stone ring, overflow pipe, clay import."
              link="/estimate/new/pond"
              accent="cyan"
              icon="🏞️"
            />
            <ProjectCard
              title="Basements"
              description="Overdig box + ramp, under-slab stone, perimeter drain, trucking."
              link="/estimate/new/basement"
              accent="amber"
              icon="🏠"
            />
            <ProjectCard
              title="Trench Work"
              description="Linear trench with pipe, bedding, tracer/warning tape & restoration."
              link="/estimate/new/trench"
              accent="rose"
              icon="⚡"
            />
            <ProjectCard
              title="Septic Systems"
              description="Gravel or chamber systems, tank & d-box, fabric, hauling & fees."
              link="/estimate/new/septic"
              accent="violet"
              icon="🔧"
            />
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-white">
              Why Choose SiteBid AI?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              icon={<DocumentIcon />}
              title="Professional Branding"
              description="Each estimate includes your company logo, contact info, and site address directly in the bid preview. Your brand, every time."
            />
            <BenefitCard
              icon={<TruckIcon />}
              title="One-Click Export"
              description="Every quote supports browser print and instant PDF export. Share professional estimates with clients immediately."
            />
            <BenefitCard
              icon={<CalculatorIcon />}
              title="Complete Calculations"
              description="Overhead, contingency, profit, and pass-through permit fees are built-in—no spreadsheets required."
            />
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl p-12 border border-blue-500/20 backdrop-blur-sm">
