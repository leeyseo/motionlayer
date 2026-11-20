"""Interactive, read-only browser observation using local Chrome and CDP."""
import asyncio, base64, json, os, subprocess, sys, urllib.request
from pathlib import Path
import websockets

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.qa/reference'
OUT.mkdir(parents=True,exist_ok=True)

async def main():
    chrome=Path(os.environ.get('PROGRAMFILES',r'C:\Program Files'))/'Google/Chrome/Application/chrome.exe'
    log=(OUT/'chrome.log').open('w')
    process=subprocess.Popen([str(chrome),'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9240','--user-data-dir='+str(OUT/'chrome-profile'),'about:blank'],stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        pages=None
        for _ in range(80):
            try:
                with urllib.request.urlopen('http://127.0.0.1:9240/json/list',timeout=1) as response:pages=json.load(response)
                if pages:break
            except Exception:await asyncio.sleep(.25)
        if not pages:raise RuntimeError('Chrome unavailable')
        async with websockets.connect(next(p['webSocketDebuggerUrl'] for p in pages if p['type']=='page'),max_size=30_000_000) as ws:
            serial=0
            async def call(method,params=None):
                nonlocal serial
                serial+=1;current=serial
                await ws.send(json.dumps({'id':current,'method':method,'params':params or {}}))
                while True:
                    message=json.loads(await asyncio.wait_for(ws.recv(),70))
                    if message.get('id')==current:
                        if 'error' in message:raise RuntimeError(message['error'])
                        return message.get('result',{})
            async def evaluate(expression):
                result=await call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True})
                if result.get('exceptionDetails'):raise RuntimeError(result['exceptionDetails'])
                return result.get('result',{}).get('value')
            async def point(selector,scroll=True):
                return await evaluate('(()=>{const e=document.querySelector('+json.dumps(selector)+');if(!e)return null;'+('e.scrollIntoView({block:"center",behavior:"instant"});' if scroll else '')+'const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height}})()')
            async def snapshot(selectors):
                return await evaluate('('+r'''selectors=>selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return {selector,missing:true};const s=getComputedStyle(e),r=e.getBoundingClientRect();return {selector,tag:e.tagName,classes:e.className,rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)},opacity:s.opacity,transform:s.transform,filter:s.filter,clipPath:s.clipPath,color:s.color,background:s.backgroundColor,transition:s.transition,animation:s.animation,visibility:s.visibility,pointerEvents:s.pointerEvents,objectPosition:s.objectPosition,animations:e.getAnimations().map(a=>({state:a.playState,time:a.currentTime,timing:a.effect?.getTiming(),keyframes:a.effect?.getKeyframes()}))}})'''+')('+json.dumps(selectors)+')')
            await call('Page.enable');await call('Runtime.enable')
            await call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1000,'deviceScaleFactor':1,'mobile':False})
            print('READY: browser observation JSON on stdin',flush=True)
            while True:
                line=await asyncio.to_thread(sys.stdin.readline)
                if not line:break
                try:
                    command=json.loads(line);op=command.get('op');result=None
                    if op=='quit':break
                    if op=='navigate':
                        await call('Page.navigate',{'url':command['url']})
                        await asyncio.sleep(command.get('wait',4))
                        result=await evaluate('({url:location.href,title:document.title,ready:document.readyState,images:document.images.length,loaded:[...document.images].filter(i=>i.complete&&i.naturalWidth).length})')
                    elif op=='eval':result=await evaluate(command['expression'])
                    elif op=='viewport':
                        await call('Emulation.setDeviceMetricsOverride',{'width':command['width'],'height':command['height'],'deviceScaleFactor':1,'mobile':command.get('mobile',False)})
                        await asyncio.sleep(.4);result={'viewport':command}
                    elif op in ['hover','click']:
                        if 'selector' in command:p=await point(command['selector'],command.get('scroll',True))
                        else:p={'x':command['x'],'y':command['y']}
                        if not p:raise RuntimeError('Element not found')
                        targets=command.get('targets',[command['selector']] if 'selector' in command else [])
                        samples=[{'ms':0,'styles':await snapshot(targets)}] if command.get('record') else []
                        await call('Input.dispatchMouseEvent',{'type':'mouseMoved','x':p['x'],'y':p['y']})
                        if op=='click':
                            await call('Input.dispatchMouseEvent',{'type':'mousePressed','x':p['x'],'y':p['y'],'button':'left','clickCount':1})
                            await call('Input.dispatchMouseEvent',{'type':'mouseReleased','x':p['x'],'y':p['y'],'button':'left','clickCount':1})
                        if command.get('record'):
                            previous=0
                            for ms in command.get('times',[80,200,450,850]):
                                await asyncio.sleep(max(0,(ms-previous)/1000));previous=ms
                                samples.append({'ms':ms,'styles':await snapshot(targets)})
                        else:await asyncio.sleep(command.get('wait',.6))
                        result={'point':p,'samples':samples,'state':await evaluate('({url:location.href,scrollY:scrollY})')}
                    elif op=='scroll':
                        if 'selector' in command:await point(command['selector'])
                        else:await evaluate('window.scrollTo({top:'+str(command.get('y',0))+',behavior:"instant"})')
                        await asyncio.sleep(command.get('wait',.8))
                        result={'scrollY':await evaluate('scrollY'),'styles':await snapshot(command.get('targets',[]))}
                    elif op=='snapshot':result=await snapshot(command['selectors'])
                    elif op=='screenshot':
                        shot=await call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
                        target=OUT/Path(command['name']).name
                        target.write_bytes(base64.b64decode(shot['data']));result={'path':str(target)}
                    elif op=='key':
                        params={'key':command['key'],'code':command.get('code',command['key'])}
                        key_code={'Escape':27,'Enter':13,'Tab':9,'ArrowRight':39,'ArrowLeft':37}.get(command['key'])
                        if key_code:params.update(windowsVirtualKeyCode=key_code,nativeVirtualKeyCode=key_code)
                        await call('Input.dispatchKeyEvent',{'type':'keyDown',**params})
                        await call('Input.dispatchKeyEvent',{'type':'keyUp',**params})
                        await asyncio.sleep(.5);result={'key':command['key']}
                    elif op=='media':
                        await call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':command['value']}]});result={'reducedMotion':command['value']}
                    else:raise RuntimeError('Unknown operation')
                    if command.get('save'):
                        (OUT/Path(command['save']).name).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
                    print(json.dumps({'op':op,'result':result},ensure_ascii=False),flush=True)
                except Exception as error:print(json.dumps({'error':str(error)},ensure_ascii=False),flush=True)
            try:await call('Browser.close')
            except Exception:pass
    finally:
        if process.poll() is None:process.terminate()
        log.close()

asyncio.run(main())
