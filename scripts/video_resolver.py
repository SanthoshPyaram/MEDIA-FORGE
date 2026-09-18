import sys
import os
import json
import argparse
import subprocess

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = None

QUALITY_HEIGHT_MAP = {
    '4k': 2160,
    '1440p': 1440,
    '1080p': 1080,
    '720p': 720,
    '480p': 480,
    '360p': 360,
    '240p': 240,
    '144p': 144,
}

import hashlib

def format_seconds_to_timestamp(secs):
    try:
        secs = float(secs)
    except Exception:
        secs = 0.0
    hrs = int(secs // 3600)
    mins = int((secs % 3600) // 60)
    seconds = int(secs % 60)
    return f"{hrs:02d}:{mins:02d}:{seconds:02d}"

def get_video_info(url):
    cmd = [
        sys.executable, '-m', 'yt_dlp',
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist'
    ]
    if FFMPEG_EXE and os.path.exists(FFMPEG_EXE):
        cmd.extend(['--ffmpeg-location', FFMPEG_EXE])
    cmd.append(url)

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    if proc.returncode != 0:
        return {'success': False, 'error': proc.stderr.strip() or 'Failed to fetch video metadata'}
    
    try:
        data = json.loads(proc.stdout)
    except Exception as e:
        return {'success': False, 'error': f'Failed to parse metadata: {str(e)}'}

    title = data.get('title') or 'Imported Video'
    duration = data.get('duration') or 0
    thumbnail = data.get('thumbnail') or ''
    author = data.get('uploader') or data.get('channel') or 'Creator'
    width = data.get('width') or 1920
    height = data.get('height') or 1080
    is_vertical = height > width
    
    formats = data.get('formats', [])
    available_heights = set()
    has_audio = False
    
    for f in formats:
        h = f.get('height')
        if h and isinstance(h, int):
            available_heights.add(h)
        if f.get('vcodec') == 'none' and f.get('acodec') != 'none':
            has_audio = True

    # Standard quality options list
    qualities = []
    target_qualities = [
        {'id': '1080p', 'label': '1080p Full HD', 'height': 1080, 'ext': 'mp4'},
        {'id': '720p', 'label': '720p HD', 'height': 720, 'ext': 'mp4'},
        {'id': '480p', 'label': '480p Standard', 'height': 480, 'ext': 'mp4'},
        {'id': '360p', 'label': '360p Mobile', 'height': 360, 'ext': 'mp4'},
    ]

    max_h = max(available_heights) if available_heights else (height or 1080)
    for q in target_qualities:
        if q['height'] <= max_h or any(abs(h - q['height']) <= 60 for h in available_heights):
            qualities.append({
                'id': q['id'],
                'label': q['label'],
                'height': q['height'],
                'ext': 'mp4',
                'type': 'video'
            })

    if not qualities:
        qualities.append({'id': '720p', 'label': '720p HD', 'height': 720, 'ext': 'mp4', 'type': 'video'})
        qualities.append({'id': '360p', 'label': '360p Mobile', 'height': 360, 'ext': 'mp4', 'type': 'video'})

    # Audio quality
    qualities.append({
        'id': 'audio',
        'label': 'Audio Only (MP3)',
        'height': 0,
        'ext': 'mp3',
        'type': 'audio'
    })

    return {
        'success': True,
        'title': title,
        'duration': duration,
        'thumbnail': thumbnail,
        'author': author,
        'width': width,
        'height': height,
        'isVertical': is_vertical,
        'qualities': qualities,
        'maxHeight': max_h
    }

def apply_video_edits(source_file, dest_file, crop, mute_audio, custom_audio, watermark_text, watermark_pos, trim_start, trim_duration):
    if not FFMPEG_EXE or not os.path.exists(FFMPEG_EXE):
        return source_file

    cmd = [FFMPEG_EXE, '-y']

    # Seeking before input for fast keyframe seek
    if trim_start > 0:
        cmd.extend(['-ss', str(trim_start)])

    cmd.extend(['-i', source_file])

    # If custom audio is provided
    custom_audio_idx = -1
    if custom_audio and os.path.exists(custom_audio) and not mute_audio:
        cmd.extend(['-i', custom_audio])
        custom_audio_idx = 1

    # Duration cap
    if trim_duration and trim_duration > 0:
        cmd.extend(['-t', str(trim_duration)])

    vf_filters = []

    # Aspect Ratio & Crop
    if crop == '9:16':
        vf_filters.append("crop='min(iw,ih*9/16)':'min(ih,iw*16/9)':(iw-ow)/2:(ih-oh)/2,scale=1080:1920")
    elif crop == '16:9':
        vf_filters.append("crop='min(iw,ih*16/9)':'min(ih,iw*9/16)':(iw-ow)/2:(ih-oh)/2,scale=1920:1080")
    elif crop == '1:1':
        vf_filters.append("crop='min(iw,ih)':'min(iw,ih)':(iw-ow)/2:(ih-oh)/2,scale=1080:1080")
    elif crop == 'fit':
        vf_filters.append("scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black")

    # Watermark text overlay
    if watermark_text:
        pos_map = {
            'bottom-right': 'x=w-tw-24:y=h-th-24',
            'bottom-left': 'x=24:y=h-th-24',
            'top-right': 'x=w-tw-24:y=24',
            'top-left': 'x=24:y=24',
            'center': 'x=(w-tw)/2:y=(h-th)/2',
        }
        pos_coord = pos_map.get(watermark_pos, 'x=w-tw-24:y=h-th-24')
        clean_text = watermark_text.replace("'", "\\'").replace(":", "\\:").replace("%", "%%")
        vf_filters.append(f"drawtext=text='{clean_text}':{pos_coord}:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=6")

    if vf_filters:
        cmd.extend(['-vf', ','.join(vf_filters)])

    # Video codec: ultrafast H.264 with multi-threading
    cmd.extend(['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-pix_fmt', 'yuv420p', '-threads', '0'])

    # Audio handling
    if mute_audio:
        cmd.extend(['-an'])
    elif custom_audio_idx != -1:
        cmd.extend(['-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-shortest'])
    else:
        cmd.extend(['-c:a', 'aac', '-b:a', '128k'])

    cmd.extend(['-movflags', '+faststart', dest_file])

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
        return dest_file

    return source_file

def download_video(url, quality, output_path, trim_start=None, trim_end=None, limit_1min=False, crop=None, mute_audio=False, custom_audio=None, watermark_text=None, watermark_pos='bottom-right'):
    has_edits = (crop and crop != 'original') or mute_audio or custom_audio or watermark_text or trim_start is not None or limit_1min

    # Calculate trim range and duration cap (max 60s if 1-min limit is set)
    t_start = 0.0
    t_duration = None

    if trim_start is not None:
        try:
            t_start = max(0.0, float(trim_start))
        except Exception:
            t_start = 0.0

    if trim_end is not None:
        try:
            t_end = max(t_start + 1.0, float(trim_end))
            t_duration = t_end - t_start
        except Exception:
            t_duration = 60.0 if limit_1min else None

    if limit_1min:
        if t_duration is None or t_duration > 60.0:
            t_duration = 60.0

    cmd = [
        sys.executable, '-m', 'yt_dlp',
        '--no-playlist',
        '--no-warnings'
    ]

    if FFMPEG_EXE and os.path.exists(FFMPEG_EXE):
        cmd.extend(['--ffmpeg-location', FFMPEG_EXE])

    # If trimming is requested, only download the requested section over the network!
    if t_start > 0 or (t_duration is not None and t_duration < 3600):
        s_start = format_seconds_to_timestamp(t_start)
        end_val = t_start + (t_duration if t_duration else 60.0)
        s_end = format_seconds_to_timestamp(end_val)
        cmd.extend(['--download-sections', f"*{s_start}-{s_end}"])

    raw_output = output_path
    if has_edits:
        base_root, ext = os.path.splitext(output_path)
        raw_output = f"{base_root}_raw{ext or '.mp4'}"

    if quality == 'audio':
        cmd.extend([
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '-o', raw_output,
            url
        ])
    else:
        target_h = QUALITY_HEIGHT_MAP.get(quality, 720)
        format_spec = f"bestvideo[height<={target_h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={target_h}]+bestaudio/best[height<={target_h}]/best"
        cmd.extend([
            '--concurrent-fragments', '16',
            '--buffer-size', '16M',
            '--http-chunk-size', '10M',
            '--socket-timeout', '30',
            '--retries', '5',
            '--file-access-retries', '5',
            '-f', format_spec,
            '--merge-output-format', 'mp4',
            '-o', raw_output,
            url
        ])

    proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    
    # Locate downloaded raw file
    found_raw = raw_output
    if not os.path.exists(raw_output):
        base_dir = os.path.dirname(raw_output) or '.'
        base_name = os.path.splitext(os.path.basename(raw_output))[0]
        for f in os.listdir(base_dir):
            if f.startswith(base_name):
                found_raw = os.path.join(base_dir, f)
                break

    if not os.path.exists(found_raw):
        return {
            'success': False,
            'error': proc.stderr.strip() or 'Download failed to produce output file'
        }

    # If edits are needed, apply them with FFmpeg
    if has_edits and quality != 'audio':
        edited_path = apply_video_edits(
            source_file=found_raw,
            dest_file=output_path,
            crop=crop,
            mute_audio=mute_audio,
            custom_audio=custom_audio,
            watermark_text=watermark_text,
            watermark_pos=watermark_pos,
            trim_start=0, # Already trimmed by section download if applied
            trim_duration=t_duration
        )

        # Cleanup raw file if edited file is distinct
        if edited_path != found_raw:
            try:
                os.remove(found_raw)
            except Exception:
                pass
        return {'success': True, 'path': edited_path}

def get_video_preview(url):
    try:
        url_clean = url.strip()
        url_hash = hashlib.md5(url_clean.encode('utf-8')).hexdigest()
        script_dir = os.path.dirname(os.path.abspath(__file__))
        cache_dir = os.path.join(script_dir, '..', 'temp_preview_cache')
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = os.path.abspath(os.path.join(cache_dir, f"preview_{url_hash}.mp4"))

        # 1. Return immediately if cached
        if os.path.exists(cache_file) and os.path.getsize(cache_file) > 10000:
            return {'success': True, 'path': cache_file, 'cached': True}

        # 2. Extract quick 60-second slice with fast preset
        cmd = [
            sys.executable, '-m', 'yt_dlp',
            '--no-playlist',
            '--no-warnings',
            '--download-sections', '*0-60',
            '-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
            '--merge-output-format', 'mp4',
            '-o', cache_file
        ]
        if FFMPEG_EXE and os.path.exists(FFMPEG_EXE):
            cmd.extend(['--ffmpeg-location', FFMPEG_EXE])
        cmd.append(url_clean)

        proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')

        if not os.path.exists(cache_file):
            # Check if output has a slightly different extension
            for f in os.listdir(cache_dir):
                if f.startswith(f"preview_{url_hash}") and not f.endswith('.part'):
                    found = os.path.join(cache_dir, f)
                    if os.path.getsize(found) > 10000:
                        return {'success': True, 'path': found}
            return {'success': False, 'error': proc.stderr.strip() or 'Failed to extract preview stream'}

        return {'success': True, 'path': cache_file, 'cached': False}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--info', action='store_true', help='Fetch video info and available qualities')
    parser.add_argument('--preview', action='store_true', help='Extract fast streamable preview slice')
    parser.add_argument('--download', action='store_true', help='Download video in specified quality')
    parser.add_argument('--url', required=True, help='Target video URL')
    parser.add_argument('--quality', default='720p', help='Requested quality (1080p, 720p, 480p, 360p, audio)')
    parser.add_argument('--output', help='Output file path')
    parser.add_argument('--trim_start', type=float, help='Trim start time in seconds')
    parser.add_argument('--trim_end', type=float, help='Trim end time in seconds')
    parser.add_argument('--limit_1min', action='store_true', help='Enforce maximum 1-minute clip limit')
    parser.add_argument('--crop', choices=['original', '9:16', '16:9', '1:1', 'fit'], default='original', help='Aspect ratio crop')
    parser.add_argument('--mute_audio', action='store_true', help='Strip audio track')
    parser.add_argument('--custom_audio', help='Path to custom audio file to mix or replace')
    parser.add_argument('--watermark_text', help='Watermark text string to overlay')
    parser.add_argument('--watermark_pos', default='bottom-right', choices=['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'])

    args = parser.parse_args()

    if args.info:
        info = get_video_info(args.url)
        print(json.dumps(info))
    elif args.preview:
        preview_res = get_video_preview(args.url)
        print(json.dumps(preview_res))
    elif args.download:
        if not args.output:
            print(json.dumps({'success': False, 'error': 'Output path is required for download'}))
            sys.exit(1)
        res = download_video(
            url=args.url,
            quality=args.quality,
            output_path=args.output,
            trim_start=args.trim_start,
            trim_end=args.trim_end,
            limit_1min=args.limit_1min,
            crop=args.crop,
            mute_audio=args.mute_audio,
            custom_audio=args.custom_audio,
            watermark_text=args.watermark_text,
            watermark_pos=args.watermark_pos
        )
        print(json.dumps(res))
