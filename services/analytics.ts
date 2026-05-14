import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY || '';
const host = 'https://us.i.posthog.com';

export const posthog = new PostHog(apiKey, {
  host: host,
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: true,
  },
});

class AnalyticsServiceClass {
  private isInitialized = false;

  init() {
    if (!apiKey) {
      console.warn('PostHog API key is missing. Analytics disabled.');
      return;
    }
    try {
      // Nothing else to do for init with posthog-react-native as it auto-inits if instance is exported
      this.isInitialized = true;
      console.log('PostHog analytics initialized');
    } catch (e) {
      console.error('Failed to initialize PostHog', e);
    }
  }

  identify(userId: string, properties?: Record<string, any>) {
    if (!this.isInitialized) return;
    try {
      posthog.identify(userId, properties);
    } catch (e) {
      console.error('Failed to identify user in PostHog', e);
    }
  }

  reset() {
    if (!this.isInitialized) return;
    try {
      posthog.reset();
    } catch (e) {
      console.error('Failed to reset PostHog', e);
    }
  }

  track(event: string, properties?: Record<string, any>) {
    if (!this.isInitialized) return;
    try {
      posthog.capture(event, properties);
    } catch (e) {
      console.error(`Failed to track event ${event} in PostHog`, e);
    }
  }
}

export const AnalyticsService = new AnalyticsServiceClass();
