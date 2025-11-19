/**
 * Utility functions for cache management
 */

/**
 * Check if cached Discogs data needs refresh (older than 6 hours)
 * @param cachedAt - Timestamp when data was last cached from Discogs
 * @returns true if data needs refresh, false otherwise
 */
export function needsDiscogsRefresh(cachedAt: string | null | undefined): boolean {
    if (!cachedAt) return true;

    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const cachedTime = new Date(cachedAt).getTime();
    const now = Date.now();

    return (now - cachedTime) > SIX_HOURS_MS;
}

/**
 * Calculate hours since last cache update
 * @param cachedAt - Timestamp when data was last cached
 * @returns hours elapsed since cache, Infinity if never cached
 */
export function hoursSinceCache(cachedAt: string | null | undefined): number {
    if (!cachedAt) return Infinity;

    const cachedTime = new Date(cachedAt).getTime();
    const now = Date.now();
    const diffMs = now - cachedTime;

    return diffMs / (60 * 60 * 1000);
}
