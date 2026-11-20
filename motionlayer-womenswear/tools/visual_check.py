import asyncio, base64, json, os, subprocess, urllib.request
from pathlib import Path
import websockets

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.qa'
OUT.mkdir(exist_ok=True)

async def main():
    chrome=Path(os.environ.get('PROGRAMFILES',r'C:\Program Files'))/'Google/Chrome/Application/chrome.exe'
    log=(OUT/'chrome.log').open('w')
    process=subprocess.Popen([str(chrome),'--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9235','--user-data-dir='+str(OUT/'chrome-profile'),'about:blank'],stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        pages=None
        for _ in range(60):
            try:
                with urllib.request.urlopen('http://127.0.0.1:9235/json/list',timeout=1) as r:pages=json.load(r)
                if pages:break
            except Exception:await asyncio.sleep(.25)
        if not pages:raise RuntimeError('Browser unavailable')
        async with websockets.connect(next(p['webSocketDebuggerUrl'] for p in pages if p['type']=='page'),max_size=20_000_000) as ws:
            serial=0;errors=[]
            async def call(method,params=None):
                nonlocal serial
                serial+=1;current=serial
                await ws.send(json.dumps({'id':current,'method':method,'params':params or {}}))
                while True:
                    msg=json.loads(await asyncio.wait_for(ws.recv(),30))
                    if msg.get('method')=='Runtime.exceptionThrown':errors.append(msg['params'])
                    if msg.get('id')==current:return msg.get('result',{})
            async def evaluate(expression):
                r=await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True})
                if r.get('exceptionDetails'):raise RuntimeError(r['exceptionDetails'])
                return r.get('result',{}).get('value')
            async def capture(name):
                r=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
                (OUT/name).write_bytes(base64.b64decode(r['data']))
            await call('Page.enable');await call('Runtime.enable')
            await call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1000,'deviceScaleFactor':1,'mobile':False})
            await call('Page.navigate',{'url':'http://127.0.0.1:4174/'})
            for _ in range(50):
                await asyncio.sleep(.2)
                if await evaluate("document.querySelectorAll('.product-card').length===6"):break
            await evaluate("document.fonts.ready.then(()=>true)")
            assert await evaluate("document.querySelector('.hero-photo img').complete && document.querySelector('.hero-photo img').naturalWidth>0")
            assert await evaluate('document.documentElement.scrollWidth<=innerWidth')
            await capture('desktop.png')
            await evaluate("document.getElementById('collection').scrollIntoView({behavior:'instant'})")
            await asyncio.sleep(.2)
            await capture('collection.png')
            await evaluate("document.getElementById('index-view').click()")
            assert await evaluate("document.querySelectorAll('.index-row').length===6")
            await evaluate("document.getElementById('grid-view').click();document.querySelector('[data-category=tops]').click()")
            assert await evaluate("document.querySelectorAll('.product-card').length===1")
            await evaluate("document.getElementById('reset-filters').click();window.scrollTo(0,0)")
            await call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
            await asyncio.sleep(.3)
            assert await evaluate('document.documentElement.scrollWidth<=innerWidth')
            await capture('mobile.png')
            await evaluate("document.getElementById('menu-toggle').click()")
            assert await evaluate("!document.getElementById('mobile-menu').hidden")
            assert not errors,errors
            print('PASS desktop and mobile layout, images, gallery/index, category filter, mobile navigation, no browser errors',flush=True)
            try:await call('Browser.close')
            except Exception:pass
    finally:
        if process.poll() is None:process.terminate()
        log.close()

asyncio.run(main())
