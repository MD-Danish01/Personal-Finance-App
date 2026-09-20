/**
 * generate-android-assets.mjs
 *
 * Generates all required Android launcher icon and splash screen PNGs from
 * public/logo.png.  Run with:
 *
 *   node scripts/generate-android-assets.mjs
 *
 * Requires: sharp  (already a dependency via @capacitor/cli transitive deps)
 *
 * Icon strategy:
 *   - Legacy (mipmap-*): plain logo on white background, square crop
 *   - Adaptive foreground (mipmap-*): logo centred in 108dp canvas with 15% padding
 *   - Splash screens (drawable-port-* / drawable-land-*): brand-colour background
 *     (#10b981 emerald) with centred logo, sized correctly per density bucket
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "public", "logo.png");
const androidRes = path.join(root, "android", "app", "src", "main", "res");

// Brand colour (emerald-500 — same as --primary in globals.css)
const BRAND_BG = { r: 16, g: 185, b: 129, alpha: 1 };
const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

if (!fs.existsSync(src)) {
  console.error(`❌  Source not found: ${src}`);
  console.error("    Place your app icon at public/logo.png and re-run.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Icon size table
// ---------------------------------------------------------------------------

/** Legacy square launcher icons (mipmap-*dpi/ic_launcher.png etc.) */
const ICON_SIZES = [
  { dir: "mipmap-mdpi",    size: 48  },
  { dir: "mipmap-hdpi",    size: 72  },
  { dir: "mipmap-xhdpi",   size: 96  },
  { dir: "mipmap-xxhdpi",  size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

/**
 * Adaptive icon foreground canvas is 108dp × 108dp.
 * The "safe zone" is the inner 72dp circle, so we put the logo at 60% of the
 * canvas size (safe zone minus a little breathing room).
 */
const ADAPTIVE_SIZES = [
  { dir: "mipmap-mdpi",    canvas: 108, logo: 65  },
  { dir: "mipmap-hdpi",    canvas: 162, logo: 97  },
  { dir: "mipmap-xhdpi",   canvas: 216, logo: 130 },
  { dir: "mipmap-xxhdpi",  canvas: 324, logo: 194 },
  { dir: "mipmap-xxxhdpi", canvas: 432, logo: 259 },
];

/** Splash screens — width × height for each density bucket */
const SPLASH_SIZES = [
  { dir: "drawable-port-mdpi",    w: 320,  h: 480  },
  { dir: "drawable-port-hdpi",    w: 480,  h: 800  },
  { dir: "drawable-port-xhdpi",   w: 720,  h: 1280 },
  { dir: "drawable-port-xxhdpi",  w: 960,  h: 1600 },
  { dir: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  { dir: "drawable-land-mdpi",    w: 480,  h: 320  },
  { dir: "drawable-land-hdpi",    w: 800,  h: 480  },
  { dir: "drawable-land-xhdpi",   w: 1280, h: 720  },
  { dir: "drawable-land-xxhdpi",  w: 1600, h: 960  },
  { dir: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

/**
 * Creates a square icon with a white background and the logo centred,
 * sized to `logoSize` with some padding.
 */
async function makeIcon(size, logoSize, outPath, bg = WHITE_BG) {
  const padding = Math.round((size - logoSize) / 2);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, left: padding, top: padding }])
    .png()
    .toFile(outPath);
}

/**
 * Creates an adaptive-icon foreground: transparent background, logo centred
 * in the safe zone.
 */
async function makeAdaptiveForeground(canvas, logoSize, outPath) {
  const padding = Math.round((canvas - logoSize) / 2);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, left: padding, top: padding }])
    .png()
    .toFile(outPath);
}

/**
 * Creates a splash screen: brand-colour fill, logo centred, logo is 40% of
 * the shorter dimension.
 */
async function makeSplash(w, h, outPath) {
  const logoSize = Math.round(Math.min(w, h) * 0.4);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const left = Math.round((w - logoSize) / 2);
  const top  = Math.round((h - logoSize) / 2);

  await sharp({
    create: { width: w, height: h, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(outPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🎨  Generating Android assets from public/logo.png …\n");

  // 1. Legacy launcher icons
  for (const { dir, size } of ICON_SIZES) {
    const outDir = path.join(androidRes, dir);
    await ensureDir(outDir);
    const logoSize = Math.round(size * 0.8); // 80% of icon canvas

    await makeIcon(size, logoSize, path.join(outDir, "ic_launcher.png"));
    await makeIcon(size, logoSize, path.join(outDir, "ic_launcher_round.png"));
    console.log(`  ✅  ${dir}/ic_launcher.png  (${size}×${size})`);
  }

  // 2. Adaptive icon foreground PNGs (placed in mipmap-* dirs)
  for (const { dir, canvas, logo } of ADAPTIVE_SIZES) {
    const outDir = path.join(androidRes, dir);
    await ensureDir(outDir);
    await makeAdaptiveForeground(canvas, logo, path.join(outDir, "ic_launcher_foreground.png"));
    console.log(`  ✅  ${dir}/ic_launcher_foreground.png  (${canvas}×${canvas})`);
  }

  // 3. Splash screens
  for (const { dir, w, h } of SPLASH_SIZES) {
    const outDir = path.join(androidRes, dir);
    await ensureDir(outDir);
    await makeSplash(w, h, path.join(outDir, "splash.png"));
    console.log(`  ✅  ${dir}/splash.png  (${w}×${h})`);
  }

  // 4. Also write a single drawable/splash.png (generic fallback used by styles.xml)
  await makeSplash(1080, 1920, path.join(androidRes, "drawable", "splash.png"));
  console.log("  ✅  drawable/splash.png  (1080×1920)");

  console.log("\n✅  Done! Sync with Capacitor: npm run cap:sync");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
