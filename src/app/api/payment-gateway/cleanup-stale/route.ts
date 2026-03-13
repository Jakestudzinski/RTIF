import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAllClients } from "../clients";

const GATEWAY_ADMIN_SECRET = process.env.GATEWAY_ADMIN_SECRET || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET & POST /api/payment-gateway/cleanup-stale
 *
 * Cancels stale PaymentIntents that are still in "requires_payment_method"
 * status and were created by the payment gateway (metadata.source = "payment-gateway").
 *
 * Iterates through the gateway default Stripe account and any client-specific
 * Stripe accounts, cancelling PIs older than the configured threshold.
 *
 * Auth (one of):
 *   - x-admin-secret header matching GATEWAY_ADMIN_SECRET (manual calls)
 *   - Authorization: Bearer <CRON_SECRET> (Vercel Cron)
 *
 * Query params:
 *   maxAgeHours  - Cancel PIs older than this (default 24)
 *   dryRun       - If "true", list stale PIs without cancelling (default false)
 *
 * Response:
 *   canceled     - number of PIs canceled
 *   skipped      - number of PIs skipped (non-cancellable state)
 *   errors       - number of PIs that failed to cancel
 *   details      - array of { id, clientId, age, status, action }
 */

function isAuthorized(request: NextRequest): boolean {
  // Check x-admin-secret header (manual calls)
  const adminSecret = request.headers.get("x-admin-secret");
  if (GATEWAY_ADMIN_SECRET && adminSecret === GATEWAY_ADMIN_SECRET) {
    return true;
  }
  // Check Authorization: Bearer <CRON_SECRET> (Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }
  return false;
}

async function handleCleanup(request: NextRequest): Promise<NextResponse> {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxAgeHours = parseInt(searchParams.get("maxAgeHours") || "24", 10);
    const dryRun = searchParams.get("dryRun") === "true";

    if (maxAgeHours < 1 || maxAgeHours > 720) {
      return NextResponse.json(
        { error: "maxAgeHours must be between 1 and 720" },
        { status: 400 }
      );
    }

    const cutoff = Math.floor(Date.now() / 1000) - maxAgeHours * 3600;

    console.log(
      `[CLEANUP] Starting stale PI cleanup: maxAge=${maxAgeHours}h, dryRun=${dryRun}, cutoff=${new Date(cutoff * 1000).toISOString()}`
    );

    // Collect unique Stripe secret keys to scan
    const stripeAccounts: Record<string, string> = {};

    // Gateway default account
    const defaultKey = process.env.STRIPE_SECRET_KEY || "";
    if (defaultKey) {
      stripeAccounts["gateway-default"] = defaultKey;
    }

    // Client-specific accounts
    for (const client of getAllClients()) {
      if (client.stripeSecretKey) {
        stripeAccounts[`client-${client.id}`] = client.stripeSecretKey;
      }
    }

    let canceled = 0;
    let skipped = 0;
    let errors = 0;
    const details: Array<{
      id: string;
      clientId: string;
      age: string;
      status: string;
      action: string;
    }> = [];

    for (const [accountLabel, secretKey] of Object.entries(stripeAccounts)) {
      const stripe = new Stripe(secretKey, {
        apiVersion: "2026-01-28.clover",
      });

      console.log(`[CLEANUP] Scanning account: ${accountLabel}`);

      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const listParams: Stripe.PaymentIntentListParams = {
          limit: 100,
          created: { lt: cutoff },
        };
        if (startingAfter) {
          listParams.starting_after = startingAfter;
        }

        const paymentIntents = await stripe.paymentIntents.list(listParams);

        for (const pi of paymentIntents.data) {
          // Only process PIs created by the gateway
          if (pi.metadata?.source !== "payment-gateway") continue;

          // Only cancel PIs stuck in requires_payment_method
          if (pi.status !== "requires_payment_method") {
            continue;
          }

          const ageHours = Math.round(
            (Date.now() / 1000 - pi.created) / 3600
          );
          const clientId = pi.metadata?.clientId || "unknown";

          if (dryRun) {
            details.push({
              id: pi.id,
              clientId,
              age: `${ageHours}h`,
              status: pi.status,
              action: "would_cancel",
            });
            skipped++;
          } else {
            try {
              await stripe.paymentIntents.cancel(pi.id);
              details.push({
                id: pi.id,
                clientId,
                age: `${ageHours}h`,
                status: pi.status,
                action: "canceled",
              });
              canceled++;
            } catch (err) {
              console.error(`[CLEANUP] Failed to cancel ${pi.id}:`, err);
              details.push({
                id: pi.id,
                clientId,
                age: `${ageHours}h`,
                status: pi.status,
                action: "error",
              });
              errors++;
            }
          }
        }

        hasMore = paymentIntents.has_more;
        if (paymentIntents.data.length > 0) {
          startingAfter =
            paymentIntents.data[paymentIntents.data.length - 1].id;
        }
      }
    }

    console.log(
      `[CLEANUP] Complete: canceled=${canceled}, skipped=${skipped}, errors=${errors}`
    );

    return NextResponse.json({
      dryRun,
      maxAgeHours,
      cutoff: new Date(cutoff * 1000).toISOString(),
      canceled,
      skipped,
      errors,
      total: details.length,
      details,
    });
  } catch (error) {
    console.error("[CLEANUP] Error during stale PI cleanup:", error);
    return NextResponse.json(
      { error: "Failed to clean up stale payment intents" },
      { status: 500 }
    );
  }
}

// GET — used by Vercel Cron (sends Authorization: Bearer <CRON_SECRET>)
export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

// POST — used for manual invocation (sends x-admin-secret header)
export async function POST(request: NextRequest) {
  return handleCleanup(request);
}
