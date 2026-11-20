"""Drive the prototype with a mouse, keyboard and emulated touch in installed Chrome."""
import asyncio, json, os, re
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.async_api import async_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.qa'
URL='http://127.0.0.1:4197/'
CHROME=Path(os.environ['PROGRAMFILES'])/'Google/Chrome/Application/chrome.exe'
passed=[]
errors=[]

def ok(value,label):
    assert value,label
    passed.append(label)
    print('OK',label,flush=True)

async def prepare(page):
    page.on('pageerror',lambda ex:errors.append(str(ex)))
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.url.startswith(URL) and r.status>=400 else None)
    await page.goto(URL,wait_until='domcontentloaded')
    await expect(page.locator('.product-row')).to_have_count(9)

async def desk(browser):
    ctx=await browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
    p=await ctx.new_page()
    await prepare(p)
    ok(await p.locator('html').evaluate("e=>e.classList.contains('first-visit')"),'desktop cold entry runs')
    await p.wait_for_timeout(1250)
    await p.screenshot(path=OUT/'home-desktop.jpg',type='jpeg',quality=85)
    ok(await p.locator('#cover-img').evaluate('e=>e.complete&&e.naturalWidth>=1400'),'campaign photograph loads locally')
    ok(await p.locator('.atlas .tile').count()==9,'numbered photo index matches 9 rows')
    await p.locator('[data-cover-step="1"]').click();await expect(p.locator('#cover-title')).to_have_attribute('aria-label','Daily Form.')
    await p.locator('[data-cover-step="-1"]').click();await expect(p.locator('#cover-title')).to_have_attribute('aria-label','Field Studies.')
    ok(True,'series cover changes in both directions')
    await p.locator('#cover-shop').click()
    await expect(p.locator('.product-row')).to_have_count(3)
    ok('series=field' in p.url,'cover opens its series products')
    await p.locator('[data-reset]').first.click()
    await p.locator('#catalog').evaluate("e=>e.scrollIntoView({behavior:'instant'})")
    await p.mouse.move(2,150);await p.wait_for_timeout(530)
    tile=p.locator('.tile[data-id="layer-shell"]')
    await tile.locator('.backs img').evaluate('im=>im.decode()')
    front=Image.open(BytesIO(await tile.screenshot())).convert('RGB')
    await p.locator('.product-row[data-id="layer-shell"]').hover()
    await p.wait_for_timeout(100)
    dim=p.locator('.tile[data-id="field-pants"] .packshots')
    opacity=lambda locator:locator.evaluate('el=>Number(getComputedStyle(el).opacity)')
    ok(.1<await opacity(dim)<1,'other thumbnails fade through intermediate opacity')
    await p.wait_for_timeout(470)
    ok(abs(await opacity(dim)-.1)<.001,'unselected photo reaches reference opacity')
    ok(await opacity(tile.locator('.backs'))==1 and await tile.evaluate("e=>e.classList.contains('is-active')"),'name hover selects its thumbnail and reveals the back')
    rear=Image.open(BytesIO(await tile.screenshot())).convert('RGB')
    ok(sum(ImageStat.Stat(ImageChops.difference(front,rear)).mean)/3>1,'front and rear are visibly different')
    await p.screenshot(path=OUT/'index-hover-desktop.jpg',type='jpeg',quality=80)
    await p.locator('.tile[data-id="field-pants"]').hover()
    await expect(p.locator('.product-row[data-id="field-pants"]')).to_have_class(re.compile('is-active'))
    ok(True,'photo hover selects the corresponding numbered row')
    await p.mouse.move(1,130);await p.wait_for_timeout(540)
    ok(await opacity(dim)==1 and await opacity(tile.locator('.backs'))==0,'leaving restores all fronts')
    pairs=await p.locator('.tile').evaluate_all("""els=>Promise.all(els.map(async e=>{
        const img=e.querySelector('.backs img');img.loading='eager';await img.decode();
        return img.naturalWidth>0&&img.currentSrc.endsWith('/'+e.dataset.id+'-back.webp');
    }))""")
    ok(len(pairs)==9 and all(pairs),'all nine backs match their product IDs')
    await p.locator('[data-type=outer]').click();await expect(p.locator('.product-row')).to_have_count(2)
    await p.locator('#filter-trigger').click()
    await p.locator('#desktop-picker select[data-field=color]').select_option('Navy')
    await expect(p.locator('#empty')).to_be_visible()
    ok(True,'combined filters have a usable empty state')
    await p.locator('#empty [data-reset]').click()
    await p.locator('.catalog-mood').click()
    await p.locator('#desktop-picker [data-mood=rest]').click()
    await expect(p.locator('.product-row')).to_have_count(3)
    ok('mood=rest' in p.url,'desktop state selection narrows the index and updates its URL')
    await p.reload();await expect(p.locator('.product-row')).to_have_count(3)
    ok(not await p.locator('html').evaluate("e=>e.classList.contains('first-visit')"),'reloading a filtered link restores the results without replaying entry')
    await p.locator('#chips [data-remove-filter=mood]').click()
    await p.go_back();await expect(p.locator('.product-row')).to_have_count(3)
    await p.go_forward();await expect(p.locator('.product-row')).to_have_count(9)
    ok(True,'browser back and forward restore filters')
    await p.locator('#filter-trigger').click()
    await p.locator('#desktop-picker select[data-field=sort]').select_option('low')
    ok(await p.locator('.product-row').first.get_attribute('data-id')=='everyday-cap','price sorting retains item IDs')
    await p.locator('[data-finish-filter]').click()
    await p.locator('.product-row[data-id="soft-hoodie"]').click()
    await expect(p.locator('[data-add]')).to_be_disabled()
    await p.keyboard.press('Escape');await expect(p.locator('#shop-dialog')).not_to_be_visible()
    ok(True,'sold out detail and Escape dismissal work')
    await p.locator('.product-row[data-id="layer-shell"]').click()
    await p.locator('[data-frame="1"]').click()
    ok(await p.locator('.detail-photo img').get_attribute('src')=='assets/layer-shell-back.webp','detail opens its reverse photograph')
    await p.locator('[data-add]').click();await expect(p.locator('#size-error')).to_contain_text('사이즈')
    await p.locator('[data-size=M]').click();await p.locator('[data-add]').click()
    await expect(p.locator('.bag-line')).to_have_count(1)
    await p.locator('[data-delta="1"]').click();await expect(p.locator('.bag-total')).to_contain_text('318,000')
    await p.locator('[data-review]').click();await expect(p.locator('.pay-preview')).to_be_visible()
    await p.reload();await expect(p.locator('.bag-line')).to_have_count(1)
    ok(await p.locator('.qty span').inner_text()=='2','local bag preserves size, quantity and total across reload')
    await p.locator('[data-remove]').click();await expect(p.locator('#shop-body')).to_contain_text('비어')
    await p.keyboard.press('Escape')
    await p.locator('a[href="#info/faq"]').click();await expect(p.locator('#dialog-title')).to_have_text('FAQ')
    await p.keyboard.press('Escape')
    ok(await p.locator('.studio-strip img').count()==3,'customer information and main studio feed are available')
    ok(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'desktop fits viewport')
    await ctx.close()

async def swipe(page, start, end):
    c=await page.context.new_cdp_session(page)
    await c.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start[0],'y':start[1]}]})
    for i in range(1,9):
        x=start[0]+(end[0]-start[0])*i/8;y=start[1]+(end[1]-start[1])*i/8
        await c.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y}]})
        await page.wait_for_timeout(35)
    await c.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await c.detach()

async def mobile(browser,width):
    ctx=await browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    p=await ctx.new_page();await prepare(p)
    if width==390:
        ok(await p.locator('.entry-cover').evaluate("e=>getComputedStyle(e).animationName==='entry-cover'"),'mobile cold entry uses the brand mark')
    await p.wait_for_timeout(1180)
    ok(await p.evaluate("matchMedia('(hover:none)').matches&&document.documentElement.scrollWidth===innerWidth"),f'{width}px touch viewport fits')
    ok(await p.locator('.atlas-pane').is_hidden() and await p.locator('.mobile-preview').is_visible(),f'{width}px uses a single list and large preview')
    if width==390:
        await p.screenshot(path=OUT/'home-mobile.jpg',type='jpeg',quality=90)
        await p.locator('#menu-trigger').tap();await expect(p.locator('#menu-dialog')).to_be_visible()
        await p.locator('#menu-dialog [data-picker=mood]').tap();await expect(p.locator('#picker-dialog')).to_be_visible()
        await p.wait_for_timeout(280)
        ok(await p.locator('#picker-dialog').evaluate("e=>Math.abs(e.getBoundingClientRect().height-innerHeight)<2"),'mobile mood choices occupy a full screen')
        await p.screenshot(path=OUT/'state-mobile.jpg',type='jpeg',quality=83)
        await p.locator('#picker-dialog [data-mood=light]').tap()
        await expect(p.locator('.product-row')).to_have_count(5)
        ok(await p.locator('#picker-dialog').is_hidden() and 'mood=light' in p.url,'mobile state sheet opens from Menu and applies on tap')
        await p.locator('#chips [data-reset]').tap()
        await p.locator('#rows').evaluate("e=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-190,behavior:'instant'})")
        await p.wait_for_timeout(200)
        before=await p.locator('#preview-no').inner_text()
        await swipe(p,(200,655),(200,360));await p.wait_for_timeout(700)
        after=await p.locator('#preview-no').inner_text()
        ok(before!=after and await p.locator('#mobile-preview').evaluate("e=>Math.abs(e.getBoundingClientRect().top-document.querySelector('header').getBoundingClientRect().bottom)<2"),'swiping the rows updates the pinned photo')
        await p.locator('[data-side="1"]').tap()
        await expect(p.locator('#preview-images img')).to_have_attribute('src',re.compile('-back.webp$'))
        ok(True,'touch can reveal the pinned item back')
        await p.wait_for_timeout(320)
        await p.screenshot(path=OUT/'index-mobile.jpg',type='jpeg',quality=86)
        await p.locator('#preview-link').tap();await expect(p.locator('#shop-dialog')).to_be_visible()
        rect=await p.locator('.detail-photo').bounding_box();y=rect['y']+rect['height']/2
        await swipe(p,(width*.72,y),(width*.25,y))
        await expect(p.locator('[data-frame="1"]')).to_have_attribute('aria-pressed','true')
        await p.locator('#shop-dialog [data-dismiss]').tap()
        ok(True,'one tap opens details and a horizontal swipe changes the photograph')
        await p.locator('#menu-trigger').tap();await p.locator('#menu-dialog a[href="#series"]').tap()
        await expect(p.locator('#menu-dialog')).not_to_be_visible()
        ok(p.url.endswith('#series'),'mobile text menu navigates to series')
        await p.goto(URL+'?intro=1',wait_until='domcontentloaded')
        ok(await p.locator('html').evaluate("e=>e.classList.contains('first-visit')") and 'intro=' not in p.url,'review link replays the arrival in the same session')
    await ctx.close()

async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=str(CHROME),headless=True,args=['--disable-gpu','--no-first-run'])
        try:
            await desk(browser)
            for width in [360,390,430]:await mobile(browser,width)
            ctx=await browser.new_context(reduced_motion='reduce')
            p=await ctx.new_page();await prepare(p)
            ok(not await p.locator('html').evaluate("e=>e.classList.contains('first-visit')"),'reduced motion skips the intro')
            await p.locator('.product-row').first.focus()
            await p.keyboard.press('Tab')
            ok(await p.locator('.tile.is-active').count()==1,'keyboard focus links row and photograph')
            ok(not errors,'no browser or HTTP errors')
            (OUT/'checks.json').write_text(json.dumps(passed,ensure_ascii=False,indent=2),'utf8')
            print('PASS',len(passed),'browser checks',flush=True)
        finally:await browser.close()
if __name__=='__main__':asyncio.run(main())
