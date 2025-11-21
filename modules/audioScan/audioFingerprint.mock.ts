import { AudioFingerprint, AudioScanResult } from './audioFingerprint.types';

export const generateMockFingerprint = (): AudioFingerprint => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const compareFingerprintWithCollection = (fingerprint: AudioFingerprint): AudioScanResult => {
    // Simular un resultado aleatorio
    return {
        trackName: "Mock Track",
        artist: "Mock Artist",
        inCollection: Boolean(Math.random() > 0.5),
        matchedRelease: "Mock Release",
        confidence: Math.random()
    };
};
