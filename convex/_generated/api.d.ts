/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as certificates from "../certificates.js";
import type * as education from "../education.js";
import type * as inventory from "../inventory.js";
import type * as learningSummary from "../learningSummary.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_certificateCanonical from "../lib/certificateCanonical.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as verify from "../verify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  certificates: typeof certificates;
  education: typeof education;
  inventory: typeof inventory;
  learningSummary: typeof learningSummary;
  "lib/auth": typeof lib_auth;
  "lib/certificateCanonical": typeof lib_certificateCanonical;
  seed: typeof seed;
  users: typeof users;
  verify: typeof verify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
