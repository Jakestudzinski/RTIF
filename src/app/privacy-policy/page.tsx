"use client";

import { Cpu, Shield, Lock, Eye, Database, Mail } from "lucide-react";
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

export default function PrivacyPolicy() {
  return (
    <main>
      <Navbar />
      
      <div className="pt-24 pb-20 bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-6">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-600">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-600 leading-relaxed">
                Research Technology Innovation & Fulfillment (&quot;RTIF,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or engage with our payment gateway infrastructure.
              </p>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <Database className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Personal Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Contact us through our website forms</li>
                <li>Purchase consultation services or products</li>
                <li>Subscribe to our communications</li>
                <li>Engage with our customer support</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                This information may include: name, email address, phone number, shipping address, billing address, and payment information.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Payment Information</h3>
              <p className="text-gray-600 leading-relaxed">
                When you make a purchase, payment information is processed through our secure payment gateway. We use third-party payment processors (Stripe and PayPal) to handle transactions. We do not store complete credit card numbers or sensitive payment data on our servers. Payment processors may collect and store payment information in accordance with their own privacy policies.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">Automatically Collected Information</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                When you visit our website, we may automatically collect certain information about your device, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>IP address and browser type</li>
                <li>Operating system and device information</li>
                <li>Pages visited and time spent on pages</li>
                <li>Referring website addresses</li>
                <li>Clickstream data and interaction patterns</li>
              </ul>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <Eye className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Process and fulfill your orders and service requests</li>
                <li>Communicate with you about your orders, services, and account</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Improve our website, products, and services</li>
                <li>Detect, prevent, and address technical issues or fraud</li>
                <li>Comply with legal obligations and enforce our terms</li>
                <li>Provide customer support and respond to inquiries</li>
              </ul>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <Lock className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Data Security</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li>Encryption of data in transit using SSL/TLS protocols</li>
                <li>Secure payment processing through PCI-compliant processors</li>
                <li>Regular security assessments and monitoring</li>
                <li>Access controls and authentication requirements</li>
                <li>Employee training on data protection practices</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing and Disclosure</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li><strong>Service Providers:</strong> We share information with trusted third-party service providers who assist us in operating our website, conducting business, or servicing you (e.g., payment processors, shipping companies, email service providers).</li>
                <li><strong>Legal Requirements:</strong> We may disclose information when required by law, court order, or governmental request, or to protect our rights, property, or safety.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</li>
                <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit consent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking Technologies</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small data files stored on your device. We use:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                You can control cookies through your browser settings. Disabling cookies may limit your ability to use certain features of our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Privacy Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                To exercise these rights, please contact us at the information provided below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Links</h2>
              <p className="text-gray-600 leading-relaxed">
                Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child without parental consent, we will take steps to delete that information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-600 leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-600 leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We take appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. Your continued use of our services after any changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <div className="flex items-start gap-3 mb-4">
                <Mail className="w-6 h-6 text-primary-600 mt-1 flex-shrink-0" />
                <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-6 space-y-2">
                <p className="text-gray-900 font-semibold">Research Technology Innovation & Fulfillment</p>
                <p className="text-gray-600">37142 N Longview St, San Tan Valley, AZ 85140</p>
                <p className="text-gray-600">Email: contact@research-tif.com</p>
                <p className="text-gray-600">Phone: (480) 869-5842</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
