"""Download temporary reference photography for the private design prototype."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
import json
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def download(record):
    request = urllib.request.Request(record['url'], headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        picture = Image.open(BytesIO(response.read()))
        picture.save(ROOT / 'dist' / record['file'], 'WEBP', quality=88, method=6)

if __name__ == "__main__":
    sources = json.loads((ROOT / 'asset-sources.json').read_text(encoding='utf-8'))
    product_photos = [item for item in sources if item['source'].startswith('https://www.gnuhr.com/')]
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(download, product_photos))
    print(f'Saved {len(product_photos)} reference product photographs.')
