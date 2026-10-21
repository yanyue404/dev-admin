const pdfjsLib = require('pdfjs-dist/legacy/build/pdf')

const workerBase = process.env.BASE_URL || '/'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerBase.replace(/\/?$/, '/') + 'pdfjs/pdf.worker.min.js'
import { Document, ImageRun, Packer, Paragraph, TextRun } from 'docx'

const FONT = {
  ascii: 'Microsoft YaHei',
  hAnsi: 'Microsoft YaHei',
  eastAsia: 'Microsoft YaHei'
}

function isPasswordError(error) {
  const name = error && error.name
  const message = String((error && error.message) || '')
  return name === 'PasswordException' || /password/i.test(message)
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('页面绘制失败'))
        return
      }
      blob.arrayBuffer().then((buffer) => {
        resolve(new Uint8Array(buffer))
      }, reject)
    }, 'image/png')
  })
}

function readStore(store, name) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('读取图片超时'))
    }, 3000)
    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const fail = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error)
    }
    try {
      const result = store.get(name, finish)
      if (result && typeof result.then === 'function') {
        result.then(finish, fail)
      } else if (result !== undefined && result !== null) {
        finish(result)
      }
    } catch (error) {
      fail(error)
    }
  })
}

function pixelsFromImage(img) {
  const width = img.width
  const height = img.height
  const data = img.data
  const pixels = new Uint8ClampedArray(width * height * 4)
  if (img.kind === 3 || data.length === width * height * 4) {
    pixels.set(data.subarray ? data.subarray(0, pixels.length) : data)
    return pixels
  }
  if (img.kind === 2 || data.length === width * height * 3) {
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      pixels[j] = data[i]
      pixels[j + 1] = data[i + 1]
      pixels[j + 2] = data[i + 2]
      pixels[j + 3] = 255
    }
    return pixels
  }
  if (data.length === width * height) {
    for (let i = 0, j = 0; i < data.length; i += 1, j += 4) {
      pixels[j] = data[i]
      pixels[j + 1] = data[i]
      pixels[j + 2] = data[i]
      pixels[j + 3] = 255
    }
    return pixels
  }
  if (img.kind === 1) {
    for (let i = 0, j = 0; i < width * height; i += 1, j += 4) {
      const byte = data[i >> 3]
      const bit = (byte >> (7 - (i & 7))) & 1
      const value = bit ? 255 : 0
      pixels[j] = value
      pixels[j + 1] = value
      pixels[j + 2] = value
      pixels[j + 3] = 255
    }
    return pixels
  }
  return null
}

async function imageObjectToPng(img) {
  if (!img || !img.width || !img.height || !img.data) return null
  const pixels = pixelsFromImage(img)
  if (!pixels) {
    console.warn('[word-pdf] 跳过无法识别的图片', img.kind, img.data.length)
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  canvas.getContext('2d').putImageData(new ImageData(pixels, img.width, img.height), 0, 0)
  const png = await canvasToPng(canvas)
  const width = Math.min(600, img.width)
  return {
    data: png,
    width,
    height: Math.max(1, Math.round(width * img.height / img.width))
  }
}

async function extractImages(page) {
  const ops = await page.getOperatorList()
  const paintOps = {}
  paintOps[pdfjsLib.OPS.paintImageXObject] = true
  paintOps[pdfjsLib.OPS.paintJpegXObject] = true
  if (pdfjsLib.OPS.paintImageXObjectRepeat) {
    paintOps[pdfjsLib.OPS.paintImageXObjectRepeat] = true
  }
  const images = []
  const seen = {}
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (!paintOps[ops.fnArray[i]]) continue
    const arg = ops.argsArray[i] && ops.argsArray[i][0]
    const name = typeof arg === 'string' ? arg : ''
    if (!name || seen[name]) continue
    seen[name] = true
    let img = null
    try {
      img = await readStore(page.objs, name)
    } catch (error) {
      try {
        img = await readStore(page.commonObjs, name)
      } catch (fallbackError) {
        console.warn('[word-pdf] 跳过无法读取的图片', name, fallbackError || error)
        continue
      }
    }
    const png = await imageObjectToPng(img)
    if (png) images.push(png)
  }
  return images
}

async function renderPageImage(page) {
  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d', { alpha: false })
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: context, viewport }).promise
  const png = await canvasToPng(canvas)
  return {
    data: png,
    width: 600,
    height: Math.max(1, Math.round(600 * canvas.height / canvas.width))
  }
}

function buildParagraphs(lines) {
  const paragraphs = []
  let buffer = ''
  let last = null
  lines.forEach((line) => {
    const text = line.text.trim()
    if (!text) return
    const bigGap = last && (last.y - line.y) > Math.max(last.height, 8) * 1.8
    if (bigGap && buffer) {
      paragraphs.push(buffer)
      buffer = ''
    }
    if (!buffer) {
      buffer = text
    } else if (/[A-Za-z0-9]$/.test(buffer) && /^[A-Za-z0-9]/.test(text)) {
      buffer += ' ' + text
    } else {
      buffer += text
    }
    last = line
  })
  if (buffer) paragraphs.push(buffer)
  return paragraphs
}

async function readParagraphs(page) {
  const content = await page.getTextContent()
  const rows = []
  content.items.forEach((item) => {
    if (!item.str || !String(item.str).trim()) return
    const x = item.transform[4]
    const y = item.transform[5]
    const height = item.height || Math.abs(item.transform[3]) || 12
    let row = null
    for (let i = 0; i < rows.length; i++) {
      if (Math.abs(rows[i].y - y) <= Math.max(2, height * 0.35)) {
        row = rows[i]
        break
      }
    }
    if (!row) {
      row = { y, height, parts: [] }
      rows.push(row)
    }
    row.parts.push({
      x,
      str: item.str,
      width: item.width || 0
    })
  })
  rows.sort((a, b) => b.y - a.y)
  const lines = rows.map((row) => {
    row.parts.sort((a, b) => a.x - b.x)
    let text = ''
    let end = null
    row.parts.forEach((part) => {
      if (end !== null && part.x - end > 1.5 && text.slice(-1) !== ' ' && part.str.charAt(0) !== ' ') {
        text += ' '
      }
      text += part.str
      end = part.x + part.width
    })
    return { y: row.y, height: row.height, text: text.trim() }
  }).filter((line) => line.text)
  return buildParagraphs(lines)
}

function imageParagraph(image) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [
      new ImageRun({
        data: image.data,
        transformation: {
          width: image.width,
          height: image.height
        }
      })
    ]
  })
}

function textParagraph(text) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [
      new TextRun({
        text,
        size: 24,
        font: FONT
      })
    ]
  })
}

export async function convertPdfToDocx(arrayBuffer) {
  const data = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer)
  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise
  } catch (error) {
    console.warn('[word-pdf] PDF 打开失败', error && error.name, error && error.message)
    if (isPasswordError(error)) throw new Error('文件已加密，无法转换')
    throw new Error('文件已损坏或无法解析')
  }
  if (!pdf.numPages) throw new Error('文件已损坏或无法解析')
  const children = []
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo)
    const paragraphs = await readParagraphs(page)
    if (paragraphs.length) {
      paragraphs.forEach((text) => {
        children.push(textParagraph(text))
      })
      const images = await extractImages(page)
      images.forEach((image) => {
        children.push(imageParagraph(image))
      })
    } else {
      console.log('[word-pdf] 第 ' + pageNo + ' 页没有文字层，改为整页图片')
      children.push(imageParagraph(await renderPageImage(page)))
    }
  }
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children
    }]
  })
  return Packer.toBlob(doc)
}
