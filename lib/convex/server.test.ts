import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/convex/_generated/api";
import { convexMutation, convexQuery } from "@/lib/convex/server";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function successResponse() {
  return new Response(JSON.stringify({ status: "success", value: null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Convex HTTP client credentials", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
    delete process.env.CONVEX_DEPLOY_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    delete process.env.CONVEX_DEPLOY_KEY;
  });

  it("keeps concurrent mutation tokens separate from an interleaved public query", async () => {
    const firstMutationStarted = deferred();
    const releaseFirstMutation = deferred();
    const requests: Array<{ endpoint: string; authorization: string | null }> =
      [];
    let mutationCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const endpoint = new URL(String(input)).pathname;
        const authorization = new Headers(init?.headers).get("Authorization");
        requests.push({ endpoint, authorization });

        if (endpoint.endsWith("/api/mutation") && mutationCount++ === 0) {
          firstMutationStarted.resolve();
          await releaseFirstMutation.promise;
        }

        return successResponse();
      }),
    );

    const firstMutation = convexMutation(
      api.users.resolveAppUser,
      {},
      "token-a",
    );
    await firstMutationStarted.promise;

    const secondMutation = convexMutation(
      api.users.resolveAppUser,
      {},
      "token-b",
    );
    const publicQuery = convexQuery(
      api.verify.lookupDocumentAnchor,
      { sha256: "public-document-hash" },
      null,
    );
    await publicQuery;

    releaseFirstMutation.resolve();
    await Promise.all([firstMutation, secondMutation]);

    expect(
      requests
        .filter(({ endpoint }) => endpoint.endsWith("/api/mutation"))
        .map(({ authorization }) => authorization)
        .sort(),
    ).toEqual(["Bearer token-a", "Bearer token-b"]);
    expect(
      requests.find(({ endpoint }) => endpoint.endsWith("/api/query"))
        ?.authorization,
    ).toBeNull();
  });

  it("keeps tokenless mutations on the authorized admin client", async () => {
    process.env.CONVEX_DEPLOY_KEY = "admin-deploy-key";
    const requests: Array<{ endpoint: string; authorization: string | null }> =
      [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({
          endpoint: new URL(String(input)).pathname,
          authorization: new Headers(init?.headers).get("Authorization"),
        });
        return successResponse();
      }),
    );

    await convexMutation(api.users.resolveAppUser, {});

    expect(requests).toEqual([
      {
        endpoint: "/api/mutation",
        authorization: "Convex admin-deploy-key",
      },
    ]);
  });
});
