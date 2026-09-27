"""Preserve generated punch/button originals and cut transparent 2D runtime sprites.

Run with the two image_generate result paths (button first, punch second).
Only output files inside the project; generated cache inputs are read-only.
"""
from pathlib import Path
import shutil
import sys
from PIL import Image, ImageDraw

if len(sys.argv) not in (3, 4):
    raise SystemExit('Usage: python tests/build-marble-punch-assets.py BUTTON_SOURCE PUNCH_SOURCE [PRESSED_SOURCE]')
out = Path('assets/marble-builder/devices')
out.mkdir(parents=True, exist_ok=True)
button_source, punch_source = (Path(value) for value in sys.argv[1:3])
for source, name in ((button_source, 'source-button.png'), (punch_source, 'source-punch.png')):
    if source.resolve() != (out / name).resolve():
        shutil.copyfile(source, out / name)

def cut_button(source, destination):
    button = Image.open(source).convert('RGBA')
    # Key the off-white backdrop, not the original artwork. The red outline stays intact.
    rgba = bytearray(button.tobytes())
    for index in range(0, len(rgba), 4):
        r, g, b = rgba[index:index + 3]
        rgba[index + 3] = min(255, max(0, (r - max(g, b) - 12) * 8))
    button = Image.frombytes('RGBA', button.size, bytes(rgba))
    button = button.crop(button.getchannel('A').getbbox())
    button.save(out / destination)

cut_button(button_source, 'button.png')
if len(sys.argv) == 4:
    pressed_source = Path(sys.argv[3])
    shutil.copyfile(pressed_source, out / 'source-button-pressed.png')
    cut_button(pressed_source, 'button-pressed.png')

punch = Image.open(punch_source).convert('RGBA')
# The generated checkerboard is painted RGB, not actual transparency. Cut its
# illustrated silhouettes while retaining the source pixels (no artwork redraw).
mask = Image.new('L', punch.size)
pen = ImageDraw.Draw(mask)
pen.rounded_rectangle((78, 478, 659, 777), radius=20, fill=255)
pen.rounded_rectangle((644, 512, 727, 742), radius=22, fill=255)
pen.rounded_rectangle((709, 560, 751, 695), radius=12, fill=255)
pen.rectangle((743, 588, 1075, 667), fill=255)
pen.rounded_rectangle((1065, 564, 1109, 692), radius=12, fill=255)
pen.rounded_rectangle((1097, 477, 1184, 778), radius=18, fill=255)
punch.putalpha(mask)
punch.crop((76, 476, 753, 780)).save(out / 'punch-body.png')
punch.crop((753, 585, 1067, 670)).save(out / 'punch-shaft.png')
punch.crop((1065, 475, 1187, 780)).save(out / 'punch-head.png')
for name in ('button.png', 'button-pressed.png', 'punch-body.png', 'punch-shaft.png', 'punch-head.png'):
    if not (out / name).exists():
        continue
    image = Image.open(out / name)
    print(name, image.size, image.mode, image.getchannel('A').getextrema(), image.getchannel('A').getbbox())
