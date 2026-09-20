"""Build the optional offline UI fonts; requires fonttools[woff].

Original files live in ignored .local/font-sources. All glyphs are retained.
Converted fonts use Ludian family names; original copyright and OFL remain.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib
import json
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/fonts'
CACHE = ROOT / '.local/font-sources'
SOURCES = [
    ('rounded-regular', 'https://github.com/lxgw/975Yuan/releases/download/26.07.26/LXGW975YuanSC-400W.ttf', 'Ludian Rounded', 'Regular', 'LudianRounded-Regular'),
    ('rounded-bold', 'https://github.com/lxgw/975Yuan/releases/download/26.07.26/LXGW975YuanSC-700W.ttf', 'Ludian Rounded', 'Bold', 'LudianRounded-Bold'),
    ('handwritten', 'https://github.com/lxgw/LxgwWenKai-Screen/releases/download/v1.522/LXGWWenKaiGBScreen.ttf', 'Ludian Hand', 'Regular', 'LudianHand-Regular'),
]

def fetch(url, path):
    if not path.exists():
        request = Request(url, headers={'User-Agent': 'Ludian-font-build'})
        with urlopen(request, timeout=120) as response:
            path.write_bytes(response.read())
    return path.read_bytes()

if __name__ == '__main__':
    CACHE.mkdir(parents=True, exist_ok=True)
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = []
    for key, url, family, style, postscript in SOURCES:
        source = CACHE / (key + '.ttf')
        original = fetch(url, source)
        font = TTFont(source)
        for record in font['name'].names:
            values = {1: family, 2: style, 3: postscript + '-Ludian-0.3', 4: family + ' ' + style, 6: postscript, 16: family, 17: style}
            if record.nameID in values:
                record.string = values[record.nameID].encode(record.getEncoding())
        output = DEST / (key + '.woff2')
        font.flavor = 'woff2'
        font.save(output)
        manifest.append({'file': output.name, 'source': url, 'sourceSha256': hashlib.sha256(original).hexdigest(), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'characters': len(font.getBestCmap()), 'family': family})
        print(key, output.stat().st_size, 'bytes', flush=True)
    for filename, url in [
        ('rounded-OFL.txt', 'https://raw.githubusercontent.com/lxgw/975Yuan/26.07.26/OFL.txt'),
        ('handwritten-OFL.txt', 'https://raw.githubusercontent.com/lxgw/LxgwWenKai-Screen/v1.522/OFL.txt'),
    ]:
        fetch(url, DEST / filename)
    (DEST / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
