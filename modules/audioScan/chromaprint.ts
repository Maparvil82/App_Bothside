import { NativeModules, Platform } from "react-native";

const { ChromaprintModule } = NativeModules;

export async function generateFingerprintFromFile(filePath: string): Promise<string> {
    if (!ChromaprintModule) {
        // Fallback for development without native rebuild
        console.warn("ChromaprintModule not initialized. Using mock fingerprint.");
        return "MOCK_FINGERPRINT_FALLBACK";
        // In a real scenario after rebuild, we would throw:
        // throw new Error("ChromaprintModule not initialized");
    }

    return await ChromaprintModule.generateFingerprint(filePath);
}
