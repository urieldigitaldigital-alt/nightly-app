#!/usr/bin/env python3
"""Regenerates every NIGHTLY icon/splash asset (app icon, Android adaptive
icon layers, favicon, PWA manifest icons, apple-touch-icon, iOS splash
screens) from one simple vector design — a lime crescent moon on the app's
dark background — so every platform touchpoint uses the real brand instead
of the placeholder arrow icon the project shipped with. Run with:
  python3 scripts/generate-brand-icons.py
Requires Pillow (already available in this environment).
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
PUBLIC = os.path.join(ROOT, 'public')

BG = (8, 8, 8, 255)
ACCENT = (200, 255, 77, 255)
ACCENT_RGB = (200, 255, 77)


def crescent_mask(size: int, moon_ratio: float = 0.62) -> Image.Image:
    """A lime crescent-moon alpha mask, supersampled 4x then downsampled for
    clean anti-aliased edges at any output size."""
    ss = 4
    s = size * ss
    mask = Image.new('L', (s, s), 0)
    draw = ImageDraw.Draw(mask)
    r = s * moon_ratio / 2
    cx, cy = s / 2, s / 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    # Subtract an offset circle of the same radius to carve the crescent —
    # the classic two-circle moon construction.
    offset = r * 0.62
    ox, oy = cx + offset * math.cos(math.radians(-35)), cy + offset * math.sin(math.radians(-35))
    draw.ellipse([ox - r, oy - r, ox + r, oy + r], fill=0)
    return mask.resize((size, size), Image.LANCZOS)


def flat_icon(size: int, moon_ratio: float = 0.62) -> Image.Image:
    """Full-bleed square: dark background + lime crescent, no padding —
    correct for non-adaptive contexts (favicon, apple-touch-icon, plain
    manifest icons) since the OS does its own corner rounding."""
    img = Image.new('RGBA', (size, size), BG)
    moon = crescent_mask(size, moon_ratio)
    solid = Image.new('RGBA', (size, size), ACCENT)
    img.paste(solid, (0, 0), moon)
    return img


def transparent_glyph(size: int, moon_ratio: float) -> Image.Image:
    """Just the lime crescent on a transparent canvas — for layers the OS
    composites itself (Android adaptive foreground, expo-splash-screen's
    image-over-backgroundColor)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    moon = crescent_mask(size, moon_ratio)
    solid = Image.new('RGBA', (size, size), ACCENT)
    img.paste(solid, (0, 0), moon)
    return img


def monochrome_glyph(size: int, moon_ratio: float) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    moon = crescent_mask(size, moon_ratio)
    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    img.paste(white, (0, 0), moon)
    return img


def splash(width: int, height: int, moon_ratio_of_min_dim: float = 0.26) -> Image.Image:
    img = Image.new('RGBA', (width, height), BG)
    glyph_size = int(min(width, height) * moon_ratio_of_min_dim / 0.62)
    moon = transparent_glyph(glyph_size, 0.62)
    img.alpha_composite(moon, ((width - glyph_size) // 2, (height - glyph_size) // 2))
    return img


def save(img: Image.Image, path: str, strip_alpha: bool = False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if strip_alpha:
        bg = Image.new('RGB', img.size, BG[:3])
        bg.paste(img, (0, 0), img)
        bg.save(path)
    else:
        img.save(path)
    print('wrote', os.path.relpath(path, ROOT))


# --- Core app icon (adaptive-icon-safe: content kept within ~66% so Android's
# circular/squircle mask and iOS's rounded-square never clip it) ---
save(flat_icon(1024, moon_ratio=0.58), os.path.join(ASSETS, 'icon.png'))
save(flat_icon(48, moon_ratio=0.58), os.path.join(ASSETS, 'favicon.png'))

# --- Android adaptive icon (three separate layers Android composites itself) ---
save(transparent_glyph(512, moon_ratio=0.40), os.path.join(ASSETS, 'android-icon-foreground.png'))
save(Image.new('RGBA', (512, 512), BG), os.path.join(ASSETS, 'android-icon-background.png'))
save(monochrome_glyph(432, moon_ratio=0.46), os.path.join(ASSETS, 'android-icon-monochrome.png'))

# --- expo-splash-screen image (transparent glyph composited over backgroundColor) ---
save(transparent_glyph(1024, moon_ratio=0.5), os.path.join(ASSETS, 'splash-icon.png'))

# --- Web PWA manifest icons ---
save(flat_icon(192, moon_ratio=0.58), os.path.join(PUBLIC, 'icon-192.png'))
save(flat_icon(512, moon_ratio=0.58), os.path.join(PUBLIC, 'icon-512.png'))
# Maskable: OS applies its own crop mask (up to a 20% margin on any edge), so
# keep the glyph well inside that safe zone.
save(flat_icon(512, moon_ratio=0.40), os.path.join(PUBLIC, 'icon-512-maskable.png'))
save(flat_icon(1024, moon_ratio=0.58), os.path.join(PUBLIC, 'icon.png'))

# --- apple-touch-icon: iOS rounds the corners itself, must have zero alpha ---
save(flat_icon(180, moon_ratio=0.58), os.path.join(PUBLIC, 'apple-touch-icon.png'), strip_alpha=True)

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
