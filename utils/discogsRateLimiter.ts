/**
 * Discogs API Rate Limiter
 * 
 * Client-side rate limiter to prevent exceeding Discogs API limits.
 * Limits: 20 requests per 60 seconds per user.
 * 
 * Features:
 * - Tracks requests in 60-second sliding window
 * - Auto-waits if limit reached
 * - Recursive retry after 1 second
 * - Console warnings for debugging
 */

class DiscogsRateLimiter {
    private requests: number[] = [];
    private readonly maxRequests = 20;
    private readonly timeWindow = 60000; // 60 seconds in milliseconds
    private readonly retryDelay = 1000; // 1 second

    /**
     * Wait if rate limit is reached, then allow request
     * Recursively retries until a slot is available
     */
    async waitIfNeeded(): Promise<void> {
        this.cleanOldRequests();

        if (this.requests.length >= this.maxRequests) {
            console.warn(
                `⚠️ Discogs rate limit reached (${this.requests.length}/${this.maxRequests} requests in last 60s), retrying in 1s...`
            );
            await this.sleep(this.retryDelay);
            return this.waitIfNeeded(); // Recursive retry
        }
    }

    /**
     * Track a new request
     * Call this after making a successful request
     */
    trackRequest(): void {
        this.requests.push(Date.now());
    }

    /**
     * Remove requests older than the time window
     */
    private cleanOldRequests(): void {
        const now = Date.now();
        this.requests = this.requests.filter(
            (timestamp) => now - timestamp < this.timeWindow
        );
    }

    /**
     * Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get current request count in window (for debugging)
     */
    getCurrentCount(): number {
        this.cleanOldRequests();
        return this.requests.length;
    }

    /**
     * Reset all tracked requests (for testing)
     */
    reset(): void {
        this.requests = [];
    }
}

// Export singleton instance
export const discogsRateLimiter = new DiscogsRateLimiter();
