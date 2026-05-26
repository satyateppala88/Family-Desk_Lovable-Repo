/**
 * Shared React Query stale-time constants.
 * Choose based on how frequently the data changes and
 * how stale it can be before causing visible user confusion.
 */
export const STALE = {
  /** Always fetch fresh — use for data with active realtime subscriptions */
  REALTIME: 0,
  /** 30 seconds — default (same as query-client global) */
  DEFAULT: 30_000,
  /** 1 minute — frequently updated user data */
  SHORT: 60_000,
  /** 5 minutes — moderate-frequency data */
  MEDIUM: 5 * 60_000,
  /** 30 minutes — slow-changing data */
  LONG: 30 * 60_000,
  /** 24 hours — near-static reference data */
  STATIC: 24 * 60 * 60_000,
} as const;