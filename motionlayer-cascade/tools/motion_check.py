"""Browser-level motion and interaction checks using real CDP input."""
import asyncio, base64, json, os, subprocess, urllib.request
from pathlib import Path
import websockets

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.qa/motion'
OUT.mkdir(parents=True, exist_ok=True)

async def main():
    chrome = Path(os.environ.get('PROGRAMFILES', r'C:\Program Files')) / 'Google/Chrome/Application/chrome.exe'
    log = (OUT / 'chrome.log').open('w')
    process = subprocess.Popen([str(chrome), '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9242', '--user-data-dir=' + str(OUT / 'profile'), 'about:blank'], stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    results, errors = [], []
    try:
        pages = None
        for _ in range(60):
            try:
                with urllib.request.urlopen('http://127.0.0.1:9242/json/list', timeout=1) as r: pages = json.load(r)
                if pages: break
            except Exception: await asyncio.sleep(.25)
        assert pages, 'Chrome unavailable'
        async with websockets.connect(next(p['webSocketDebuggerUrl'] for p in pages if p['type'] == 'page'), max_size=30_000_000) as ws:
            serial = 0
            async def call(method, params=None):
                nonlocal serial
                serial += 1; current = serial
                await ws.send(json.dumps({'id': current, 'method': method, 'params': params or {}}))
                while True:
                    m = json.loads(await asyncio.wait_for(ws.recv(), 40))
                    if m.get('method') == 'Runtime.exceptionThrown': errors.append(m['params'])
                    if m.get('id') == current:
                        assert 'error' not in m, m
                        return m.get('result', {})
            async def evaluate(expression):
                r = await call('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
                assert not r.get('exceptionDetails'), r
                return r.get('result', {}).get('value')
            async def check(expression, name):
                value = await evaluate(expression)
                assert value, (name, value)
                results.append(name)
                print('PASS ' + name, flush=True)
            async def point(selector, scroll=False):
                return await evaluate('(()=>{const e=document.querySelector(' + json.dumps(selector) + ');if(!e)return null;' + ('e.scrollIntoView({block:"center",behavior:"instant"});' if scroll else '') + 'const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}})()')
            async def mouse(selector, click=False, scroll=False):
                p = await point(selector, scroll)
                assert p and p['w'] and p['h'], (selector, p)
                await call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': p['x'], 'y': p['y']})
                if click:
                    for kind in ['mousePressed', 'mouseReleased']:
                        await call('Input.dispatchMouseEvent', {'type': kind, 'x': p['x'], 'y': p['y'], 'button': 'left', 'clickCount': 1})
            async def escape():
                for kind in ['keyDown', 'keyUp']:
                    await call('Input.dispatchKeyEvent', {'type': kind, 'key': 'Escape', 'code': 'Escape', 'windowsVirtualKeyCode': 27, 'nativeVirtualKeyCode': 27})
                await asyncio.sleep(.7)
            async def capture(name):
                r = await call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})
                (OUT / name).write_bytes(base64.b64decode(r['data']))
            async def load():
                await call('Page.navigate', {'url': 'http://127.0.0.1:4175/'})
                for _ in range(60):
                    await asyncio.sleep(.1)
                    if await evaluate('document.querySelectorAll(".product-card").length===6'): break
                await evaluate('document.fonts.ready.then(()=>true)')
                await asyncio.sleep(1)
            async def scroll(y):
                await evaluate(f'window.scrollTo({{top:{y},behavior:"instant"}})')
                await asyncio.sleep(.15)
            async def swipe(selector, dx=-150):
                p = await point(selector)
                x, y = p['x'] + (60 if dx < 0 else -60), p['y']
                await call('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
                for step in range(1, 6):
                    await call('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx * step / 5, 'y': y}]})
                    await asyncio.sleep(.035)
                await call('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                await asyncio.sleep(.8)

            await call('Page.enable'); await call('Runtime.enable')
            await call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 1000, 'deviceScaleFactor': 1, 'mobile': False})
            await load()
            await check('document.documentElement.scrollWidth<=innerWidth', 'desktop no horizontal overflow')
            await capture('desktop-home.png')
            await mouse('.opening-one .image-window')
            await asyncio.sleep(.08)
            await check('(()=>{const s=getComputedStyle(document.querySelector(".opening-one img"));const n=new DOMMatrixReadOnly(s.transform).a;return n>1&&n<1.1&&s.transitionDuration==="0.3s"})()', 'hero hover is in motion at 80ms')
            await asyncio.sleep(.3)
            await check('Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".opening-one img")).transform).a-1.1)<.001', 'hero hover ends at scale 1.1')
            await mouse('.site-header'); await asyncio.sleep(.35)
            await check('Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".opening-one img")).transform).a-1)<.001', 'hero hover reverses')
            first = await evaluate('new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".opening-one [data-parallax]")).transform).m42')
            await scroll(450)
            second = await evaluate('new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".opening-one [data-parallax]")).transform).m42')
            assert second < first - 5, (first, second)
            results.append('parallax responds to real scroll')
            await check('document.querySelector(".site-header").getBoundingClientRect().top===0', 'header stays at viewport top')
            await scroll(0); await mouse('#shop-link'); await asyncio.sleep(.4)
            await check('!document.getElementById("drawer").open', 'Shop hover underlines without opening drawer')
            await mouse('#shop-link', True); await asyncio.sleep(.1)
            await check('new DOMMatrixReadOnly(getComputedStyle(document.getElementById("drawer")).transform).m41 < -10', 'left drawer is between endpoints')
            await asyncio.sleep(.5)
            await check('document.getElementById("drawer").open&&Math.abs(document.getElementById("drawer").getBoundingClientRect().left)<1', 'left drawer reaches viewport edge')
            await mouse('.menu-accordion', True); await asyncio.sleep(.1)
            await check('document.querySelector(".menu-collapse").getAnimations().some(a=>a.playState==="running")', 'menu content height animates')
            await asyncio.sleep(.3); await capture('desktop-menu.png')
            await escape()
            await check('!document.getElementById("drawer").open&&document.activeElement.id==="shop-link"', 'Escape closes drawer and restores focus')
            await mouse('#search-link', True); await asyncio.sleep(.6)
            await check('document.activeElement.id==="search-input"&&document.getElementById("drawer").dataset.side==="right"', 'search enters from right and receives focus')
            await call('Input.insertText', {'text': 'Midnight navy'}); await asyncio.sleep(.4)
            await check('document.querySelectorAll(".search-result").length===1', 'search responds after debounce')
            await mouse('.search-result', True); await asyncio.sleep(1.2)
            await check('document.getElementById("product-dialog").open&&!document.getElementById("drawer").open', 'search result opens product preview')
            await capture('desktop-product.png')
            await mouse('[data-slide="1"]', True); await asyncio.sleep(.15)
            await check('(()=>{const n=new DOMMatrixReadOnly(getComputedStyle(document.getElementById("gallery-track")).transform).m41;return n<0&&Math.abs(n)<document.getElementById("gallery-viewport").clientWidth})()', 'gallery slides through intermediate position')
            await asyncio.sleep(.6)
            await check('document.getElementById("gallery-counter").textContent==="02 / 02"', 'gallery reaches second photo')
            await mouse('[data-lightbox="1"]', True); await asyncio.sleep(.15)
            await check('document.getElementById("lightbox").open&&Number(getComputedStyle(document.getElementById("lightbox")).opacity)<1', 'lightbox fades and scales into view')
            await asyncio.sleep(.7); await capture('desktop-lightbox.png')
            await mouse('#zoom-photo-1 .zoom-image', True)
            await check('document.querySelector("#zoom-photo-1 .zoom-image").classList.contains("zoomed")', 'lightbox click zooms photo')
            await escape()
            await check('!document.getElementById("lightbox").open&&document.getElementById("product-dialog").open', 'Escape returns from lightbox to product')
            await mouse('.detail-accordions summary', True, True)
            await check('document.querySelector(".detail-accordions details").open', 'product information expands')
            await mouse('[data-size="M"]', True, True)
            await mouse('#preview-button', True, True); await asyncio.sleep(1)
            await check('document.getElementById("drawer").dataset.panel==="bag"&&document.querySelectorAll(".bag-item").length===1', 'visual add-to-bag opens cart drawer')
            await mouse('[data-change="1"]', True)
            await check('document.querySelector(".quantity span").textContent==="2"&&document.getElementById("bag-link").textContent==="Bag (2)"', 'bag quantity updates in place')
            await capture('desktop-bag.png')
            await mouse('[data-remove]', True)
            await check('!!document.querySelector(".bag-empty")', 'remove returns cart to empty state')
            await escape(); await scroll(1600)
            await evaluate('document.getElementById("collection").scrollIntoView({behavior:"instant",block:"start"})'); await asyncio.sleep(.9)
            await mouse('#filter-link', True); await asyncio.sleep(.6)
            await mouse('input[name="category"][value="tops"]', True, True)
            await mouse('#drawer-filters button[type="submit"]', True, True); await asyncio.sleep(.7)
            await check('document.querySelectorAll(".product-card").length===1', 'drawer item filter updates collection')
            await evaluate('document.getElementById("reset-filters").click();document.getElementById("collection").scrollIntoView({behavior:"instant",block:"start"})'); await asyncio.sleep(1)
            await mouse('.product-card:first-child .product-photo', False, True); await asyncio.sleep(.9)
            await check('getComputedStyle(document.querySelector(".product-card:first-child .product-secondary")).opacity==="1"', 'product hover shows real alternate photo')
            await capture('desktop-collection.png')
            await evaluate('document.getElementById("index-view").click()')
            await check('document.querySelectorAll(".index-row").length===6', 'Index view preserves products')
            await evaluate('document.getElementById("grid-view").click();document.querySelector("[data-mood=calm]").click()'); await asyncio.sleep(.7)
            await check('document.querySelectorAll(".product-card").length===3', 'mood filter keeps matching products')

            arrivals_top = await evaluate('document.getElementById("latest-arrivals").offsetTop')
            await scroll(arrivals_top + 650); await asyncio.sleep(1)
            title_y = await evaluate('document.getElementById("arrivals-title").getBoundingClientRect().top')
            await check('document.querySelectorAll(".arrival-card").length===8', 'Latest Arrivals contains eight products')
            await check('(()=>{const a=[...document.querySelectorAll(".arrival-card")];return a[0].offsetWidth<a[1].offsetWidth&&a[4].offsetWidth>a[2].offsetWidth&&a[0].offsetLeft<a[1].offsetLeft})()', 'arrivals use independent columns and varied photo sizes')
            await scroll(arrivals_top + 1000); await asyncio.sleep(.8)
            moved_y = await evaluate('document.getElementById("arrivals-title").getBoundingClientRect().top')
            assert abs(title_y - moved_y) < 2, (title_y, moved_y)
            await check('(()=>{let e=document.getElementById("arrivals-title"),r=e.getBoundingClientRect();return Math.abs(r.top+r.height/2-innerHeight/2)<2})()', 'arrivals heading stays at viewport center during scroll')
            await capture('desktop-latest-arrivals.png')
            await mouse('.arrival-card[data-arrival="red-wrap-top"] .arrival-photo', False, True); await asyncio.sleep(1)
            await check('getComputedStyle(document.querySelector("[data-arrival=red-wrap-top] .arrival-secondary")).opacity==="1"', 'arrivals hover crossfades alternate photo')
            await mouse('.arrival-card[data-arrival="red-wrap-top"] .arrival-photo', True)
            await asyncio.sleep(.5)
            await check('document.getElementById("product-dialog").open&&document.getElementById("product-title").textContent==="Ribbon wrap top"', 'new arrival photo opens matching product details')
            await escape()

            await evaluate('document.querySelector(".pieces-carousel").scrollIntoView({behavior:"instant",block:"center"})'); await asyncio.sleep(.8)
            await mouse('#pieces-next', True); await asyncio.sleep(.15)
            await check('new DOMMatrixReadOnly(getComputedStyle(document.getElementById("pieces-track")).transform).m41<0&&getComputedStyle(document.getElementById("pieces-track")).transitionDuration==="0.61s"', 'homepage carousel uses measured 610ms transition')
            await asyncio.sleep(.6)
            await check('document.getElementById("pieces-status").textContent==="3–4 / 6"', 'desktop carousel advances two pieces')
            await capture('desktop-carousel.png')
            await evaluate('document.getElementById("layers-edit").scrollIntoView({behavior:"instant",block:"center"})'); await asyncio.sleep(.4)
            await mouse('#layers-next', True); await asyncio.sleep(.75)
            await check('document.getElementById("layers-status").textContent==="3–4 / 6"&&document.getElementById("pieces-status").textContent==="3–4 / 6"', 'lower carousel moves independently')
            await mouse('#layers-next', True); await asyncio.sleep(.7)
            await mouse('#layers-next', True); await asyncio.sleep(.7)
            await check('document.getElementById("layers-status").textContent==="1–2 / 6"', 'lower carousel Next rewinds at end')
            await capture('desktop-lower-carousel.png')
            await evaluate('document.querySelector(".marquee").scrollIntoView({behavior:"instant",block:"center"})'); await asyncio.sleep(.3)
            await mouse('.marquee'); await asyncio.sleep(.2)
            await check('document.getElementById("marquee-track").getAnimations()[0].playState==="paused"', 'flowing text pauses on hover')
            await mouse('.site-header'); await asyncio.sleep(.2)
            await check('document.getElementById("marquee-track").getAnimations()[0].playState==="running"', 'flowing text resumes after hover')
            await scroll(0)
            await mouse('.main-nav a[href="#campaign-film"]', True); await asyncio.sleep(2)
            await check('!document.getElementById("lookbook-film").paused&&document.getElementById("lookbook-film").currentTime>0', 'video plays when visible')
            await check('(()=>{const v=document.getElementById("lookbook-film"),r=v.getBoundingClientRect();return v.muted&&v.loop&&v.playsInline&&r.top<innerHeight&&r.bottom>0&&getComputedStyle(v).objectFit==="cover"})()', 'Lookbook navigation reveals full-width background video')
            await capture('desktop-film.png')
            await mouse('#film-toggle', True)
            await check('document.getElementById("lookbook-film").paused', 'video manual pause works')
            await mouse('#film-toggle', True); await scroll(0)
            await check('document.getElementById("lookbook-film").paused', 'video pauses outside viewport')

            for screen_width, screen_height in [(375,812),(390,844),(430,932)]:
                await call('Emulation.setDeviceMetricsOverride', {'width': screen_width, 'height': screen_height, 'deviceScaleFactor': 1, 'mobile': True})
                await load()
                await check('document.documentElement.scrollWidth===innerWidth', f'{screen_width}px mobile no horizontal overflow')
                await check('(()=>{let m=document.getElementById("menu-toggle").getBoundingClientRect(),b=document.querySelector(".brand").getBoundingClientRect(),c=document.getElementById("bag-link").getBoundingClientRect();return m.left<b.left&&b.left<c.left&&Math.abs(document.querySelector(".site-header").getBoundingClientRect().height-56)<1})()', f'{screen_width}px reference header order and height')
                await check('(()=>{let a=[...document.querySelectorAll(".flow-image")].filter(e=>e.getBoundingClientRect().width).map(e=>e.getBoundingClientRect());return a.length===4&&a.every(e=>Math.abs(e.width-innerWidth*5/6)<1)&&Math.abs(a[0].top-136)<1&&Math.abs(a[0].left)<1&&Math.abs(a[1].right-innerWidth)<1&&Math.abs(a[2].left)<1&&Math.abs(a[3].right-innerWidth)<1})()', f'{screen_width}px four campaign photos match reference geometry')
                await check('(()=>{let a=[...document.querySelectorAll(".flow-image")].filter(e=>e.getBoundingClientRect().width).map(e=>e.getBoundingClientRect());return a.slice(1).every((e,i)=>Math.abs(e.top-a[i].bottom-154)<1)})()', f'{screen_width}px campaign spacing matches 154px')
                await check('getComputedStyle(document.getElementById("collection")).display==="none"', f'{screen_width}px home preserves editorial section order')
                await check('Math.abs(document.querySelector(".carousel-photo").getBoundingClientRect().width-(innerWidth*.75-40))<1&&getComputedStyle(document.querySelector(".carousel-name")).fontSize==="16px"', f'{screen_width}px carousel photos and type match reference')
                await capture(f'mobile-{screen_width}-home.png')

            await call('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 1, 'mobile': True})
            await call('Emulation.setTouchEmulationEnabled', {'enabled': True})
            await load()
            await check('document.documentElement.scrollWidth<=innerWidth', 'mobile no horizontal overflow')
            await capture('mobile-home.png')
            await evaluate('window.scrollTo({top:document.getElementById("latest-arrivals").offsetTop+500,behavior:"instant"})'); await asyncio.sleep(1)
            await check('(()=>{const a=[...document.querySelectorAll(".arrival-card")];return a.every((e,i)=>i===0||e.offsetTop>a[i-1].offsetTop)&&a[1].offsetLeft>a[0].offsetLeft&&a[2].offsetLeft===a[0].offsetLeft})()', 'mobile arrivals alternate left and right in product order')
            await check('document.documentElement.scrollWidth<=innerWidth', 'arrivals fit mobile width')
            await capture('mobile-latest-arrivals.png')
            await mouse('#menu-toggle', True); await asyncio.sleep(.6)
            await check('Math.abs(document.getElementById("drawer").getBoundingClientRect().width-innerWidth*11/12)<2', 'mobile drawer occupies eleven twelfths')
            await mouse('.menu-accordion', True); await asyncio.sleep(.4); await capture('mobile-menu.png')
            await mouse('#drawer-categories [data-nav-category="all"]', True); await asyncio.sleep(.9)
            await check('document.body.classList.contains("catalog-open")&&getComputedStyle(document.getElementById("collection")).display!=="none"&&!document.getElementById("drawer").open', 'mobile Shop menu opens the dedicated catalog')
            await evaluate('document.getElementById("collection").scrollIntoView({behavior:"instant",block:"start"})'); await asyncio.sleep(.4)
            await capture('mobile-collection.png')
            await mouse('.product-card:first-child .product-photo', True, True); await asyncio.sleep(.6)
            await capture('mobile-product.png')
            p = await point('#gallery-viewport')
            x, y = p['x'], p['y']
            await call('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x+70, 'y': y}]})
            for step in range(1, 6):
                await call('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x+70-step*30, 'y': y}]})
                await asyncio.sleep(.03)
            await call('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            await asyncio.sleep(.8)
            await check('document.getElementById("gallery-counter").textContent==="02 / 02"&&!document.getElementById("lightbox").open', 'mobile touch swipe advances gallery without click-through')
            await escape()
            await mouse('.brand', True); await asyncio.sleep(.4)
            await check('!document.body.classList.contains("catalog-open")&&getComputedStyle(document.getElementById("latest-arrivals")).display!=="none"', 'brand returns from mobile Shop to the home composition')
            await evaluate('document.getElementById("layers-edit").scrollIntoView({behavior:"instant",block:"center"})'); await asyncio.sleep(.4)
            await mouse('#layers-next', True); await asyncio.sleep(.7)
            await check('document.getElementById("layers-status").textContent==="2–2 / 6"', 'mobile lower carousel advances one piece')
            await swipe('#layers-viewport')
            await check('document.getElementById("layers-status").textContent==="3–3 / 6"&&!document.getElementById("product-dialog").open', 'mobile lower carousel touch swipe avoids click-through')
            for _ in range(3):
                await mouse('#layers-next', True); await asyncio.sleep(.7)
            edge = await evaluate('new DOMMatrixReadOnly(getComputedStyle(document.getElementById("layers-track")).transform).m41')
            await swipe('#layers-viewport')
            end = await evaluate('new DOMMatrixReadOnly(getComputedStyle(document.getElementById("layers-track")).transform).m41')
            assert abs(edge - end) < 1, (edge, end)
            await check('document.getElementById("layers-status").textContent==="6–6 / 6"', 'dragging past final piece settles back without rewind')
            await capture('mobile-lower-carousel.png')
            await evaluate('document.getElementById("campaign-film").scrollIntoView({behavior:"instant",block:"start"})'); await asyncio.sleep(1)
            await check('Math.abs(document.getElementById("lookbook-film").getBoundingClientRect().height-innerHeight)<2', 'mobile video fills viewport height')
            await capture('mobile-background-video.png')
            await call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
            await load()
            await check('[...document.querySelectorAll("[data-motion]")].every(e=>getComputedStyle(e).opacity==="1")', 'reduced motion exposes all content')
            await scroll(450)
            await check('[...document.querySelectorAll("[data-parallax]")].every(e=>getComputedStyle(e).transform==="none")', 'reduced motion disables parallax')
            await check('getComputedStyle(document.querySelector(".arrivals-sticky-title")).position==="relative"&&[...document.querySelectorAll(".arrival-card")].every(e=>getComputedStyle(e).opacity==="1")', 'reduced motion places arrivals heading in document flow')
            await check('getComputedStyle(document.getElementById("marquee-track")).animationName==="none"&&document.getElementById("lookbook-film").paused', 'reduced motion stops flowing text and autoplay video')
            await mouse('#menu-toggle', True)
            await check('document.getElementById("drawer").open&&getComputedStyle(document.getElementById("drawer")).animationName==="none"', 'reduced motion opens drawer immediately')
            assert not errors, errors
            (OUT / 'results.json').write_text(json.dumps({'passed': results, 'browser_errors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'PASS {len(results)} browser checks; no JavaScript exceptions', flush=True)
            await call('Browser.close')
    finally:
        if process.poll() is None: process.terminate()
        log.close()

if __name__ == '__main__':
    asyncio.run(main())
