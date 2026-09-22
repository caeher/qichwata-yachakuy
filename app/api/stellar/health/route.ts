import { NextResponse } from "next/server";
import type { Horizon, rpc } from "@stellar/stellar-sdk";

import {
  createFallbackRpcClient,
  createStellarClients,
} from "@/lib/stellar/client";
import { resolveStellarEndpoints } from "@/lib/stellar/endpoints";
import {
  NetworkMismatchError,
  readHealth,
  StellarUnreachableError,
  type HorizonProbe,
  type StellarProbe,
} from "@/lib/stellar/health";
import { redact } from "@/lib/stellar/redact";

export const runtime = "nodejs";

function rpcProbe(server: rpc.Server): StellarProbe {
  return {
    getNetwork: () => server.getNetwork(),
    getLatestLedger: () => server.getLatestLedger(),
  };
}

function horizonProbe(server: Horizon.Server): HorizonProbe {
  return {
    passphrase: async () => {
      const root = await server.root();
      return root.network_passphrase;
    },
    latestLedger: async () => {
      const page = await server.ledgers().order("desc").limit(1).call();
      const record = page.records[0];
      if (!record) {
        throw new Error("no_ledger");
      }
      return record.sequence;
    },
  };
}

export async function GET() {
  let endpoints;
  try {
    endpoints = resolveStellarEndpoints(process.env);
  } catch {
    return NextResponse.json({ error: "invalid_network" }, { status: 400 });
  }

  const clients = createStellarClients(process.env);
  const fallbackRpc = createFallbackRpcClient(clients.endpoints);
  const primary = clients.rpc ? rpcProbe(clients.rpc) : null;
  const fallback = fallbackRpc ? rpcProbe(fallbackRpc) : null;

  try {
    const body = await readHealth({
      endpoints,
      primary,
      fallback,
      horizon: horizonProbe(clients.horizon),
    });
    if (endpoints.provider === "alchemy" && body.provider === "public-rpc") {
      console.warn(
        redact(
          JSON.stringify({
            msg: "stellar_rpc_fallback",
            network: endpoints.network,
            from: "alchemy",
            to: "public-rpc",
          }),
        ),
      );
    }
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof NetworkMismatchError) {
      return NextResponse.json({ error: "network_mismatch" }, { status: 502 });
    }
    if (error instanceof StellarUnreachableError) {
      return NextResponse.json(
        { error: "stellar_unreachable" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "stellar_unreachable" }, { status: 503 });
  }
}
