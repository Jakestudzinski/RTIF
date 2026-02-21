"use client";

import { CheckCircle, ArrowLeft } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Payment Successful
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase! Our team will be in touch within 24 hours
          to schedule your consultation.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </a>
      </div>
    </div>
  );
}
