"""Exercise the visual prototype in the locally installed headless Chrome."""
import asyncio
import base64
import json
import os
from io import BytesIO
from pathlib import Path
import subprocess
import urllib.request
import websockets
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa'
OUT.mkdir(exist_ok=True)

async def main():
    chrome = Path(os.environ.get('PROGRAMFILES', r'C:\Program Files')) / 'Google/Chrome/Application/chrome.exe'
    log = (OUT / 'chrome.log').open('w', encoding='utf-8')
    process = subprocess.Popen([str(chrome), '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9234', '--user-data-dir=' + str(OUT / 'chrome-profile'), 'about:blank'], stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        pages = None
        for _ in range(60):
            try:
                with urllib.request.urlopen('http://127.0.0.1:9234/json/list', timeout=1) as response:
                    pages = json.load(response)
                if pages: break
            except Exception: await asyncio.sleep(.25)
        if not pages: raise RuntimeError('Chrome did not start')
        page = next(page for page in pages if page['type'] == 'page')
        async with websockets.connect(page['webSocketDebuggerUrl'], max_size=20_000_000) as socket:
            serial = 0
            errors = []
            results = []
            async def call(method, params=None):
                nonlocal serial
                serial += 1
                current = serial
                await socket.send(json.dumps({'id': current, 'method': method, 'params': params or {}}))
                while True:
                    message = json.loads(await asyncio.wait_for(socket.recv(), 25))
                    if message.get('method') == 'Runtime.exceptionThrown': errors.append(message['params'])
                    if message.get('id') == current:
                        if 'error' in message: raise RuntimeError(message['error'])
                        return message.get('result', {})
            async def evaluate(expression):
                result = await call('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
                if result.get('exceptionDetails'): raise RuntimeError(result['exceptionDetails'])
                return result.get('result', {}).get('value')
            async def check(expression, name):
                result = await evaluate(expression)
                if result is not True: raise AssertionError(f'{name}: {result}')
                results.append(name)
                print('PASS', name, flush=True)
            async def mouse(selector, click=False, scroll=False):
                point = await evaluate('(()=>{const e=document.querySelector('+json.dumps(selector)+');if(!e)return null;'+('e.scrollIntoView({behavior:"instant",block:"center"});' if scroll else '')+'const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()')
                assert point and point['w'] and point['h'], (selector,point)
                await call('Input.dispatchMouseEvent',{'type':'mouseMoved','x':point['x'],'y':point['y']})
                if click:
                    for kind in ['mousePressed','mouseReleased']:
                        await call('Input.dispatchMouseEvent',{'type':kind,'x':point['x'],'y':point['y'],'button':'left','clickCount':1})
            async def escape():
                for kind in ['keyDown','keyUp']:
                    await call('Input.dispatchKeyEvent',{'type':kind,'key':'Escape','code':'Escape','windowsVirtualKeyCode':27,'nativeVirtualKeyCode':27})
                await asyncio.sleep(.4)
            async def screenshot(name):
                shot = await call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})
                (OUT / name).write_bytes(base64.b64decode(shot['data']))

            async def product_crop(selector):
                rect = await evaluate(f'''(() => {{
                    const r = document.querySelector({json.dumps(selector)}).getBoundingClientRect();
                    return {{x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, scale: 1}};
                }})()''')
                shot = await call('Page.captureScreenshot', {'format': 'png', 'clip': rect})
                return Image.open(BytesIO(base64.b64decode(shot['data']))).convert('RGB')

            def opacity(selector):
                return f'Number(getComputedStyle(document.querySelector({json.dumps(selector)})).opacity)'

            await call('Page.enable')
            await call('Runtime.enable')
            await call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 1000, 'deviceScaleFactor': 1, 'mobile': False})
            await call('Page.navigate', {'url': 'http://127.0.0.1:4173/'})
            for _ in range(50):
                await asyncio.sleep(.3)
                if await evaluate("Boolean(document.querySelectorAll('.product-card').length === 9)"): break
            await evaluate('document.fonts.ready.then(()=>true)')
            await check("document.querySelectorAll('.product-card').length === 9", 'initial collection has 9 products')
            await check("[...document.querySelectorAll('.product-card img')].slice(0,3).every(i=>i.complete && i.naturalWidth>0)", 'initial product images loaded')
            await screenshot('desktop.png')
            await check("document.documentElement.scrollWidth <= innerWidth", 'desktop has no horizontal overflow')
            card = '.product-card:has([data-product="layer-shell"])'
            frame = card + ' .product-photos'
            back = card + ' .product-back'
            await evaluate(f'document.querySelector({json.dumps(frame)}).scrollIntoView({{behavior:"instant",block:"center"}})')
            await call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': 2, 'y': 240})
            await asyncio.sleep(1.15)
            await check(opacity(back) + ' === 0', 'grid starts on the front photograph')
            front_pixels = await product_crop(frame)
            await mouse(frame)
            await asyncio.sleep(.10)
            await check(f'{opacity(back)} > 0 && {opacity(back)} < 1', 'hover fades through an intermediate frame')
            await asyncio.sleep(.32)
            await check(f'{opacity(back)} === 1 && getComputedStyle(document.querySelector({json.dumps(back)})).transitionDuration === "0.3s"', 'rear photograph completes the 300ms fade')
            rear_pixels = await product_crop(frame)
            difference = ImageChops.difference(front_pixels, rear_pixels)
            assert sum(ImageStat.Stat(difference).mean) / 3 > 2, 'Rendered front and rear must look different'
            results.append('rendered front and rear photographs are visibly different')
            await mouse(card + ' .product-name')
            await check(opacity(back) + ' === 1', 'pointer on product name keeps rear visible')
            await mouse(card + ' .product-quick')
            await check(opacity(back) + ' === 1', 'pointer on option keeps rear visible')
            await call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': 2, 'y': 240})
            await asyncio.sleep(.09)
            await check(f'{opacity(back)} > 0 && {opacity(back)} < 1', 'leaving the card reverses the fade')
            await asyncio.sleep(.32)
            assert not ImageChops.difference(front_pixels, await product_crop(frame)).getbbox()
            results.append('leaving restores the original front pixels')
            ids = await evaluate("Array.from(document.querySelectorAll('.product-image-button'), b => b.dataset.product)")
            for product_id in ids:
                button = f'.product-image-button[data-product="{product_id}"]'
                await mouse(button, scroll=True)
                await evaluate(f'document.querySelector({json.dumps(button + " .product-back img")}).decode().then(() => true)')
                await asyncio.sleep(.36)
                await check(f'''(() => {{
                    const button = document.querySelector({json.dumps(button)});
                    const back = button.querySelector('.product-back');
                    const front = button.querySelector('.product-front');
                    return button.matches(':hover') && getComputedStyle(back).opacity === '1'
                        && back.querySelector('img').currentSrc.endsWith('/{product_id}-back.webp')
                        && front.currentSrc.endsWith('/{product_id}.webp')
                        && button.closest('article').classList.contains('soldout') === Boolean(button.querySelector('.product-flag'));
                }})()''', f'{product_id} shows its matching reverse on hover')
            await mouse('.saga-collage-window',False,True); await asyncio.sleep(1.15)
            await check('Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".saga-collage-window>img")).transform).a-1.05)<.001','editorial hover reaches observed five percent zoom')
            await check('getComputedStyle(document.querySelector(".saga-collage-window>img")).transitionDuration==="1s"','editorial uses measured one-second transition')
            await screenshot('editorial-hover.png')
            await mouse('.site-header'); await asyncio.sleep(1.1)
            await check('Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".saga-collage-window>img")).transform).a-1)<.001','editorial zoom reverses')
            await check('document.querySelector(".site-header").getBoundingClientRect().top===0','header remains sticky through long scroll')
            await evaluate('document.getElementById("brand-film").scrollIntoView({behavior:"instant",block:"center"})'); await asyncio.sleep(1.3)
            await check('!document.getElementById("saga-film").paused&&document.getElementById("saga-film").muted&&!document.getElementById("saga-film").controls','film previews muted without controls')
            await screenshot('film-preview.png')
            await mouse('#saga-film-play',True); await asyncio.sleep(.2)
            await check('(()=>{let v=document.getElementById("saga-film");return v.controls&&!v.muted&&!v.paused&&v.currentTime<1&&document.getElementById("saga-film-play").hidden})()','Play restarts film and enables native controls')
            await evaluate('window.scrollTo({top:0,behavior:"instant"})'); await asyncio.sleep(.25)
            await check('document.getElementById("saga-film").paused','offscreen film pauses')
            await mouse('#cart-trigger',True); await asyncio.sleep(.08)
            await check('document.getElementById("cart-dialog").open&&Number(getComputedStyle(document.getElementById("cart-dialog")).opacity)<1','cart fades through intermediate state')
            await asyncio.sleep(.3); await escape()
            await check('!document.getElementById("cart-dialog").open&&document.activeElement.id==="cart-trigger"','Escape closes cart and restores focus')
            await evaluate("document.querySelector('[data-category=bottoms]').click()")
            await check("document.querySelectorAll('.product-card').length === 2", 'item category filter')
            await mouse('.product-card .product-name', scroll=True)
            await asyncio.sleep(.36)
            await check(opacity('.product-back') + ' === 1', 'filtered products retain rollover')
            await evaluate("document.querySelector('[data-category=all]').click(); document.getElementById('index-view').click()")
            await check("document.querySelectorAll('.index-row').length === 9", 'numbered index view')
            await mouse('.index-row .product-name', scroll=True)
            await asyncio.sleep(.36)
            await check(opacity('.index-row .product-back') + ' === 1', 'Index row hover shows its reverse thumbnail')
            await call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': 1, 'y': 200})
            await evaluate("document.querySelector('.index-row button').focus()")
            for kind in ['keyDown', 'keyUp']:
                await call('Input.dispatchKeyEvent', {'type': kind, 'key': 'Tab', 'code': 'Tab', 'windowsVirtualKeyCode': 9})
            await asyncio.sleep(.36)
            await check("document.activeElement.matches('.index-row .product-name:focus-visible') && " + opacity('.index-row .product-back') + ' === 1', 'keyboard navigation reveals the matching back')
            await screenshot('index.png')
            await evaluate("document.getElementById('grid-view').click(); document.getElementById('color-trigger').click(); document.querySelector('[data-color=Navy]').click()")
            await check("document.querySelectorAll('.product-card').length === 2", 'color filter')
            await evaluate("document.querySelector('[data-reset-filters]').click(); document.getElementById('state-trigger').click(); document.querySelector('[data-mood=slow]').click()")
            await check("document.querySelectorAll('.product-card').length === 3", 'state recommendation filter')
            await evaluate("document.querySelector('[data-reset-filters]').click(); document.getElementById('state-close').click(); document.querySelector('[data-product=everyday-tee]').click()")
            await check("document.getElementById('product-dialog').open", 'product detail opens')
            await evaluate("document.getElementById('detail-add').click()")
            await check("document.getElementById('product-dialog').open && document.querySelector('.cart-count').textContent === '(0)'", 'size required before adding to bag')
            await evaluate("document.querySelector('[data-size=M]').click(); document.getElementById('detail-add').click()")
            await check("document.getElementById('cart-dialog').open && document.querySelector('.cart-count').textContent === '(1)'", 'size selection and bag')
            await evaluate("document.querySelector('[data-delta=\"1\"]').click()")
            await check("document.querySelector('.cart-count').textContent === '(2)' && JSON.parse(localStorage.getItem('motionlayer-bag'))[0].quantity===2", 'cart quantity and persistence')
            await evaluate("document.querySelector('[data-remove-cart]').click(); document.getElementById('cart-dialog').close(); document.querySelector('[data-product=soft-hoodie]').click()")
            await check("document.getElementById('detail-add').disabled", 'sold out product cannot be bought')
            await evaluate("document.getElementById('product-dialog').close(); document.getElementById('search-trigger').click(); document.getElementById('product-search').value='<img src=x onerror=alert(1)>'; document.getElementById('product-search').dispatchEvent(new Event('input'))")
            await check("document.querySelectorAll('.product-card').length===0 && document.querySelectorAll('.active-filters img').length===0", 'empty search and safe query display')
            await evaluate("document.getElementById('search-close').click(); window.scrollTo(0,0)")
            await call('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 1, 'mobile': True})
            await call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
            await asyncio.sleep(.4)
            await check("document.documentElement.scrollWidth <= innerWidth", 'mobile has no horizontal overflow')
            await screenshot('mobile.png')
            await evaluate("document.getElementById('mobile-menu-trigger').click()")
            await asyncio.sleep(.4)
            await check("!document.getElementById('mobile-menu').hidden&&document.getElementById('mobile-menu').open", 'mobile navigation opens')
            await check('Math.abs(document.getElementById("mobile-menu").getBoundingClientRect().height-innerHeight*.95)<2&&document.getElementById("mobile-menu").getBoundingClientRect().top>0','mobile menu opens as reference bottom sheet')
            await screenshot('mobile-menu.png')
            await escape()
            await check('document.getElementById("mobile-menu").hidden&&!document.getElementById("mobile-menu").open','mobile menu closes with Escape')
            point = await evaluate('''(() => {
                const button = document.querySelector('.product-image-button');
                button.scrollIntoView({behavior:"instant",block:"center"});
                const r = button.getBoundingClientRect();
                return {x:r.left+r.width/2, y:r.top+r.height/2};
            })()''')
            await check("matchMedia('(hover:none)').matches && " + opacity('.product-back') + ' === 0', 'touch starts on the front')
            await call('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
            await call('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            await asyncio.sleep(.35)
            await check("document.getElementById('product-dialog').open", 'one touch opens product details')
            await check("document.getElementById('product-dialog').getBoundingClientRect().width <= innerWidth", 'mobile product detail fits')
            await screenshot('mobile-product.png')
            await escape()
            for width,height in [(375,812),(390,844),(430,932)]:
                await call('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':True})
                await asyncio.sleep(.2)
                await check('document.documentElement.scrollWidth<=innerWidth',f'{width}px no horizontal overflow')
                await check('getComputedStyle(document.getElementById("product-grid")).gridTemplateColumns.split(" ").length===1',f'{width}px reference single-column product flow')
                await check('Math.abs(document.getElementById("saga-film").getBoundingClientRect().height-innerWidth/1.771)<2',f'{width}px video preserves Saga widescreen ratio')
                await mouse('#cart-trigger',True); await asyncio.sleep(.4)
                await check('Math.abs(document.getElementById("cart-dialog").getBoundingClientRect().height-innerHeight*.95)<2',f'{width}px cart uses 95svh bottom sheet')
                await screenshot(f'mobile-{width}-cart.png'); await escape()
            await call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]})
            await call('Page.navigate',{'url':'http://127.0.0.1:4173/'}); await asyncio.sleep(1)
            await evaluate('document.getElementById("brand-film").scrollIntoView({behavior:"instant",block:"center"})'); await asyncio.sleep(.5)
            await check('document.getElementById("saga-film").paused&&!document.getElementById("saga-film").controls','reduced motion disables autoplay')
            await mouse('#saga-film-play',True); await asyncio.sleep(.3)
            await check('!document.getElementById("saga-film").paused&&document.getElementById("saga-film").controls','reduced motion still permits deliberate playback')
            await mouse('#cart-trigger',True)
            await check('getComputedStyle(document.getElementById("cart-dialog")).animationName==="none"','reduced motion disables sheet animation')
            await escape()
            await call('Emulation.setTouchEmulationEnabled', {'enabled': False})
            await call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 1000, 'deviceScaleFactor': 1, 'mobile': False})
            await mouse('.product-image-button', scroll=True)
            await check(opacity('.product-back') + ' === 1 && getComputedStyle(document.querySelector(".product-back")).transitionDuration === "0s"', 'reduced motion swaps the photograph immediately')
            await call('Network.enable')
            await call('Network.setCacheDisabled', {'cacheDisabled': True})
            await call('Network.setBlockedURLs', {'urls': ['*layer-shell-back.webp*']})
            await call('Page.navigate', {'url': 'http://127.0.0.1:4173/'})
            await asyncio.sleep(.6)
            await mouse(frame, scroll=True)
            await asyncio.sleep(.4)
            await check(f'''(() => {{
                const frame = document.querySelector({json.dumps(frame)});
                const image = frame.querySelector('.product-back img');
                return image.complete && !image.naturalWidth && frame.querySelector('.product-front').naturalWidth > 0
                    && {opacity(back)} === 0;
            }})()''', 'unavailable back leaves the front visible on hover')
            if errors: raise AssertionError(f'Browser errors: {errors}')
            (OUT/'motion-results.json').write_text(json.dumps({'passed':results,'browser_errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
            print(f'PASS {len(results)} browser checks',flush=True)
            print('PASS no browser JavaScript errors', flush=True)
            try: await call('Browser.close')
            except Exception: pass
    finally:
        if process.poll() is None: process.terminate()
        log.close()

if __name__ == '__main__': asyncio.run(main())
