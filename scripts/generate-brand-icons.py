#!/usr/bin/env python3
"""Regenerates every Afterdune icon/splash asset (app icon, Android adaptive
icon layers, favicon, PWA manifest icons, apple-touch-icon, iOS splash
screens) from the provided logo artwork (the "A" mark — pine tree + comet
swoosh — cropped from the full lockup, excluding the baked-in mockup frame
and the "Afterdune" wordmark text, since app icons shouldn't contain the app
name as text per Apple's HIG and Android's own guidance). Run with:
  python3 scripts/generate-brand-icons.py
Requires Pillow (already available in this environment) and the source
logo at SOURCE_LOGO below.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
PUBLIC = os.path.join(ROOT, 'public')
SOURCE_LOGO = os.path.expanduser('~/Downloads/image app prev.png')

BG = (8, 8, 8, 255)

# Crop box (in the 1254x1254 source) isolating just the "A" mark — excludes
# the mockup's own rounded-corner frame at the top and the "Afterdune" /
# tagline text at the bottom.
CROP_BOX = (304, 95, 949, 740)


def load_mark(size: int) -> Image.Image:
    src = Image.open(SOURCE_LOGO).convert('RGB')
    cropped = src.crop(CROP_BOX)
    return cropped.resize((size, size), Image.LANCZOS)


def flat_icon(size: int) -> Image.Image:
    """Full-bleed square, mark on its own dark gradient background as-is —
    correct for non-adaptive contexts (favicon, apple-touch-icon, plain
    manifest icons) since the OS does its own corner rounding."""
    return load_mark(size).convert('RGBA')


def transparent_mark(size: int, inner_scale: float = 1.0) -> Image.Image:
    """Alpha-extracts just the glyph (green/yellow mark) from its dark
    background via a luminance threshold — the source has no alpha channel,
    but the mark is bright against a near-black background, so a brightness
    cutoff with a soft falloff cleanly separates them. `inner_scale` shrinks
    the glyph within the canvas (for adaptive-icon/maskable safe zones)."""
    mark_size = int(size * inner_scale)
    mark = load_mark(mark_size).convert('RGB')
    alpha = mark.convert('L').point(lambda p: max(0, min(255, int((p - 40) * 2.2))))
    rgba = mark.copy()
    rgba.putalpha(alpha)

    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    offset = ((size - mark_size) // 2, (size - mark_size) // 2)
    canvas.alpha_composite(rgba, offset)
    return canvas


def monochrome_mark(size: int, inner_scale: float = 1.0) -> Image.Image:
    glyph = transparent_mark(size, inner_scale)
    alpha = glyph.getchannel('A')
    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    white.putalpha(alpha)
    return white


def splash(width: int, height: int, mark_ratio_of_min_dim: float = 0.34) -> Image.Image:
    img = Image.new('RGBA', (width, height), BG)
    glyph_size = int(min(width, height) * mark_ratio_of_min_dim)
    glyph = transparent_mark(glyph_size)
    img.alpha_composite(glyph, ((width - glyph_size) // 2, (height - glyph_size) // 2))
    return img


def save(img: Image.Image, path: str, strip_alpha: bool = False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if strip_alpha:
        bg = Image.new('RGB', img.size, BG[:3])
        bg.paste(img, (0, 0), img if img.mode == 'RGBA' else None)
        bg.save(path)
    else:
        img.save(path)
    print('wrote', os.path.relpath(path, ROOT))


# --- Core app icon (full-bleed, mark on its own background) ---
save(flat_icon(1024), os.path.join(ASSETS, 'icon.png'))
save(flat_icon(48), os.path.join(ASSETS, 'favicon.png'))

# --- Android adaptive icon (three separate layers Android composites itself) ---
save(transparent_mark(512, inner_scale=0.62), os.path.join(ASSETS, 'android-icon-foreground.png'))
save(Image.new('RGBA', (512, 512), BG), os.path.join(ASSETS, 'android-icon-background.png'))
save(monochrome_mark(432, inner_scale=0.68), os.path.join(ASSETS, 'android-icon-monochrome.png'))

# --- expo-splash-screen image (transparent glyph composited over backgroundColor) ---
save(transparent_mark(1024, inner_scale=0.82), os.path.join(ASSETS, 'splash-icon.png'))

# --- Web PWA manifest icons ---
save(flat_icon(192), os.path.join(PUBLIC, 'icon-192.png'))
save(flat_icon(512), os.path.join(PUBLIC, 'icon-512.png'))
# Maskable: OS applies its own crop mask (up to a 20% margin on any edge), so
# keep the glyph well inside that safe zone.
save(transparent_mark(512, inner_scale=0.6).convert('RGBA'), os.path.join(PUBLIC, 'icon-512-maskable.png'))
# Maskable icons still need an opaque background (transparency isn't valid there).
_maskable = Image.new('RGBA', (512, 512), BG)
_maskable.alpha_composite(transparent_mark(512, inner_scale=0.6))
save(_maskable, os.path.join(PUBLIC, 'icon-512-maskable.png'))
save(flat_icon(1024), os.path.join(PUBLIC, 'icon.png'))

# --- apple-touch-icon: iOS rounds the corners itself, must have zero alpha ---
save(flat_icon(180), os.path.join(PUBLIC, 'apple-touch-icon.png'), strip_alpha=True)

# --- iOS splash screens (apple-touch-startup-image), portrait only ---
IOS_SPLASH_SIZES = [
    (1290, 2796),  # iPhone 15/14 Pro Max, 16 Pro Max
    (1179, 2556),  # iPhone 15/14 Pro, 16/16 Pro
    (1284, 2778),  # iPhone 14/13/12 Pro Max (older Max line)
    (1170, 2532),  # iPhone 14/13/12
    (1125, 2436),  # iPhone X/XS/11 Pro, 12/13 mini
    (1242, 2688),  # iPhone XS Max/11 Pro Max
    (828, 1792),   # iPhone XR/11
    (1242, 2208),  # iPhone 6/7/8 Plus
    (750, 1334),   # iPhone SE 2/3, 6/7/8
    (640, 1136),   # iPhone SE 1st gen
]
for w, h in IOS_SPLASH_SIZES:
    save(splash(w, h), os.path.join(PUBLIC, 'splash', f'{w}x{h}.png'))

print('Done.')
