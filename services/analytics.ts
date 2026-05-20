import PostHog from 'posthog-react-native';

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_QUEUE_SIZE = 20;
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const host = 'https://us.i.posthog.com';

// ─── PostHog instance ─────────────────────────────────────────────────────────
// Created at module load time. Session Replay disabled intentionally.
export const posthog = new PostHog(apiKey, {
  host,
  enableSessionReplay: false,
});

// ─── Queued event shape ───────────────────────────────────────────────────────
interface QueuedEvent {
  type: 'track' | 'identify' | 'reset';
  event?: string;
  properties?: Record<string, any>;
  userId?: string;
}

// ─── AnalyticsService ─────────────────────────────────────────────────────────
class AnalyticsServiceClass {
  private isInitialized = false;
  private isDisabled = false;
  private queue: QueuedEvent[] = [];

  // Called once from App.tsx useEffect. Flushes any queued events.
  init() {
    if (this.isInitialized || this.isDisabled) return;

    if (!apiKey) {
      console.warn('[Analytics] ⚠️ API key missing — analytics disabled. Clearing queue.');
      this.isDisabled = true;
      this.queue = [];
      return;
    }

    this.isInitialized = true;
    console.log('[Analytics] ✅ Initialized. Flushing queued events:', this.queue.length);
    this._flushQueue();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _flushQueue() {
    const pending = this.queue.splice(0); // drain queue atomically
    for (const item of pending) {
      this._dispatch(item);
    }
  }

  private _dispatch(item: QueuedEvent) {
    try {
      if (item.type === 'identify' && item.userId) {
        posthog.identify(item.userId, item.properties);
        console.log(`[Analytics] identify → ${item.userId}`);
      } else if (item.type === 'reset') {
        posthog.reset();
        console.log('[Analytics] reset');
      } else if (item.type === 'track' && item.event) {
        posthog.capture(item.event, item.properties);
        posthog.flush();
        console.log(`[Analytics] track → ${item.event}`);
      }
    } catch (e) {
      console.error('[Analytics] Dispatch error:', e);
    }
  }

  private _enqueueOrDispatch(item: QueuedEvent) {
    if (this.isDisabled) return;

    if (this.isInitialized) {
      this._dispatch(item);
      return;
    }

    // Queue with overflow protection
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      console.warn('[Analytics] Queue full — dropping oldest event.');
      this.queue.shift();
    }
    this.queue.push(item);
    console.log(`[Analytics] Queued (${this.queue.length}/${MAX_QUEUE_SIZE}):`, item.event ?? item.type);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  track(event: string, properties?: Record<string, any>) {
    this._enqueueOrDispatch({ type: 'track', event, properties });
  }

  identify(userId: string, properties?: Record<string, any>) {
    this._enqueueOrDispatch({ type: 'identify', userId, properties });
  }

  reset() {
    this._enqueueOrDispatch({ type: 'reset' });
  }
}

export const AnalyticsService = new AnalyticsServiceClass();
