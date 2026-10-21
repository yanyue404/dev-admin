const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { execFileSync } = require('child_process')
const { Document, Packer, Paragraph, TextRun, ImageRun } = require('docx')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const JSZip = require('jszip')
const puppeteer = require('puppeteer-core')
const batch = require('../src/views/wordPdf/batch')

const APP_URL = 'http://127.0.0.1:9527/dev-admin/#/doc-tools/word-pdf'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const failures = []

function check(name, condition, detail) {
  if (condition) {
    console.log('PASS', name)
    return
  }
  const message = detail ? name + ' :: ' + detail : name
  console.error('FAIL', message)
  failures.push(message)
}

function makePng(width, height, paint) {
  const zlib = require('zlib')
  function crc32(buf) {
    let c = ~0
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i]
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
    return ~c >>> 0
  }
  function chunk(type, data) {
    const typeBuf = Buffer.from(type)
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const body = Buffer.concat([typeBuf, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body), 0)
    return Buffer.concat([len, body, crc])
  }
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const color = paint(x, y)
      const index = row + 1 + x * 4
      raw[index] = color[0]
      raw[index + 1] = color[1]
      raw[index + 2] = color[2]
      raw[index + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function assertBatchRules() {
  const docx = batch.classifyFile({ name: 'a.DOCX', size: 10 }, 'docx-to-pdf')
  check('docx 进入等待', docx.status === 'waiting')
  const wrongWay = batch.classifyFile({ name: 'a.pdf', size: 10 }, 'docx-to-pdf')
  check('方向不符则跳过', wrongWay.status === 'skipped' && wrongWay.reason === '与当前方向不符')
  const oldDoc = batch.classifyFile({ name: 'a.doc', size: 10 }, 'docx-to-pdf')
  check('老 doc 失败', oldDoc.status === 'failed' && oldDoc.locked)
  const macro = batch.classifyFile({ name: 'a.docm', size: 10 }, 'pdf-to-docx')
  check('docm 失败', macro.status === 'failed')
  const huge = batch.classifyFile({ name: 'a.pdf', size: batch.MAX_BYTES + 1 }, 'pdf-to-docx')
  check('超限失败', huge.status === 'failed' && huge.reason === '单个文件不能超过 20MB')
  const used = {}
  const first = batch.buildOutputName('note.docx', 'pdf', used)
  const second = batch.buildOutputName('note.docx', 'pdf', used)
  check('重名加序号', first === 'note.pdf' && second === 'note（2）.pdf', first + ' / ' + second)
}

async function createDocx(file, lines, png) {
  const children = lines.map((text) => new Paragraph({ children: [new TextRun(text)] }))
  if (png) {
    children.push(new Paragraph({
      children: [new ImageRun({ data: png, transformation: { width: 120, height: 120 } })]
    }))
  }
  const doc = new Document({ sections: [{ children: children.length ? children : [new Paragraph('')] }] })
  fs.writeFileSync(file, await Packer.toBuffer(doc))
}

async function createTextPdf(file) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  page.drawText('Hello from pdf sample', { x: 72, y: 720, size: 18, font, color: rgb(0, 0, 0) })
  fs.writeFileSync(file, await pdfDoc.save())
}

async function createScannedPdf(file, png) {
  const pdfDoc = await PDFDocument.create()
  const image = await pdfDoc.embedPng(png)
  const page = pdfDoc.addPage([600, 800])
  page.drawImage(image, { x: 80, y: 280, width: 240, height: 240 })
  fs.writeFileSync(file, await pdfDoc.save())
}

function createEncryptedPdf(file) {
  const code = [
    'from pypdf import PdfWriter',
    'import os',
    'writer = PdfWriter()',
    'writer.add_blank_page(width=612, height=792)',
    'writer.encrypt("secret")',
    'handle = open(os.environ["PDF_OUT"], "wb")',
    'writer.write(handle)',
    'handle.close()'
  ].join('\n')
  execFileSync('python', ['-c', code], {
    env: Object.assign({}, process.env, { PDF_OUT: file }),
    stdio: 'inherit'
  })
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      const request = http.get('http://127.0.0.1:9527/dev-admin/', (response) => {
        response.resume()
        resolve()
      })
      request.on('error', () => {
        if (Date.now() - started > 90000) reject(new Error('开发服务器没有在 9527 端口起来'))
        else setTimeout(tick, 1000)
      })
    }
    tick()
  })
}

async function imageInk(browser, buffer, mime) {
  const page = await browser.newPage()
  await page.setContent('<!DOCTYPE html><title>ink</title>')
  const result = await page.evaluate(async(b64, type) => {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = 'data:' + type + ';base64,' + b64
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const context = canvas.getContext('2d')
    context.drawImage(img, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let dark = 0
    let red = 0
    for (let i = 0; i < pixels.length; i += 16) {
      if (pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245) dark += 1
      if (pixels[i] > 180 && pixels[i + 1] < 100 && pixels[i + 2] < 100) red += 1
    }
    return { dark: dark, red: red, width: img.width, height: img.height }
  }, buffer.toString('base64'), mime)
  await page.close()
  return result
}

function inspectPdf(buffer) {
  const file = path.join(os.tmpdir(), 'word-pdf-inspect-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.pdf')
  const outFile = file + '.json'
  fs.writeFileSync(file, buffer)
  const code = [
    'import json, os',
    'from pypdf import PdfReader',
    'reader = PdfReader(os.environ["PDF_IN"])',
    'pages = []',
    'for page in reader.pages:',
    '    box = page.mediabox',
    '    positions = []',
    '    def visitor(text, cm, tm, font_dict, font_size):',
    '        if text and text.strip():',
    '            positions.append({"x": float(tm[4]), "y": float(tm[5])})',
    '    page.extract_text(visitor_text=visitor)',
    '    pages.append({"w": float(box.width), "h": float(box.height), "text": page.extract_text() or "", "pos": positions, "images": len(page.images)})',
    'handle = open(os.environ["PDF_JSON"], "w", encoding="utf-8")',
    'handle.write(json.dumps({"pages": pages}, ensure_ascii=True))',
    'handle.close()'
  ].join('\n')
  try {
    execFileSync('python', ['-c', code], {
      env: Object.assign({}, process.env, { PDF_IN: file, PDF_JSON: outFile }),
      stdio: 'inherit'
    })
    return JSON.parse(fs.readFileSync(outFile, 'utf8'))
  } finally {
    fs.unlinkSync(file)
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile)
  }
}

async function openTool(page) {
  await page.goto('about:blank')
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.word-pdf-page', { timeout: 60000 })
}

function clearDownloads(dir) {
  fs.readdirSync(dir).forEach((name) => {
    fs.unlinkSync(path.join(dir, name))
  })
}

async function waitDownloads(dir) {
  const started = Date.now()
  while (Date.now() - started < 8000) {
    const names = fs.readdirSync(dir).filter((name) => name.indexOf('.crdownload') < 0)
    if (names.length) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return fs.readdirSync(dir).filter((name) => name.indexOf('.crdownload') < 0)
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return []
}

async function upload(page, files) {
  const before = await page.evaluate(() => {
    const main = document.querySelector('.app-main').__vue__
    const children = (main && main.$children) || []
    let vm = null
    for (let i = 0; i < children.length; i++) {
      if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
    }
    return vm.files.length
  })
  const input = await page.$('input.file-input')
  await input.uploadFile.apply(input, files)
  const room = Math.max(0, 20 - before)
  const expected = before + Math.min(files.length, room)
  await page.waitForFunction((count) => {
    const main = document.querySelector('.app-main').__vue__
    const children = (main && main.$children) || []
    let vm = null
    for (let i = 0; i < children.length; i++) {
      if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
    }
    return vm.files.length >= count
  }, { timeout: 30000 }, expected)
}

async function runConvert(page) {
  await page.evaluate(() => {
    const main = document.querySelector('.app-main').__vue__
    const children = (main && main.$children) || []
    let vm = null
    for (let i = 0; i < children.length; i++) {
      if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
    }
    return vm.start()
  })
}

async function snapshot(page) {
  return page.evaluate(async() => {
    const main = document.querySelector('.app-main').__vue__
    const children = (main && main.$children) || []
    let vm = null
    for (let i = 0; i < children.length; i++) {
      if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
    }
    const items = []
    for (let i = 0; i < vm.files.length; i++) {
      const item = vm.files[i]
      let base64 = ''
      if (item.blob) {
        const bytes = new Uint8Array(await item.blob.arrayBuffer())
        let binary = ''
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000))
        }
        base64 = btoa(binary)
      }
      items.push({
        name: item.name,
        status: item.status,
        reason: item.reason,
        outputName: item.outputName,
        base64: base64
      })
    }
    return items
  })
}

function byName(items, name) {
  return items.filter((item) => item.name === name)[0]
}

async function readDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file('word/document.xml').async('string')
  const media = Object.keys(zip.files).filter((name) => name.indexOf('word/media/') === 0 && !zip.files[name].dir)
  const text = xml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')
  return { text, media, xml }
}

async function main() {
  assertBatchRules()
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'word-pdf-'))
  const png = makePng(120, 120, (x, y) => {
    if (x > 20 && x < 100 && y > 20 && y < 100) return [220, 30, 30]
    return [255, 255, 255]
  })
  const zhDocx = path.join(root, 'notice.docx')
  const emptyDocx = path.join(root, 'empty.docx')
  const noteA = path.join(root, 'a', 'note.docx')
  const noteB = path.join(root, 'b', 'note.docx')
  const textPdf = path.join(root, 'hello.pdf')
  const scannedPdf = path.join(root, 'scan.pdf')
  const secretPdf = path.join(root, 'secret.pdf')
  const brokenPdf = path.join(root, 'broken.pdf')
  const brokenDocx = path.join(root, 'broken.docx')
  const oldDoc = path.join(root, 'legacy.doc')
  const macroDoc = path.join(root, 'macro.docm')
  const hugeDocx = path.join(root, 'huge.docx')
  const chinesePdf = path.join(root, 'chinese.pdf')
  fs.mkdirSync(path.dirname(noteA), { recursive: true })
  fs.mkdirSync(path.dirname(noteB), { recursive: true })
  await createDocx(zhDocx, ['批量转换测试', 'Batch convert sample.'], png)
  await createDocx(emptyDocx, [''], null)
  await createDocx(noteA, ['第一份同名文档'], null)
  await createDocx(noteB, ['第二份同名文档'], null)
  await createTextPdf(textPdf)
  await createScannedPdf(scannedPdf, png)
  createEncryptedPdf(secretPdf)
  fs.writeFileSync(brokenPdf, Buffer.from('this is not a pdf'))
  fs.writeFileSync(brokenDocx, Buffer.from('this is not a docx'))
  fs.writeFileSync(oldDoc, Buffer.from('doc'))
  fs.writeFileSync(macroDoc, Buffer.from('docm'))
  fs.writeFileSync(hugeDocx, Buffer.alloc(batch.MAX_BYTES + 1))
  const manyDir = path.join(root, 'many')
  fs.mkdirSync(manyDir)
  const many = []
  for (let i = 1; i <= 21; i++) {
    const file = path.join(manyDir, 'file-' + i + '.docx')
    fs.copyFileSync(emptyDocx, file)
    many.push(file)
  }

  console.log('用例目录', root)
  await waitForServer()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--disable-dev-shm-usage', '--font-render-hinting=none']
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(180000)
  await page.setViewport({ width: 1440, height: 900 })
  page.on('pageerror', (error) => console.log('PAGEERROR', error.message))
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' || text.indexOf('[word-pdf]') === 0) {
      console.log('BROWSER', message.type(), text)
    }
  })
  const downloadDir = path.join(root, 'downloads')
  fs.mkdirSync(downloadDir)
  const client = await page.createCDPSession()
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir })
  const browserClient = await browser.target().createCDPSession()
  await browserClient.send('Browser.grantPermissions', {
    origin: 'http://127.0.0.1:9527',
    permissions: ['localFonts']
  })

  const maker = await browser.newPage()
  await maker.setContent('<!DOCTYPE html><body style="font-family:Microsoft YaHei,sans-serif;font-size:28px;">批量转换测试</body>')
  await maker.pdf({ path: chinesePdf, format: 'A4', printBackground: true })
  await maker.close()

  try {
    await openTool(page)
    await upload(page, [zhDocx])
    await runConvert(page)
    let items = await snapshot(page)
    let zh = byName(items, 'notice.docx')
    check('中文 Word 转换完成', zh && zh.status === 'done', JSON.stringify(zh && { status: zh.status, reason: zh.reason }))
    const zhPdf = zh && zh.base64 ? Buffer.from(zh.base64, 'base64') : Buffer.alloc(0)
    check('Word 转 PDF 文件头', zhPdf.slice(0, 5).toString() === '%PDF-')
    if (zhPdf.slice(0, 5).toString() === '%PDF-') {
      const info = inspectPdf(zhPdf)
      const text = info.pages.map((item) => item.text).join('\n')
      const positions = info.pages.reduce((all, item) => all.concat(item.pos), [])
      const minX = positions.reduce((min, item) => Math.min(min, item.x), 9999)
      console.log('中文 PDF', JSON.stringify({
        pages: info.pages.length,
        size: info.pages[0] && [info.pages[0].w, info.pages[0].h],
        images: info.pages.reduce((sum, item) => sum + item.images, 0),
        minX: minX,
        text: text.slice(0, 80)
      }))
      check('PDF 文字可复制', text.indexOf('批量转换测试') >= 0 && text.indexOf('Batch convert sample') >= 0, text)
      check('PDF 保留图片', info.pages.some((item) => item.images > 0))
      check('PDF 为 A4', info.pages[0] && info.pages[0].w > 590 && info.pages[0].w < 610 && info.pages[0].h > 830 && info.pages[0].h < 850)
      check('文字落在页边距内', minX > 60, String(minX))
    }
    const downloaded = await waitDownloads(downloadDir)
    console.log('单文件下载', downloaded.join(','))
    check('单个成功直接下载', downloaded.indexOf('notice.pdf') >= 0, downloaded.join(','))

    const prayerDocx = 'F:\\yanyue404\\dev-admin\\个人与家庭常用祈祷文.docx'
    check('祈祷文原稿存在', fs.existsSync(prayerDocx))
    if (fs.existsSync(prayerDocx)) {
      await openTool(page)
      await upload(page, [prayerDocx])
      await runConvert(page)
      items = await snapshot(page)
      const prayer = byName(items, '个人与家庭常用祈祷文.docx')
      check('祈祷文转换完成', prayer && prayer.status === 'done', JSON.stringify(prayer && { status: prayer.status, reason: prayer.reason }))
      if (prayer && prayer.base64) {
        const prayerPdf = Buffer.from(prayer.base64, 'base64')
        const info = inspectPdf(prayerPdf)
        const text = info.pages.map((item) => item.text).join('\n')
        const positions = info.pages.reduce((all, item) => all.concat(item.pos), [])
        const minX = positions.reduce((min, item) => Math.min(min, item.x), 9999)
        const maxY = positions.reduce((max, item) => Math.max(max, item.y), 0)
        const page0 = info.pages[0] || { w: 0, h: 0 }
        console.log('祈祷文 PDF', JSON.stringify({
          pages: info.pages.length,
          size: [page0.w, page0.h],
          minX: minX,
          maxY: maxY,
          sample: text.slice(0, 120)
        }))
        check('祈祷文标题可复制', text.indexOf('个人与家庭常用祈祷文') >= 0, text.slice(0, 200))
        check('加粗标题复制不重复', text.indexOf('个人与家庭常用祈祷文\n个人与家庭常用祈祷文') < 0, text.slice(0, 80))
        check('祈祷文正文可复制', text.indexOf('主祷文') >= 0, text.slice(0, 400))
        check('祈祷文按 A4 输出', page0.w > 590 && page0.w < 610 && page0.h > 830 && page0.h < 850, page0.w + 'x' + page0.h)
        check('祈祷文左页边距接近 1.25 英寸', minX > 80, String(minX))
        check('祈祷文上页边距留白', maxY < page0.h - 60, String(maxY) + ' / ' + page0.h)
        check('祈祷文超过一页', info.pages.length >= 2, String(info.pages.length))
      }
    }

    await openTool(page)
    clearDownloads(downloadDir)
    await upload(page, [noteA, noteB])
    await runConvert(page)
    items = await snapshot(page)
    const outputs = items.map((item) => item.outputName).sort()
    check('同名文件分别命名', outputs[0] === 'note.pdf' && outputs[1] === 'note（2）.pdf', outputs.join(','))
    const zipName = await waitDownloads(downloadDir)
    console.log('批量下载', zipName.join(','))
    check('多个成功下载 zip', zipName.indexOf('转换结果.zip') >= 0, zipName.join(','))
    if (zipName.indexOf('转换结果.zip') >= 0) {
      const zip = await JSZip.loadAsync(fs.readFileSync(path.join(downloadDir, '转换结果.zip')))
      const names = Object.keys(zip.files).sort()
      check('zip 内文件名', names[0] === 'note.pdf' && names[1] === 'note（2）.pdf', names.join(','))
    }

    await openTool(page)
    await upload(page, [zhDocx, textPdf, oldDoc, macroDoc, brokenDocx])
    await runConvert(page)
    items = await snapshot(page)
    check('混入的 PDF 被跳过', byName(items, 'hello.pdf').status === 'skipped')
    check('doc 标失败', byName(items, 'legacy.doc').status === 'failed' && byName(items, 'legacy.doc').reason === '只支持 .docx 和 .pdf')
    check('docm 标失败', byName(items, 'macro.docm').status === 'failed')
    check('损坏的 docx 标失败', byName(items, 'broken.docx').status === 'failed' && byName(items, 'broken.docx').reason === '文件已损坏或无法解析', byName(items, 'broken.docx').reason)
    check('同批其余文件继续', byName(items, 'notice.docx').status === 'done')

    await openTool(page)
    await page.evaluate(() => {
      const main = document.querySelector('.app-main').__vue__
      const children = (main && main.$children) || []
      let vm = null
      for (let i = 0; i < children.length; i++) {
        if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
      }
      vm.direction = 'pdf-to-docx'
      vm.reclassify()
    })
    await upload(page, [textPdf, scannedPdf, chinesePdf, secretPdf, brokenPdf, zhDocx])
    await runConvert(page)
    items = await snapshot(page)
    check('Word 在 PDF 方向被跳过', byName(items, 'notice.docx').status === 'skipped')
    const hello = byName(items, 'hello.pdf')
    check('文字 PDF 转成 Word', hello.status === 'done', hello.reason)
    if (hello.base64) {
      const doc = await readDocx(Buffer.from(hello.base64, 'base64'))
      console.log('文字 Word', doc.text)
      check('抽出英文句子', doc.text.indexOf('Hello from pdf sample') >= 0, doc.text)
    }
    const chinese = byName(items, 'chinese.pdf')
    check('中文 PDF 转成 Word', chinese.status === 'done', chinese.reason)
    if (chinese.base64) {
      const doc = await readDocx(Buffer.from(chinese.base64, 'base64'))
      console.log('中文 Word', doc.text)
      check('抽出中文', doc.text.indexOf('批量转换测试') >= 0, doc.text)
    }
    const scan = byName(items, 'scan.pdf')
    check('扫描件转成 Word', scan.status === 'done', scan.reason)
    if (scan.base64) {
      const doc = await readDocx(Buffer.from(scan.base64, 'base64'))
      check('扫描件包含图片', doc.media.length > 0, doc.media.join(','))
      if (doc.media.length) {
        const zip = await JSZip.loadAsync(Buffer.from(scan.base64, 'base64'))
        const media = await zip.file(doc.media[0]).async('nodebuffer')
        const ink = await imageInk(browser, media, 'image/png')
        console.log('扫描页像素', JSON.stringify(ink))
        check('扫描页红块还在', ink.red > 5, JSON.stringify(ink))
      }
    }
    const secret = byName(items, 'secret.pdf')
    check('加密 PDF 失败', secret.status === 'failed' && secret.reason === '文件已加密，无法转换', secret.reason)
    const broken = byName(items, 'broken.pdf')
    check('损坏 PDF 失败', broken.status === 'failed' && broken.reason === '文件已损坏或无法解析', broken.reason)

    await openTool(page)
    await upload(page, many)
    const count = await page.evaluate(() => {
      const main = document.querySelector('.app-main').__vue__
      const children = (main && main.$children) || []
      let vm = null
      for (let i = 0; i < children.length; i++) {
        if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
      }
      return vm.files.length
    })
    check('一次最多 20 个', count === 20, String(count))

    await openTool(page)
    await upload(page, [hugeDocx])
    items = await snapshot(page)
    check('超过 20MB 标失败', byName(items, 'huge.docx').status === 'failed')

    await upload(page, [emptyDocx])
    await page.evaluate(() => {
      const main = document.querySelector('.app-main').__vue__
      const children = (main && main.$children) || []
      let vm = null
      for (let i = 0; i < children.length; i++) {
        if (children[i].$options && children[i].$options.name === 'WordPdf') vm = children[i]
      }
      vm.direction = 'pdf-to-docx'
      vm.reclassify()
    })
    const afterSwitch = await snapshot(page)
    check('切换方向后 docx 被跳过', byName(afterSwitch, 'empty.docx').status === 'skipped', JSON.stringify(afterSwitch))
  } catch (error) {
    console.error('FAIL 测试中断', error && error.stack ? error.stack : error)
    failures.push('测试中断')
    try {
      await page.screenshot({ path: path.join(root, 'failure.png'), fullPage: true })
      console.log('失败截图', path.join(root, 'failure.png'))
    } catch (shotError) {
      console.log('截图失败', shotError.message)
    }
  }
  await browser.close()
  if (failures.length) {
    console.error('失败 ' + failures.length + ' 项')
    process.exit(1)
  }
  console.log('全部通过')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
