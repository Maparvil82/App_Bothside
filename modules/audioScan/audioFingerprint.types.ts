export type AudioFingerprint = string;

export type AudioScanStatus = 'idle' | 'listening' | 'processing' | 'match' | 'no_match';

export interface AudioScanResult {
    trackName: string;
    artist: string;
    inCollection: boolean;
    matchedRelease: string;
    confidence: number;
}
