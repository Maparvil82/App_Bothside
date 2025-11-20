import { useState, useEffect } from 'react';

/**
 * Debounce Hook
 * 
 * Delays updating a value until after a specified delay.
 * Useful for search inputs to avoid making API calls on every keystroke.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 400ms)
 * @returns Debounced value
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 400);
 * 
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     performSearch(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the delay
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if value changes before delay expires
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
