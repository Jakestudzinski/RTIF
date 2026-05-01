"use client";

import { Cpu, FileText, AlertCircle, Scale, ShieldCheck, CreditCard } from "lucide-react";
import Link from "next/link";

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              RTIF
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </nav>
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
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
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

export default function TermsOfService() {
  return (
    <main>
      <Navbar />
      
      <div className="pt-24 pb-20 bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-6">
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-600">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Research Technology Innovation & Fulfillment (&quot;RTIF,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your access to and use of our website, services, and payment gateway infrastructure.
              </p>
              <p className="text-gray-600 leading-relaxed mt-4">
                By accessing or using our services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use our services.
              </p>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <Scale className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Services Provided</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                RTIF provides the following services:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Custom technology systems design and assembly</li>
                <li>Technology consulting and advisory services</li>
                <li>Research and development services</li>
                <li>Order fulfillment and logistics services</li>
                <li>Payment gateway infrastructure for authorized clients</li>
                <li>Inventory management and warehousing</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                We reserve the right to modify, suspend, or discontinue any service at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Accounts and Registration</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To access certain services, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access or security breach</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, abusive, or illegal activity.
              </p>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Payment Terms</h2>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Pricing and Fees</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                All prices are stated in U.S. Dollars (USD) and are subject to change without notice. You agree to pay all fees and charges associated with your purchases at the prices in effect when the charges are incurred.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Payment Processing</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use third-party payment processors (Stripe and PayPal) to process payments. By making a purchase, you agree to the terms and conditions of these payment processors. We do not store complete credit card information on our servers.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Payment Gateway Services</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                For authorized clients using our payment gateway infrastructure:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>All transactions must comply with applicable payment card industry (PCI) standards</li>
                <li>Clients are responsible for maintaining valid API credentials and webhook configurations</li>
                <li>Platform fees and transaction fees apply as specified in client agreements</li>
                <li>Minimum transaction amounts may apply to prevent fraudulent or test transactions</li>
                <li>Stale or abandoned payment intents may be automatically canceled</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Refunds and Cancellations</h3>
              <p className="text-gray-600 leading-relaxed">
                Consultation services are generally non-refundable once delivered. For physical products and fulfillment services, refund policies will be specified in your service agreement. Requests for refunds must be submitted within 30 days of purchase.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptable Use Policy</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to use our services to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Transmit harmful, fraudulent, or deceptive content</li>
                <li>Interfere with or disrupt our services or servers</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Engage in any form of automated data collection (scraping, crawling)</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Upload or transmit viruses, malware, or other malicious code</li>
                <li>Engage in any activity that could harm our reputation or business</li>
              </ul>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Intellectual Property Rights</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                All content, features, and functionality on our website and services, including but not limited to text, graphics, logos, icons, images, audio clips, software, and data compilations, are the exclusive property of RTIF or its licensors and are protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-600 leading-relaxed">
                You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit any content from our services without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Level and Availability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                While we strive to maintain high availability and reliability:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>Scheduled maintenance may temporarily affect service availability</li>
                <li>We are not liable for delays or failures caused by circumstances beyond our control</li>
                <li>Service level agreements (SLAs) for enterprise clients are specified in separate agreements</li>
              </ul>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Limitation of Liability</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>RTIF SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM</li>
                <li>WE ARE NOT LIABLE FOR LOSSES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT</li>
                <li>WE ARE NOT LIABLE FOR THIRD-PARTY SERVICES, PRODUCTS, OR CONTENT</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some of the above limitations may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-600 leading-relaxed">
                You agree to indemnify, defend, and hold harmless RTIF, its officers, directors, employees, agents, and affiliates from any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys&apos; fees) arising from: (a) your use of our services; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any fraudulent or illegal activity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Warranties and Disclaimers</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                OUR SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Warranties of merchantability or fitness for a particular purpose</li>
                <li>Warranties of non-infringement</li>
                <li>Warranties regarding accuracy, reliability, or completeness of content</li>
                <li>Warranties that services will be uninterrupted or error-free</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                For physical products and custom builds, specific warranties may be provided in writing and will supersede this general disclaimer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dispute Resolution and Arbitration</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Any dispute arising from these Terms or our services shall be resolved through binding arbitration in accordance with the American Arbitration Association&apos;s Commercial Arbitration Rules. The arbitration shall take place in Maricopa County, Arizona.
              </p>
              <p className="text-gray-600 leading-relaxed">
                You agree to waive your right to participate in class action lawsuits or class-wide arbitration. Each party shall bear its own costs and attorneys&apos; fees unless otherwise awarded by the arbitrator.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Arizona, United States, without regard to its conflict of law provisions. Any legal action or proceeding shall be brought exclusively in the state or federal courts located in Maricopa County, Arizona.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We reserve the right to suspend or terminate your access to our services at any time, with or without cause or notice, for any reason including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Violation of these Terms</li>
                <li>Fraudulent, abusive, or illegal activity</li>
                <li>Extended periods of inactivity</li>
                <li>Requests by law enforcement or government agencies</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                Upon termination, your right to use our services will immediately cease. Provisions that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and updating the &quot;Last Updated&quot; date. Your continued use of our services after changes become effective constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Severability</h2>
              <p className="text-gray-600 leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Entire Agreement</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms, together with our Privacy Policy and any other agreements or policies referenced herein, constitute the entire agreement between you and RTIF regarding the use of our services and supersede all prior agreements and understandings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2">
                <p className="text-gray-900 font-semibold">Research Technology Innovation & Fulfillment</p>
                <p className="text-gray-600">37142 N Longview St, San Tan Valley, AZ 85140</p>
                <p className="text-gray-600">Email: contact@research-tif.com</p>
                <p className="text-gray-600">Phone: (480) 869-5842</p>
              </div>
            </section>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mt-8">
              <p className="text-sm text-gray-700">
                <strong>Acknowledgment:</strong> By using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
