import { Audio } from 'expo-av';
import { AudioFingerprint, AudioScanResult } from './audioFingerprint.types';
import { generateMockFingerprint, compareFingerprintWithCollection } from './audioFingerprint.mock';

let recording: Audio.Recording | null = null;

export const startRecording = async (): Promise<void> => {
    console.log('Starting audio recording...');
    try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            throw new Error('Permission to access microphone was denied');
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        recording = newRecording;
        console.log('Recording started');
    } catch (err) {
        console.error('Failed to start recording', err);
        throw err;
    }
};

export const stopRecording = async (): Promise<{ uri: string; durationMs: number }> => {
    console.log('Stopping audio recording...');
    if (!recording) {
        throw new Error('No active recording');
    }

    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        const status = await recording.getStatusAsync();

        recording = null;

        if (!uri) {
            throw new Error('Recording URI is null');
        }

        console.log('Recording stopped, URI:', uri);
        return {
            uri,
            durationMs: status.durationMillis
        };
    } catch (err) {
        console.error('Failed to stop recording', err);
        throw err;
    }
};

export const generateFingerprintFromAudio = async (): Promise<AudioFingerprint> => {
    console.log('Generating fingerprint...');
    // Placeholder for native fingerprint generation
    return generateMockFingerprint();
};

export const matchFingerprint = async (fingerprint: AudioFingerprint): Promise<AudioScanResult> => {
    console.log('Matching fingerprint:', fingerprint);
    // Placeholder for API call to match fingerprint
    return compareFingerprintWithCollection(fingerprint);
};

export const analyzeAudio = async (): Promise<AudioScanResult> => {
    console.log('Starting full audio analysis...');

    try {
        await startRecording();

        // Grabar durante 4-6 segundos
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { uri } = await stopRecording();
        console.log('Audio recorded at:', uri);

        // Aquí iría la lógica real de fingerprint con el archivo
        // const fingerprint = await generateFingerprintFromAudioFile(uri);

        const fingerprint = await generateFingerprintFromAudio();
        const result = await matchFingerprint(fingerprint);

        return result;
    } catch (error) {
        console.error('Error during audio analysis:', error);
        // Asegurarse de limpiar si falla
        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
                recording = null;
            } catch (e) {
                console.error('Error cleaning up recording:', e);
            }
        }
        throw error;
    }
};
