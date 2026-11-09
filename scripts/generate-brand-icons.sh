#!/bin/bash
# Regenera todos los íconos y pantallas de carga de la web a partir del logo
# que está en el repo.
#
# Reemplaza a `generate-brand-icons.py`, que recortaba la "A" con un pino de
# una maqueta guardada en ~/Downloads con coordenadas fijas. Ese logo era de
# otro proyecto, y el script dependía de un archivo fuera del repo que
# cualquiera podía borrar sin enterarse.
#
# El logo de ahora ya viene cuadrado y con su fondo, así que alcanza con
# escalarlo. Usa `sips`, que viene con macOS: no hay que instalar nada.
#
# Correr con:  bash scripts/generate-brand-icons.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGO="$ROOT/assets/logo-afterdune.png"
PUBLIC="$ROOT/public"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# El negro de la marca, sin el numeral, que es como lo quiere sips.
BG="05070A"

if [ ! -f "$LOGO" ]; then
  echo "No está el logo en $LOGO" >&2
  exit 1
fi

cuadrado() { # <destino> <lado>
  cp "$LOGO" "$TMP/w.png"
  sips -Z "$2" "$TMP/w.png" --out "$1" >/dev/null
}

echo "Íconos…"
cuadrado "$PUBLIC/icon.png"             1024
cuadrado "$PUBLIC/icon-512.png"          512
cuadrado "$PUBLIC/icon-192.png"          192
cuadrado "$PUBLIC/apple-touch-icon.png"  180
cuadrado "$ROOT/assets/icon.png"        1024
cuadrado "$ROOT/assets/splash-icon.png" 1024
cuadrado "$ROOT/assets/favicon.png"       96

# El ícono "maskable" lo recorta el sistema con la forma que quiera —círculo,
# cuadrado redondeado, gota—, así que el contenido tiene que caber en el 80%
# central. Se escala al 80% y se rellena el resto con el fondo de la marca.
echo "Ícono maskable…"
cp "$LOGO" "$TMP/m.png"
sips -Z 410 "$TMP/m.png" >/dev/null
sips -p 512 512 --padColor "$BG" "$TMP/m.png" --out "$PUBLIC/icon-512-maskable.png" >/dev/null

# Mismo criterio para el ícono adaptable de Android.
cp "$LOGO" "$TMP/a.png"
sips -Z 620 "$TMP/a.png" >/dev/null
sips -p 1024 1024 --padColor "$BG" "$TMP/a.png" --out "$ROOT/assets/android-icon-foreground.png" >/dev/null
sips --matchTo "/System/Library/ColorSync/Profiles/Generic Gray Gamma 2.2 Profile.icc" \
  "$ROOT/assets/android-icon-foreground.png" --out "$ROOT/assets/android-icon-monochrome.png" >/dev/null

# Pantallas de carga de iOS en web: el logo centrado sobre el fondo de la
# marca, a un tercio del ancho para que respire en cualquier tamaño.
echo "Pantallas de carga…"
for size in 640x1136 750x1334 828x1792 1125x2436 1170x2532 1179x2556 1242x2208 1242x2688 1284x2778 1290x2796; do
  w="${size%x*}"
  h="${size#*x}"
  cp "$LOGO" "$TMP/s.png"
  sips -Z "$((w / 3))" "$TMP/s.png" >/dev/null
  sips -p "$h" "$w" --padColor "$BG" "$TMP/s.png" --out "$PUBLIC/splash/$size.png" >/dev/null
done

echo "Listo."
