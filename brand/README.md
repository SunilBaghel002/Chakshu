# Chakshu (चक्षु) — Brand Assets & Identity Guidelines

> *"The Eye That Never Blinks — From Orbit to Evidence"*

Chakshu is a sovereign on-premises satellite change intelligence platform developed for **Smart India Hackathon (SIH 2026)** solving problem statements **SIH26227 (Ministry of Defence)** and **SIH26167 (ISRO / Space Applications Centre)**.

---

## 1. Symbolism & Visual Anatomy

The Chakshu emblem integrates four core operational domains of the platform:

1. **Sovereign Eye Contour (The Eye of Vigilance)**:
   The outer elliptical silhouette represents *Chakshu* (चक्षु — Sanskrit for "Eye" or "Divine Vision"), continuously monitoring land-surface changes across critical borders, maritime corridors, and strategic infrastructure.
2. **Orbital Trajectory & Satellite Node**:
   An inclined orbital ring with a solar-panel-equipped satellite node symbolizes high-altitude Earth Observation platforms (Cartosat, Sentinel, RISAT) providing real-time and historical multi-spectral imagery.
3. **Six-Blade Mechanical Optical Aperture**:
   The iris blades signify optical sensor calibration, high-resolution sensor focal planes, and sub-pixel change detection accuracy.
4. **Targeting Reticle & Luminous Amber Pupil**:
   The crosshairs and pulsating amber focal core highlight deterministic vector analysis, automated change candidate triage, and cryptographically verified evidence generation.

---

## 2. Color Palette & Tactical Design Tokens

| Token Name | Hex | Usage |
|:---|:---|:---|
| **Signal Amber (Primary)** | `#FF9426` | Core pupil, targeting reticles, primary CTAs, active change alerts |
| **Amber Light** | `#FFB347` / `#FFC875` | Aperture highlights, telemetry indicators, warning states |
| **Amber Deep** | `#D96B00` | Shading depth, secondary telemetry accents |
| **Ion Cyan** | `#38BDF8` | Satellite orbital path, sensor telemetry, calibration nodes |
| **Obsidian Space Base** | `#080C16` | Tactical command backdrop, air-gapped terminal surface |
| **Telemetry Slate** | `#1E293B` / `#334155` | Azimuth marks, coordinate rings, rangefinder ticks |

---

## 3. Asset Directory & Files

- `brand/chakshu-logo.svg`: Primary 512×512 square badge with rounded container and tactical corner brackets.
- `brand/chakshu-logo-mark.svg`: Standalone vector emblem (transparent background) for headers, badges, and icons.
- `brand/chakshu-logo-horizontal.svg`: Horizontal brand lockup featuring the mark, Devanagari logotype (`चक्षु`), Latin name (`CHAKSHU`), and platform attribution.
- `frontend/public/logo.svg`: Public web vector asset for web console, favicons, and PWA manifests.
- `frontend/public/og.png`: 1200×630 OpenGraph social preview asset.
- `frontend/src/components/ui/ChakshuLogo.tsx`: Production React component supporting responsive sizing and variants.
