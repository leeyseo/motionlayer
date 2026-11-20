"""Self-host the open-source font subsets used by the preview."""
from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
text = ''.join((ROOT / 'dist' / file).read_text(encoding='utf-8') for file in ['index.html', 'app.js', 'motion.js'])
korean = ''.join(sorted(set(re.findall('[가-힣]', text))))
requests = [('dm-sans', 'DM Sans:wght@400..700', None), ('ibm-plex-mono', 'IBM Plex Mono:wght@400;500', None), ('noto-sans-kr', 'Noto Sans KR:wght@400;500', korean)]
rules = []
for slug, family, subset in requests:
    query = {'family': family, 'display': 'swap'}
    if subset: query['text'] = subset
    url = 'https://fonts.googleapis.com/css2?' + urllib.parse.urlencode(query)
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': AGENT}), timeout=20) as response:
        css = response.read().decode()
    faces = re.findall(r'@font-face\s*\{[^}]+\}', css)
    for index, face in enumerate(faces):
        if not subset and ('U+0000-00FF' not in face): continue
        remote = re.search(r'url\(([^)]+)\)', face).group(1)
        filename = f'{slug}-{index}.woff2'
        with urllib.request.urlopen(urllib.request.Request(remote, headers={'User-Agent': AGENT}), timeout=20) as response:
            (ROOT / 'dist' / 'assets' / filename).write_bytes(response.read())
        rules.append(face.replace(remote, 'assets/' + filename))
(ROOT / 'dist' / 'fonts.css').write_text('\n'.join(rules), encoding='utf-8')
print(f'Self-hosted {len(rules)} font faces; Korean subset: {len(korean)} characters.')
