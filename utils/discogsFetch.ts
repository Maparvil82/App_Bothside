import { discogsRateLimiter } from './discogsRateLimiter';

/**
 * Discogs API Fetch Wrapper
 * 
 * Mandatory wrapper for ALL Discogs API calls.
 * 
 * Features:
 * - Adds required User-Agent header: "Bothside/beta (+mailto:maparvil@gmail.com)"
 * - Enforces rate limiting (20 requests per 60 seconds)
 * - Maintains all existing headers (Authorization, etc.)
 * - Auto-waits if rate limit is reached
 * 
 * Usage:
 *   const response = await discogsFetch('https://api.discogs.com/releases/123', {
 *     headers: { 'Authorization': 'Discogs token=...' }
 *   });
 */
export async function discogsFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    // Wait if rate limit is reached
    await discogsRateLimiter.waitIfNeeded();

    // Add mandatory User-Agent header
    const headers = new Headers(options?.headers || {});
    headers.set('User-Agent', 'Bothside/beta (+mailto:maparvil@gmail.com)');

    // Make the request
    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Track successful request for rate limiting
    discogsRateLimiter.trackRequest();

    return response;
}

/**
 * Check if URL is a Discogs API URL
 */
export function isDiscogsUrl(url: string): boolean {
    return url.includes('api.discogs.com');
}
