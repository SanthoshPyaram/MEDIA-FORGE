# MEDIA-FORGE

**Transform Your Files. Directly in Your Browser.**

MEDIA-FORGE is a privacy-first, browser-based media editor and converter suite for video, audio, image, PDF, and document processing. Built with WebAssembly (FFmpeg.wasm), Web Workers, and local cryptographic security.

---

## 🛡️ Enterprise Security & Device Authorization

- **Strict User Authentication**: Server-side credentials verification without email dependence.
- **Biometric Platform Verification**: WebAuthn Fingerprint / Touch ID / Windows Hello authorization for Admin logins and device approvals.
- **Trusted Device Management**: Hardware-bound Trusted Device ID stored in IndexedDB with max 2-device policy and instant revocation.
- **6-Section Security Control Center**: Dashboard KPI overview, User registry, Device request queue, Device inventory, Immutable Login History, and Security Events audit feed.

---

## ✨ Key Capabilities

- **100% Client-Side Processing**: Files are processed in-memory and in WebAssembly sandboxes; zero bytes uploaded over the network.
- **Universal File Detection**: Analyzes raw binary signatures (magic bytes) to identify file formats and display valid operations.
- **Dedicated Workspaces**:
  - **Video Studio**: Transcode (MP4, WebM, MOV), resolution scaling (360p to 4K), bitrate control, timeline trimming, audio stripping/replacement, watermark overlays, and aspect ratio cropping.
  - **Image Studio**: Format conversion (JPG, PNG, WebP, BMP, ICO), resizing with aspect ratio lock, crop, rotation, color filters, and **2x & 4x Edge-Directed Super-Resolution Upscaling**.
  - **Audio Suite**: High-fidelity format conversion (MP3 up to 320 kbps, WAV, OGG, AAC, WebM audio), video-to-audio extraction, audio trimming, and loudness normalization.
  - **PDF Workspace**: Interactive page grid with drag-and-drop page reordering, per-page rotation, image-to-PDF compilation, and PDF merging.
  - **Document & Spreadsheet Suite**: Word (.docx) to PDF and clean HTML conversion, Excel (.xlsx, .csv) viewer, and CSV/JSON converter.
- **✨ SMART PROCESS**: One-click automatic optimization analyzing file parameters to pick optimal codecs, bitrates, and quality settings.
- **Batch Processing Queue**: Queue multiple tasks simultaneously with progress tracking, pause/cancel support, and ZIP exports.
- **Cyber-Lux UI**: Dark Cyber-Emerald and Obsidian palette with ambient glowing glassmorphism and high-contrast accessibility.

---

## 💻 Technology Stack

- **Framework**: React 18 + TypeScript + Vite 6
- **Styling**: Tailwind CSS with custom glassmorphism & dark mode tokens
- **Security**: WebAuthn Biometric Authenticator, HMAC-SHA256 Sessions, IndexedDB Device Trust
- **Icons**: Lucide Icons
- **Video & Audio**: `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `@ffmpeg/core` (FFmpeg.wasm WebAssembly), Web Audio API
- **Images**: Canvas 2D, WebGL, Web Workers
- **PDF**: `pdf-lib`
- **Documents**: `mammoth` (DOCX), `xlsx` (SheetJS)

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### Password Hasher Utility
Generate SHA-256 hashes for `.env`:
```bash
npm run hash-password -- "YourSecretPassword"
```

### Run Locally
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm run preview
```
