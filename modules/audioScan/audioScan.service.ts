import { Audio } from 'expo-av';
import { AudioFingerprint, AudioScanResult } from './audioFingerprint.types';
import { generateMockFingerprint, compareFingerprintWithCollection } from './audioFingerprint.mock';
import { generateFingerprintFromFile } from './chromaprint';
import { AUDIO_FINGERPRINT_ENDPOINT } from '../../config/api';
import { supabase } from '../../lib/supabase';

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

export const analyzeAudio = async (): Promise<AudioScanResult> => {
    console.log('Starting full audio analysis...');

    try {
        // 1. Grabar audio
        await startRecording();

        // Grabar durante 4-6 segundos
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { uri } = await stopRecording();
        console.log('Audio recorded at:', uri);

        // 2. Preparar subida
        const formData = new FormData();
        formData.append('file', {
            uri,
            name: 'audio.m4a',
            type: 'audio/m4a',
        } as any);

        // Obtener token de sesión
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            console.warn('No auth token found, proceeding without auth header (might fail if backend requires it)');
        }

        try {
            console.log('Uploading audio to:', AUDIO_FINGERPRINT_ENDPOINT);
            const response = await fetch(AUDIO_FINGERPRINT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('Backend response:', data);

            // 4. Adaptar respuesta
            return {
                trackName: data.trackName || 'Unknown Track',
                artist: data.artist || 'Unknown Artist',
                inCollection: data.inCollection || false,
                matchedRelease: data.matchedRelease || '',
                confidence: data.confidence || 0,
            };

        } catch (uploadError) {
            console.error('Upload failed, falling back to mock:', uploadError);
            // Fallback a mock si falla la red o el backend
            // Esto permite seguir probando la UI mientras no haya backend real
            const fingerprint = await generateFingerprintFromFile(uri);
            return compareFingerprintWithCollection(fingerprint);
        }

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
