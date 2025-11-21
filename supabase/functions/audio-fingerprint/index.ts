// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Hello from Audio Fingerprint Function!");

serve(async (req) => {
    try {
        // 1. Parsear el multipart/form-data
        const form = await req.formData();
        const file = form.get("file");

        if (!file || !(file instanceof File)) {
            return new Response(
                JSON.stringify({ error: "No file uploaded or invalid file format" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`Received file: ${file.name}, size: ${file.size} bytes`);

        // 2. Guardar temporalmente el archivo en el FS
        const tempPath = `/tmp/${crypto.randomUUID()}.wav`;
        const fileContent = new Uint8Array(await file.arrayBuffer());
        await Deno.writeFile(tempPath, fileContent);
        console.log(`File saved to ${tempPath}`);

        // 3. Ejecutar Chromaprint (fpcalc)
        // Usamos el binario embebido en la función
        const fpcalcPath = `${Deno.cwd()}/supabase/functions/audio-fingerprint/chromaprint-bin/fpcalc`;
        console.log(`Using fpcalc at: ${fpcalcPath}`);

        // Asegurar permisos de ejecución
        try {
            await Deno.chmod(fpcalcPath, 0o755);
        } catch (e) {
            console.warn("Error setting chmod on fpcalc (might already be executable):", e);
        }

        const command = new Deno.Command(fpcalcPath, {
            args: ["-json", tempPath],
            stdout: "piped",
            stderr: "piped",
        });

        const process = command.spawn();
        const output = await process.output();

        // Limpiar archivo temporal
        try {
            await Deno.remove(tempPath);
        } catch (e) {
            console.error("Error removing temp file:", e);
        }

        if (!output.success) {
            const errorOutput = new TextDecoder().decode(output.stderr);
            console.error("fpcalc error:", errorOutput);
            throw new Error(`fpcalc failed: ${errorOutput}`);
        }

        const rawOutput = new TextDecoder().decode(output.stdout);
        console.log("fpcalc output:", rawOutput);

        let fingerprintData;
        try {
            fingerprintData = JSON.parse(rawOutput);
        } catch (e) {
            throw new Error("Failed to parse fpcalc output");
        }

        const fingerprint = fingerprintData.fingerprint;
        const duration = fingerprintData.duration;

        // 4. Matching con la colección del usuario (Simulado)
        const result = {
            fingerprint,
            trackName: "Track simulado",
            artist: "Artista simulado",
            matchedRelease: "Versión simulada",
            inCollection: Math.random() > 0.5,
            confidence: Math.random()
        };

        // 5. Respuesta
        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Error processing request:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal Server Error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
