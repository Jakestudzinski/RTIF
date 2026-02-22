"use client";

import {
  Monitor,
  Package,
  Cpu,
  Truck,
  Settings,
  BarChart3,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Menu,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { useState } from "react";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: "Home", href: "#home" },
    { label: "Services", href: "#services" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#home" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              RTIF
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pb-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-gray-600 hover:text-primary-600"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMobileOpen(false)}
            className="mt-2 inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
          >
            Get Started <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section
      id="home"
      className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 -z-10" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-40 -z-10" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-30 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-6">
          <Cpu className="w-3.5 h-3.5" />
          Technology &middot; Innovation &middot; Fulfillment
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Research Technology
          <br />
          <span className="text-primary-600">Innovation &amp; Fulfillment</span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
          From custom technology builds to complete order fulfillment — RTIF is
          your end-to-end partner for turning ideas into delivered products.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            Our Services <ChevronRight className="w-4 h-4" />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-primary-300 hover:text-primary-600 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </section>
  );
}

const services = [
  {
    icon: Monitor,
    title: "Custom Systems Builds",
    description:
      "Bespoke hardware and software systems designed and assembled to your exact specifications. From workstations to server infrastructure.",
  },
  {
    icon: Settings,
    title: "Technology Solutions",
    description:
      "End-to-end technology consulting, integration, and deployment. We architect solutions that scale with your business.",
  },
  {
    icon: Cpu,
    title: "Research & Development",
    description:
      "Cutting-edge R&D services to prototype, test, and refine new technology products before they go to market.",
  },
  {
    icon: Package,
    title: "Order Fulfillment",
    description:
      "Complete pick, pack, and ship fulfillment for all orders. We handle inventory, packaging, and delivery logistics.",
  },
  {
    icon: Truck,
    title: "Logistics & Shipping",
    description:
      "Reliable shipping partnerships and real-time tracking. We ensure your products reach customers on time, every time.",
  },
  {
    icon: BarChart3,
    title: "Inventory Management",
    description:
      "Real-time inventory tracking and reporting. Stay on top of stock levels, reorder points, and warehouse efficiency.",
  },
];

function Services() {
  return (
    <section id="services" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-2">
            What We Do
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Technology Builds &amp; Fulfillment
          </h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            We combine deep technical expertise with streamlined fulfillment
            operations to deliver complete solutions under one roof.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s) => (
            <div
              key={s.title}
              className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:bg-primary-100 transition-colors">
                <s.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {s.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const stats = [
  { value: "500+", label: "Systems Built" },
  { value: "10K+", label: "Orders Fulfilled" },
  { value: "99.5%", label: "On-Time Delivery" },
  { value: "24/7", label: "Support" },
];

function About() {
  return (
    <section id="about" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-2">
              About RTIF
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Innovation from concept
              <br />
              to customer
            </h2>
            <p className="mt-6 text-gray-600 leading-relaxed">
              Research Technology Innovation &amp; Fulfillment (RTIF) bridges the
              gap between technology creation and product delivery. We design,
              build, and ship — so you can focus on growing your business.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Whether you need a single custom workstation or full-scale
              fulfillment for thousands of orders, our team has the expertise and
              infrastructure to deliver with precision and speed.
            </p>
            <a
              href="#contact"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
            >
              Work With Us <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100"
              >
                <p className="text-3xl font-extrabold text-primary-600">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-2">
              Get In Touch
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Let&apos;s build something great
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Ready to start your next project or need fulfillment support?
              Reach out and our team will get back to you within 24 hours.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm">contact@research-tif.com</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm">(480) 869-5842</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm">37142 N Longview St, San Tan Valley, AZ 85140</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="How can we help?"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Tell us about your project..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

const pricingTiers = [
  {
    tier: "basic",
    name: "Basic Technology Consultation",
    price: "$149",
    description: "A focused 1-hour session to assess your technology needs.",
    features: [
      "1-hour consultation session",
      "Technology assessment",
      "Written summary & recommendations",
      "Email follow-up support",
    ],
    highlighted: false,
  },
  {
    tier: "mid",
    name: "Mid Tier Technology Consultation",
    price: "$499",
    description: "A comprehensive half-day engagement for deeper planning.",
    features: [
      "Half-day consultation",
      "Full systems review",
      "Architecture planning",
      "Detailed roadmap document",
      "2 weeks email support",
    ],
    highlighted: true,
  },
  {
    tier: "allin",
    name: "All-In Consultation",
    price: "$1,499",
    description: "Full-service multi-day engagement with ongoing support.",
    features: [
      "Multi-day on-site or remote",
      "Complete systems build planning",
      "Fulfillment strategy & setup",
      "Implementation support",
      "30 days priority support",
      "Dedicated account manager",
    ],
    highlighted: false,
  },
];

function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(tier: string) {
    setLoading(tier);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-2">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Consultation Packages
          </h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Choose the consultation tier that fits your needs. Every package
            includes expert guidance from our technology and fulfillment team.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {pricingTiers.map((t) => (
            <div
              key={t.tier}
              className={`relative flex flex-col rounded-2xl p-8 border transition-all duration-200 ${
                t.highlighted
                  ? "bg-primary-600 text-white border-primary-600 shadow-xl shadow-primary-600/20 scale-[1.02]"
                  : "bg-white text-gray-900 border-gray-200 hover:border-primary-200 hover:shadow-md"
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-primary-600 text-xs font-bold shadow-sm">
                  Most Popular
                </span>
              )}
              <h3
                className={`text-lg font-bold mb-1 ${
                  t.highlighted ? "text-white" : "text-gray-900"
                }`}
              >
                {t.name}
              </h3>
              <p
                className={`text-sm mb-6 ${
                  t.highlighted ? "text-primary-100" : "text-gray-500"
                }`}
              >
                {t.description}
              </p>
              <p className="mb-6">
                <span className="text-4xl font-extrabold">{t.price}</span>
                <span
                  className={`text-sm ml-1 ${
                    t.highlighted ? "text-primary-200" : "text-gray-400"
                  }`}
                >
                  one-time
                </span>
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        t.highlighted ? "text-primary-200" : "text-primary-600"
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(t.tier)}
                disabled={loading === t.tier}
                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  t.highlighted
                    ? "bg-white text-primary-600 hover:bg-primary-50"
                    : "bg-primary-600 text-white hover:bg-primary-700"
                } disabled:opacity-70`}
              >
                {loading === t.tier ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {loading === t.tier ? "Redirecting..." : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">RTIF</span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Research Technology Innovation &amp;
            Fulfillment. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <Pricing />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
