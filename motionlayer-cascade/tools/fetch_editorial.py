from pathlib import Path
from io import BytesIO
import json,urllib.request
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
url='https://cascade-preset-1.myshopify.com/cdn/shop/files/AW24CampaignBelfast04A.jpg?v=1712817839&width=1400'
with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=20) as response:
    image=Image.open(BytesIO(response.read()))
    image.save(ROOT/'dist/assets/check-campaign.webp','WEBP',quality=89,method=5)
records=json.loads((ROOT/'asset-sources.json').read_text(encoding='utf-8'))
records.append({'file':'assets/check-campaign.webp','source':url,'use':'temporary visual reference; not a MOTION LAYER product'})
(ROOT/'asset-sources.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
print('Saved additional campaign reference photograph.')
