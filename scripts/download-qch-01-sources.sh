#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE_DIR="$ROOT_DIR/.private-sources/qch-01"
mkdir -p "$SOURCE_DIR"

curl -L --fail \
  'https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf' \
  -o "$SOURCE_DIR/lengua-y-cultura-quechuas-i.pdf"
curl -L --fail \
  'https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf' \
  -o "$SOURCE_DIR/nuevo-diccionario-vol-1.pdf"

cd "$SOURCE_DIR"
printf '%s  %s\n' \
  'd52939c138182b7e743598964984d9edcea82b0c1dfd7051ba1282097c7f762c' \
  'lengua-y-cultura-quechuas-i.pdf' \
  '7e6404c7fd37d6b3ffb9142c1332481307141ba192738d2d18aabba3032c4335' \
  'nuevo-diccionario-vol-1.pdf' | sha256sum --check
