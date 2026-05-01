"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Cpu, CreditCard, Lock, ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const PRODUCTS: Record<
  string,
  { name: string; description: string; price: number; features: string[] }
> = {
  basic: {
    name: "Basic Technology Consultation",
    description: "A focused 1-hour session to assess your technology needs.",
    price: 149,
    features: [
      "1-hour consultation session",
      "Technology assessment",
      "Written summary & recommendations",
      "Email follow-up support",
    ],
  },
  mid: {
    name: "Mid Tier Technology Consultation",
    description: "A comprehensive half-day engagement for deeper planning.",
    price: 499,
    features: [
      "Half-day consultation",
      "Full systems review",
      "Architecture planning",
      "Detailed roadmap document",
      "2 weeks email support",
    ],
  },
  allin: {
    name: "All-In Consultation",
    description: "Full-service multi-day engagement with ongoing support.",
    price: 1499,
    features: [
      "Multi-day on-site or remote",
      "Complete systems build planning",
      "Fulfillment strategy & setup",
      "Implementation support",
      "30 days priority support",
      "Dedicated account manager",
    ],
  },
};

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

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
            href="/#pricing"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </Link>
        </div>
      </div>
    </nav>
  );
}

function CheckoutForm({
  clientSecret,
  tier,
}: {
  clientSecret: string;
  tier: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = PRODUCTS[tier];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success?tier=${tier}`,
        },
      });

      if (submitError) {
        setError(submitError.message || "Payment failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Pay ${product.price.toLocaleString()}
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "basic";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const product = PRODUCTS[tier];

  useEffect(() => {
    if (!product) {
      setError("Invalid product selection");
      setLoading(false);
      return;
    }

    async function createPaymentIntent() {
      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to initialize payment");
        }

        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize checkout"
        );
      } finally {
        setLoading(false);
      }
    }

    createPaymentIntent();
  }, [tier, product]);

  if (!product) {
    return (
      <main className="min-h-screen pt-24 pb-20 bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Product
          </h1>
          <p className="text-gray-600 mb-6">
            The selected product could not be found.
          </p>
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-20 bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600">{product.description}</p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    What&apos;s Included:
                  </h4>
                  <ul className="space-y-2">
                    {product.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    ${product.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-primary-600">
                    ${product.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Payment Details
                  </h2>
                  <p className="text-sm text-gray-600">
                    Complete your purchase securely
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-800 mb-4">{error}</p>
                  <Link
                    href="/#pricing"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Pricing
                  </Link>
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#2563eb",
                        borderRadius: "0.75rem",
                      },
                    },
                  }}
                >
                  <CheckoutForm clientSecret={clientSecret} tier={tier} />
                </Elements>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>SSL Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
