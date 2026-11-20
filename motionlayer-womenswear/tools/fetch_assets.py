"""Temporary reference photographs for the separate womenswear concept."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from io import BytesIO
import urllib.request
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://cascade-preset-1.myshopify.com/cdn/shop/files/'
FILES = {
    'campaign': 'image_23.png?v=1706202594',
    'editorial': 'AW22_Campaign04_226886_LR_1.jpg?v=1663205813',
    'fluid-dress': 'SparkesDressBlue_BulAug2314352.jpg?v=1712820610',
    'stripe-top': 'ViagemSingletGreenStripe_BulAug2314246.jpg?v=1712819202',
    'drape-dress': 'VinhoDressNavy_BulAug2314276.jpg?v=1712820624',
    'cotton-robe': 'SolRobeBrown_BulAug2314174.jpg?v=1712820603',
    'flow-dress': 'VinhoDressGreen_BulAug2314306.jpg?v=1712819213',
    'check-vest': 'UlsterVestCheck_bulfeb20240361.jpg?v=1712818053',
}

def download(item):
    name, source = item
    url = BASE + source + '&width=' + ('1500' if name in ['campaign','editorial'] else '1000')
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=20) as response:
        picture = Image.open(BytesIO(response.read()))
        picture.save(ROOT / 'dist/assets' / (name + '.webp'), 'WEBP', quality=89, method=5)
    return {'file':f'assets/{name}.webp','source':url,'use':'temporary visual reference, not an actual MOTION LAYER product'}

with ThreadPoolExecutor(max_workers=6) as pool:
    records=list(pool.map(download,FILES.items()))
(ROOT/'asset-sources.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print(f'Downloaded {len(records)} reference photographs.')
