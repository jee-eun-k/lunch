// File: /Users/alexa/Development/lunch/build.ts
import * as esbuild from "npm:esbuild"; // Imports esbuild via npm specifier (Deno 2 feature)
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"; // Imports the Deno loader from JSR

console.log("Starting bundle process for main.ts...");

try {
  const result = await esbuild.build({
    plugins: [...denoPlugins()], // Integrate Deno-specific behaviors into esbuild
    entryPoints: ["./main.ts"], // Your client-side TypeScript entry file
    outfile: "./public/main.js", // The desired output path for the browser
    bundle: true, // Instructs esbuild to bundle all dependencies
    format: "esm", // Output as an ES Module (modern standard)
    // For production, you might add:
    // minify: true,
    // sourcemap: true, // or 'external'
  });

  if (result.errors.length > 0) {
    console.error("Build failed with errors:", result.errors);
  } else {
    console.log("Bundle successful! Output file: ./public/main.js");
    if (result.warnings.length > 0) {
      console.warn("Build completed with warnings:", result.warnings);
    }
  }
} catch (error) {
  console.error(
    "An unexpected error occurred during the build process:",
    error,
  );
} finally {
  // esbuild runs a service that needs to be explicitly stopped.
  esbuild.stop();
  console.log("esbuild service stopped.");
}
