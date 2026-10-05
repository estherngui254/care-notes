import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:5173/'
const UNSTICK = '.topbar { position: static !important; }'

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })

async function shopPage({ width, height }) {
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.addStyleTag({ content: UNSTICK })
  await page.evaluate(() => document.fonts.ready)
  return page
}

async function openAll(page) {
  await page.evaluate(() => {
    for (const summary of document.querySelectorAll('.shop-group:not([open]) > summary')) summary.click()
  })
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)))
}

async function shoot(page, name) {
  await page.evaluate(() => document.querySelector('#shop').scrollIntoView())
  const el = await page.$('#shop')
  await el.screenshot({ path: `shots/${name}` })
  console.log('saved', name)
}

// 1. Light desktop: all three category dropdowns expanded
let page = await shopPage({ width: 1440, height: 1000 })
await openAll(page)
await shoot(page, 'shop-light-desktop.png')

// 2. Dark desktop
await page.click('.theme-toggle')
await shoot(page, 'shop-dark-desktop.png')

// 3. Filtered by category (the matching group auto-opens)
await page.click('.theme-toggle')
await page.select('#shop-category', 'pot')
await shoot(page, 'shop-filtered.png')

// 4. Basket with items and the M-PESA till line
await page.click('.control-clear')
await openAll(page)
await page.click('button[aria-label="Add Monstera to basket"]')
await page.click('button[aria-label="Add Peace Lily to basket"]')
await page.click('button[aria-label="Add Terracotta pot to basket"]')
await shoot(page, 'shop-basket.png')
await page.close()

// 5. Phone width: rows stack into blocks
page = await shopPage({ width: 390, height: 844 })
await openAll(page)
await shoot(page, 'shop-mobile-light.png')
await page.close()

await browser.close()
console.log('done')
