import type { DefaultFunctionArgs, FunctionReference } from "convex/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

let adminClient: ConvexHttpClient | null = null;
let publicClient: ConvexHttpClient | null = null;

type AdminCapableClient = ConvexHttpClient & {
  setAdminAuth: (deployKey: string) => void;
};

export function convexConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
}

export function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return url;
}

export function getConvexPublicClient(): ConvexHttpClient {
  if (!publicClient) {
    publicClient = new ConvexHttpClient(getConvexUrl());
  }
  return publicClient;
}

export function getConvexAdminClient(): AdminCapableClient {
  const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim();
  if (!deployKey) {
    throw new Error("CONVEX_DEPLOY_KEY is not set");
  }
  if (!adminClient) {
    const client = new ConvexHttpClient(getConvexUrl()) as AdminCapableClient;
    client.setAdminAuth(deployKey);
    adminClient = client;
  }
  return adminClient as AdminCapableClient;
}

export async function convexQuery<
  Args extends DefaultFunctionArgs,
  Result,
>(
  ref: FunctionReference<"query", "public", Args, Result>,
  args: Args,
  token?: string | null,
): Promise<Result> {
  const client = getConvexPublicClient();
  if (token) {
    client.setAuth(token);
  } else {
    client.clearAuth();
  }
  return client.query(ref, args as never);
}

export async function convexMutation<
  Args extends DefaultFunctionArgs,
  Result,
>(
  ref: FunctionReference<"mutation", "public", Args, Result>,
  args: Args,
  token?: string | null,
): Promise<Result> {
  const client = token ? getConvexPublicClient() : getConvexAdminClient();
  if (token) {
    client.setAuth(token);
  }
  return client.mutation(ref, args as never);
}

export async function convexInternalQuery<
  Args extends Record<string, unknown>,
  Result,
>(
  ref: FunctionReference<"query", "internal", Args, Result>,
  args: Args,
): Promise<Result> {
  const client = getConvexAdminClient();
  return client.query(ref as never, args as never);
}

export async function convexInternalMutation<
  Args extends Record<string, unknown>,
  Result,
>(
  ref: FunctionReference<"mutation", "internal", Args, Result>,
  args: Args,
): Promise<Result> {
  const client = getConvexAdminClient();
  return client.mutation(ref as never, args as never);
}

export { api };
