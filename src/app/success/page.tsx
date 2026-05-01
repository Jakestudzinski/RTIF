"use client";

import { CheckCircle, ArrowLeft, Mail, Calendar } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PRODUCTS: Record<string, { name: string; price: number }> = {
  basic: {
    name: "Basic Technology Consultation",
    price: 149,
  },
  mid: {
    name: "Mid Tier Technology Consultation",
    price: 499,
  },
  allin: {
    name: "All-In Consultation",
    price: 1499,
  },
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "basic";
  const product = PRODUCTS[tier];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 px-4 py-12">
      <div className="max-w-lg w-full text-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for purchasing the <strong>{product.name}</strong>
        </p>

        <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            What happens next?
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Confirmation Email
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You&apos;ll receive a confirmation email with your receipt and next steps
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Schedule Your Session
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Our team will contact you within 24 hours to schedule your consultation
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
          <a
            href="mailto:contact@research-tif.com"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-primary-300 hover:text-primary-600 transition-colors"
          >
            <Mail className="w-4 h-4" /> Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
