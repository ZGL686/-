"""Draw Ludian's monochrome L mark from shared vector geometry."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
# A paper block with a dark edge and a custom slab-serif L. No font dependency.
polygons = [
    ([(8, 7), (50, 3), (59, 10), (59, 57), (13, 61), (5, 54), (5, 12)], '#252525'),
    ([(9, 11), (51, 8), (55, 12), (55, 54), (13, 57), (9, 53)], '#ffffff'),
    ([(14, 13), (51, 11), (51, 51), (14, 54)], '#ffffff'),
    ([(21, 20), (36, 19), (36, 23), (32, 23), (32, 43), (40, 43), (42, 36), (46, 36), (46, 48), (21, 49), (21, 45), (25, 45), (25, 24), (21, 24)], '#252525'),
]
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + ''.join('<polygon points="' + ' '.join(f'{x},{y}' for x,y in points) + f'" fill="{color}"/>' for points,color in polygons) + '<path d="M9 11 L14 13 L14 54 M14 13 L51 11" fill="none" stroke="#252525" stroke-width="2"/></svg>\n'
(ROOT/'public/favicon.svg').write_text(svg, encoding='utf-8')
image = Image.new('RGBA', (1024,1024), (0,0,0,0))
draw = ImageDraw.Draw(image)
for points,color in polygons:
    draw.polygon([(x*16,y*16) for x,y in points], fill=color)
draw.line([(9*16,11*16),(14*16,13*16),(14*16,54*16)], fill='#252525',width=32)
draw.line([(14*16,13*16),(51*16,11*16)],fill='#252525',width=32)
image.resize((256,256),Image.Resampling.LANCZOS).save(ROOT/'src-tauri/icons/icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
(ROOT/'.local').mkdir(exist_ok=True)
image.resize((256,256),Image.Resampling.LANCZOS).save(ROOT/'.local/ludian-icon.png')
