import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs'
import { createAuthMiddleware } from './server/authMiddleware'

function videoImportPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    // 1. API: Get Video Info & Available Qualities
    if (req.url?.startsWith('/api/video-info') && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const { url } = JSON.parse(body || '{}');
          if (!url || typeof url !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: 'URL is required' }));
            return;
          }

          const scriptPath = path.resolve(__dirname, 'scripts', 'video_resolver.py');
          const proc = spawn('python', [scriptPath, '--info', '--url', url]);
          let stdout = '';
          let stderr = '';

          proc.stdout.on('data', (d) => {
            stdout += d.toString();
          });
          proc.stderr.on('data', (d) => {
            stderr += d.toString();
          });

          proc.on('close', (code) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

            if (code === 0 && stdout.trim()) {
              try {
                const parsed = JSON.parse(stdout.trim());
                if (parsed.success) {
                  res.statusCode = 200;
                  res.end(JSON.stringify(parsed));
                  return;
                }
              } catch (e) {}
            }

            res.statusCode = 422;
            res.end(
              JSON.stringify({
                error:
                  stderr.trim() ||
                  "Unable to extract qualities for this video. Platform restrictions or private access may apply.",
              })
            );
          });
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal error' }));
        }
      });
      return;
    }

    // 2. API: Download / Import Video in Selected Quality
    if (
      (req.url?.startsWith('/api/download-video') || req.url?.startsWith('/api/import-video')) &&
      req.method === 'POST'
    ) {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const {
            url,
            quality = '720p',
            trimStart,
            trimEnd,
            limit1Min = false,
            crop = 'original',
            muteAudio = false,
            customAudioBase64,
            customAudioExt = 'mp3',
            watermarkText,
            watermarkPos = 'bottom-right',
          } = JSON.parse(body || '{}');

          if (!url || typeof url !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: 'URL is required' }));
            return;
          }

          const tmpDir = path.resolve(__dirname, 'temp_imports');
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

          const id = Date.now();
          const ext = quality === 'audio' ? 'mp3' : 'mp4';
          const outPath = path.join(tmpDir, `video_${id}_${quality}.${ext}`);

          let customAudioPath = '';
          if (customAudioBase64 && typeof customAudioBase64 === 'string') {
            try {
              customAudioPath = path.join(tmpDir, `custom_audio_${id}.${customAudioExt}`);
              const buffer = Buffer.from(customAudioBase64, 'base64');
              fs.writeFileSync(customAudioPath, buffer);
            } catch (e) {
              console.warn('Failed to write custom audio buffer:', e);
            }
          }

          const scriptPath = path.resolve(__dirname, 'scripts', 'video_resolver.py');
          const scriptArgs = [
            scriptPath,
            '--download',
            '--url',
            url,
            '--quality',
            quality,
            '--output',
            outPath,
          ];

          if (typeof trimStart === 'number' && trimStart >= 0) {
            scriptArgs.push('--trim_start', trimStart.toString());
          }
          if (typeof trimEnd === 'number' && trimEnd > 0) {
            scriptArgs.push('--trim_end', trimEnd.toString());
          }
          if (limit1Min) {
            scriptArgs.push('--limit_1min');
          }
          if (crop && crop !== 'original') {
            scriptArgs.push('--crop', crop);
          }
          if (muteAudio) {
            scriptArgs.push('--mute_audio');
          }
          if (customAudioPath && fs.existsSync(customAudioPath)) {
            scriptArgs.push('--custom_audio', customAudioPath);
          }
          if (watermarkText && typeof watermarkText === 'string' && watermarkText.trim()) {
            scriptArgs.push('--watermark_text', watermarkText.trim());
            scriptArgs.push('--watermark_pos', watermarkPos || 'bottom-right');
          }

          const proc = spawn('python', scriptArgs);

          let stdout = '';
          let stderr = '';
          proc.stdout.on('data', (d) => {
            stdout += d.toString();
          });
          proc.stderr.on('data', (d) => {
            stderr += d.toString();
          });

          proc.on('close', (code) => {
            let resultFilePath = outPath;
            if (stdout.trim()) {
              try {
                const parsed = JSON.parse(stdout.trim());
                if (parsed.success && parsed.path) {
                  resultFilePath = parsed.path;
                }
              } catch (e) {}
            }

            if (!fs.existsSync(resultFilePath)) {
              // Fallback check in tmpDir
              const files = fs.readdirSync(tmpDir).filter((f) => f.includes(`video_${id}`));
              if (files.length > 0) {
                resultFilePath = path.join(tmpDir, files[0]);
              }
            }

            if (fs.existsSync(resultFilePath)) {
              const stat = fs.statSync(resultFilePath);
              const isAudio = resultFilePath.endsWith('.mp3');
              const fileName = path.basename(resultFilePath);

              res.statusCode = 200;
              res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
              res.setHeader('Content-Length', stat.size);
              res.setHeader(
                'Content-Disposition',
                `attachment; filename="${encodeURIComponent(fileName)}"`
              );
              res.setHeader('X-Video-Title', encodeURIComponent(fileName));
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader(
                'Access-Control-Expose-Headers',
                'Content-Disposition, X-Video-Title'
              );
              res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

              const readStream = fs.createReadStream(resultFilePath);
              readStream.pipe(res);
              readStream.on('close', () => {
                try {
                  fs.unlinkSync(resultFilePath);
                } catch (e) {}
                if (customAudioPath) {
                  try {
                    fs.unlinkSync(customAudioPath);
                  } catch (e) {}
                }
              });
              return;
            }

            res.statusCode = 422;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.end(
              JSON.stringify({
                error:
                  stderr.trim() ||
                  "Unable to download this video in the requested quality. Platform restrictions may apply.",
              })
            );
          });
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Internal error' }));
        }
      });
      return;
    }

    // 3. API: Video Preview Stream (supports Range requests for smooth HTML5 video scrubbing)
    if (req.url?.startsWith('/api/video-preview')) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const targetUrl = parsedUrl.searchParams.get('url');
        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: 'url param is required' }));
          return;
        }

        const scriptPath = path.resolve(__dirname, 'scripts', 'video_resolver.py');
        const proc = spawn('python', [scriptPath, '--preview', '--url', targetUrl]);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });

        proc.on('close', (code) => {
          if (code === 0 && stdout.trim()) {
            try {
              const parsed = JSON.parse(stdout.trim());
              if (parsed.success && parsed.path && fs.existsSync(parsed.path)) {
                const stat = fs.statSync(parsed.path);
                const fileSize = stat.size;
                const range = req.headers.range;

                if (range) {
                  const parts = range.replace(/bytes=/, '').split('-');
                  const start = parseInt(parts[0], 10);
                  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                  const chunksize = end - start + 1;
                  const file = fs.createReadStream(parsed.path, { start, end });

                  res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*',
                    'Cross-Origin-Resource-Policy': 'cross-origin',
                  });
                  file.pipe(res);
                  return;
                } else {
                  res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                    'Accept-Ranges': 'bytes',
                    'Access-Control-Allow-Origin': '*',
                    'Cross-Origin-Resource-Policy': 'cross-origin',
                  });
                  fs.createReadStream(parsed.path).pipe(res);
                  return;
                }
              }
            } catch (e) {}
          }

          res.statusCode = 422;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.end(JSON.stringify({ error: stderr.trim() || 'Failed to extract preview' }));
        });
        return;
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }

    next();
  };

  return {
    name: 'video-import-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

function securityAuthPlugin(): Plugin {
  const authHandler = createAuthMiddleware(__dirname);
  return {
    name: 'security-auth-plugin',
    configureServer(server) {
      server.middlewares.use(authHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(authHandler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), videoImportPlugin(), securityAuthPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'ffmpeg-core': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          'pdf-core': ['pdf-lib'],
          'doc-core': ['mammoth', 'xlsx'],
        },
      },
    },
  },
})
