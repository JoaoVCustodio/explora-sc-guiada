import sharp from "sharp";
import { existsSync } from "node:fs";
await sharp("video/coast-source.png")
  .resize({ width: 1440 })
  .webp({ quality: 78 })
  .toFile("public/landing/coast.webp");
await sharp("video/coast-source.png")
  .resize({ width: 720 })
  .webp({ quality: 75 })
  .toFile("public/landing/coast-mobile.webp");
if (existsSync("video/hero-poster.jpg")) {
  await sharp("video/hero-poster.jpg")
    .resize({ width: 1280 })
    .webp({ quality: 85 })
    .toFile("public/landing/hero-poster.webp");
  await sharp("video/hero-poster.jpg")
    .resize({ width: 720 })
    .webp({ quality: 82 })
    .toFile("public/landing/hero-poster-mobile.webp");
}
