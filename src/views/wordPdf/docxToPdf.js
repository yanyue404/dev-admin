import JSZip from 'jszip'

const {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  setTextRenderingMode,
  TextRenderingMode,
  setLineWidth,
  setStrokingRgbColor
} = require('pdf-lib')
const fontkitModule = require('@pdf-lib/fontkit')
const fontkit = fontkitModule.default || fontkitModule

const FONT_FALLBACKS = {
  '宋体': ['宋体', 'SimSun', '华文宋体', 'STSong', '黑体', 'SimHei'],
  SimSun: ['宋体', 'SimSun', '华文宋体', 'STSong', '黑体', 'SimHei'],
  NSimSun: ['新宋体', 'NSimSun', '华文宋体', 'STSong', '黑体', 'SimHei'],
  '黑体': ['黑体', 'SimHei', '方正黑体简体'],
  SimHei: ['黑体', 'SimHei', '方正黑体简体'],
  '微软雅黑': ['黑体', 'SimHei', '方正黑体简体', '微软雅黑', 'Microsoft YaHei'],
  'Microsoft YaHei': ['黑体', 'SimHei', '方正黑体简体', '微软雅黑', 'Microsoft YaHei'],
  'sans-serif': ['黑体', 'SimHei', '方正黑体简体', '华文宋体', 'STSong'],
  Calibri: ['Calibri', 'Arial', 'Times New Roman'],
  'Times New Roman': ['Times New Roman', 'Calibri', 'Arial'],
  Arial: ['Arial', 'Calibri', 'Times New Roman']
}

let cachedFaces = null

function child(element, name) {
  if (!element || !element.childNodes) return null
  const nodes = element.childNodes
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].localName === name) return nodes[i]
  }
  return null
}

function attr(element, name) {
  if (!element || !element.getAttribute) return ''
  return element.getAttribute('w:' + name) || element.getAttribute(name) || ''
}

function twip(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback
  const number = Number(value)
  if (Number.isNaN(number)) return fallback
  return number / 20
}

function flag(element, name) {
  const node = child(element, name)
  if (!node) return null
  const value = attr(node, 'val')
  if (value === '0' || value === 'false' || value === 'off') return false
  return true
}

function readRPr(element) {
  const props = {}
  if (!element) return props
  const fonts = child(element, 'rFonts')
  if (fonts) {
    const ascii = attr(fonts, 'ascii') || attr(fonts, 'hAnsi')
    const eastAsia = attr(fonts, 'eastAsia')
    const asciiTheme = attr(fonts, 'asciiTheme') || attr(fonts, 'hAnsiTheme')
    const eastAsiaTheme = attr(fonts, 'eastAsiaTheme')
    if (ascii) props.ascii = ascii
    if (eastAsia) props.eastAsia = eastAsia
    if (asciiTheme) props.asciiTheme = asciiTheme
    if (eastAsiaTheme) props.eastAsiaTheme = eastAsiaTheme
  }
  const bold = flag(element, 'b')
  if (bold !== null) props.bold = bold
  const italic = flag(element, 'i')
  if (italic !== null) props.italic = italic
  const color = child(element, 'color')
  if (color && attr(color, 'val') && attr(color, 'val') !== 'auto') props.color = attr(color, 'val')
  const size = child(element, 'sz')
  if (size && attr(size, 'val')) props.size = Number(attr(size, 'val')) / 2
  const underline = child(element, 'u')
  if (underline) props.underline = attr(underline, 'val') !== 'none' && attr(underline, 'val') !== '0'
  return props
}

function readPPr(element) {
  const props = { rPr: {}}
  if (!element) return props
  const spacing = child(element, 'spacing')
  if (spacing) {
    if (attr(spacing, 'before') !== '') props.before = twip(attr(spacing, 'before'), 0)
    if (attr(spacing, 'after') !== '') props.after = twip(attr(spacing, 'after'), 0)
  }
  const align = child(element, 'jc')
  if (align && attr(align, 'val')) props.align = attr(align, 'val')
  const indent = child(element, 'ind')
  if (indent) {
    if (attr(indent, 'left') !== '') props.indentLeft = twip(attr(indent, 'left'), 0)
    if (attr(indent, 'right') !== '') props.indentRight = twip(attr(indent, 'right'), 0)
  }
  props.rPr = readRPr(child(element, 'rPr'))
  return props
}

function mergeRPr(base, extra) {
  return Object.assign({}, base || {}, extra || {})
}

function mergePPr(base, extra) {
  return {
    before: extra.before !== undefined ? extra.before : base.before,
    after: extra.after !== undefined ? extra.after : base.after,
    align: extra.align || base.align,
    indentLeft: extra.indentLeft !== undefined ? extra.indentLeft : base.indentLeft,
    indentRight: extra.indentRight !== undefined ? extra.indentRight : base.indentRight,
    rPr: mergeRPr(base.rPr, extra.rPr)
  }
}

function parseTheme(themeDoc) {
  const theme = {}
  if (!themeDoc) return theme
  const schemes = themeDoc.getElementsByTagName('a:fontScheme')
  if (!schemes.length) return theme
  const scheme = schemes[0]
  ;['majorFont', 'minorFont'].forEach((slot) => {
    const node = child(scheme, slot)
    if (!node) return
    const prefix = slot.indexOf('major') === 0 ? 'major' : 'minor'
    const latin = child(node, 'latin')
    const ea = child(node, 'ea')
    theme[prefix + 'HAnsi'] = latin ? (latin.getAttribute('typeface') || '') : ''
    theme[prefix + 'EastAsia'] = ea ? (ea.getAttribute('typeface') || '') : ''
    if (!theme[prefix + 'EastAsia']) {
      const fonts = node.getElementsByTagName('a:font')
      for (let i = 0; i < fonts.length; i++) {
        if (fonts[i].getAttribute('script') === 'Hans' && fonts[i].getAttribute('typeface')) {
          theme[prefix + 'EastAsia'] = fonts[i].getAttribute('typeface')
        }
      }
    }
  })
  return theme
}

function parseStyles(stylesDoc) {
  const styles = {}
  if (!stylesDoc) return styles
  const nodes = stylesDoc.getElementsByTagName('w:style')
  for (let i = 0; i < nodes.length; i++) {
    const id = attr(nodes[i], 'styleId')
    if (!id) continue
    styles[id] = {
      basedOn: attr(child(nodes[i], 'basedOn'), 'val'),
      pPr: readPPr(child(nodes[i], 'pPr')),
      rPr: readRPr(child(nodes[i], 'rPr'))
    }
  }
  return styles
}

function styleChain(styles, id, key, stack) {
  if (!id || !styles[id] || stack.indexOf(id) >= 0) return key === 'rPr' ? {} : { rPr: {}}
  const nextStack = stack.concat(id)
  const base = styleChain(styles, styles[id].basedOn, key, nextStack)
  if (key === 'rPr') return mergeRPr(base, styles[id].rPr)
  return mergePPr(base, styles[id].pPr)
}

function applyTheme(props, theme) {
  const next = Object.assign({}, props)
  if (!next.ascii && next.asciiTheme) next.ascii = theme[next.asciiTheme] || ''
  if (!next.eastAsia && next.eastAsiaTheme) next.eastAsia = theme[next.eastAsiaTheme] || ''
  if (!next.ascii) next.ascii = 'Calibri'
  if (!next.eastAsia) next.eastAsia = '宋体'
  if (!next.size) next.size = 12
  if (!next.color) next.color = '000000'
  if (next.bold === undefined) next.bold = false
  if (next.italic === undefined) next.italic = false
  if (next.underline === undefined) next.underline = false
  return next
}

function parseRels(relsDoc) {
  const rels = {}
  if (!relsDoc) return rels
  const nodes = relsDoc.getElementsByTagName('Relationship')
  for (let i = 0; i < nodes.length; i++) {
    rels[nodes[i].getAttribute('Id')] = nodes[i].getAttribute('Target') || ''
  }
  return rels
}

function mediaPath(target) {
  const clean = String(target || '').replace(/^\/+/, '')
  if (clean.indexOf('word/') === 0) return clean
  return 'word/' + clean
}

function readImage(node, rels) {
  const blips = node.getElementsByTagName('a:blip')
  if (!blips.length) return null
  const id = blips[0].getAttribute('r:embed') || blips[0].getAttribute('embed')
  const target = rels[id]
  if (!target) return null
  const extent = node.getElementsByTagName('wp:extent')[0]
  const cx = extent ? Number(extent.getAttribute('cx')) : 0
  const cy = extent ? Number(extent.getAttribute('cy')) : 0
  return {
    type: 'image',
    path: mediaPath(target),
    widthPt: cx > 0 ? cx * 72 / 914400 : 120,
    heightPt: cy > 0 ? cy * 72 / 914400 : 120
  }
}

function paragraphTokens(paragraph, style, rels, styles) {
  const tokens = []
  const field = { mode: 'none' }
  const nodes = paragraph.childNodes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.localName === 'hyperlink') {
      const linkNodes = node.childNodes
      for (let j = 0; j < linkNodes.length; j++) {
        if (linkNodes[j].localName === 'r') appendRun(linkNodes[j], style, field, tokens, rels, styles)
      }
    }
    if (node.localName === 'r') appendRun(node, style, field, tokens, rels, styles)
  }
  return tokens
}

function appendRun(run, paragraphStyle, field, tokens, rels, styles) {
  const direct = readRPr(child(run, 'rPr'))
  const styleId = attr(child(child(run, 'rPr'), 'rStyle'), 'val')
  const fromStyle = styleId ? styleChain(styles, styleId, 'rPr', []) : {}
  const runStyle = mergeRPr(mergeRPr(paragraphStyle, fromStyle), direct)
  const nodes = run.childNodes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.localName === 'fldChar') {
      const type = attr(node, 'fldCharType')
      if (type === 'begin') field.mode = 'code'
      if (type === 'separate') field.mode = 'result'
      if (type === 'end') field.mode = 'none'
      continue
    }
    if (field.mode === 'code' || node.localName === 'instrText') continue
    if (node.localName === 'br') {
      tokens.push({ type: 'break' })
      continue
    }
    if (node.localName === 'tab') {
      tokens.push({ type: 'text', text: '    ', style: runStyle })
      continue
    }
    if (node.localName === 't') {
      tokens.push({ type: 'text', text: node.textContent || '', style: runStyle })
      continue
    }
    if (node.localName === 'drawing' || node.localName === 'pict' || node.localName === 'object') {
      const image = readImage(node, rels)
      if (image) tokens.push(image)
    }
  }
}

function parseSection(body) {
  const sect = body.getElementsByTagName('w:sectPr')
  const node = sect.length ? sect[sect.length - 1] : null
  const size = child(node, 'pgSz')
  const margin = child(node, 'pgMar')
  const grid = child(node, 'docGrid')
  return {
    pageWidth: twip(attr(size, 'w'), 595.3),
    pageHeight: twip(attr(size, 'h'), 841.9),
    marginTop: twip(attr(margin, 'top'), 72),
    marginRight: twip(attr(margin, 'right'), 72),
    marginBottom: twip(attr(margin, 'bottom'), 72),
    marginLeft: twip(attr(margin, 'left'), 72),
    linePitch: twip(attr(grid, 'linePitch'), 0)
  }
}

async function parseDocx(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) throw new Error('文件已损坏或无法解析')
  const documentXml = await documentFile.async('string')
  const stylesFile = zip.file('word/styles.xml')
  const themeFile = zip.file('word/theme/theme1.xml')
  const relsFile = zip.file('word/_rels/document.xml.rels')
  const documentDoc = new DOMParser().parseFromString(documentXml, 'application/xml')
  const stylesDoc = stylesFile ? new DOMParser().parseFromString(await stylesFile.async('string'), 'application/xml') : null
  const themeDoc = themeFile ? new DOMParser().parseFromString(await themeFile.async('string'), 'application/xml') : null
  const relsDoc = relsFile ? new DOMParser().parseFromString(await relsFile.async('string'), 'application/xml') : null
  const theme = parseTheme(themeDoc)
  const styles = parseStyles(stylesDoc)
  const rels = parseRels(relsDoc)
  const defaults = applyTheme(readRPr(documentDoc.getElementsByTagName('w:rPrDefault')[0]
    ? child(documentDoc.getElementsByTagName('w:rPrDefault')[0], 'rPr')
    : null), theme)
  const body = documentDoc.getElementsByTagName('w:body')[0]
  if (!body) throw new Error('文件已损坏或无法解析')
  const section = parseSection(body)
  const paragraphs = []
  const images = {}
  const children = body.childNodes
  for (let i = 0; i < children.length; i++) {
    if (children[i].localName !== 'p' && children[i].localName !== 'tbl') continue
    const blocks = children[i].localName === 'tbl'
      ? Array.from(children[i].getElementsByTagName('w:p'))
      : [children[i]]
    for (let b = 0; b < blocks.length; b++) {
      const paragraph = blocks[b]
      const styleId = attr(child(child(paragraph, 'pPr'), 'pStyle'), 'val')
      const styled = mergePPr(styleChain(styles, styleId, 'pPr', []), readPPr(child(paragraph, 'pPr')))
      const runDefaults = applyTheme(mergeRPr(mergeRPr(defaults, styleChain(styles, styleId, 'rPr', [])), styled.rPr), theme)
      const tokens = paragraphTokens(paragraph, runDefaults, rels, styles)
      for (let t = 0; t < tokens.length; t++) {
        if (tokens[t].type === 'text') tokens[t].style = applyTheme(tokens[t].style, theme)
        if (tokens[t].type === 'image' && !images[tokens[t].path]) {
          const file = zip.file(tokens[t].path)
          if (file) images[tokens[t].path] = await file.async('uint8array')
        }
      }
      paragraphs.push({
        align: styled.align || 'left',
        before: styled.before || 0,
        after: styled.after || 0,
        indentLeft: styled.indentLeft || 0,
        indentRight: styled.indentRight || 0,
        size: runDefaults.size,
        tokens: tokens
      })
    }
  }
  return { section: section, paragraphs: paragraphs, images: images }
}

function fallbackNames(family) {
  if (FONT_FALLBACKS[family]) return FONT_FALLBACKS[family]
  return [family, '宋体', '华文宋体', 'STSong', '黑体', 'SimHei', 'Calibri']
}

function sameName(face, name) {
  const family = (face.family || '').toLowerCase()
  const full = (face.fullName || '').toLowerCase()
  const wanted = name.toLowerCase()
  return family === wanted || full === wanted
}

function styleRank(face, bold, italic) {
  const style = (face.style || '').toLowerCase()
  if (bold && italic) return style === 'bold italic' ? 5 : 1
  if (bold) return style === 'bold' ? 5 : (style === 'regular' || style === 'normal' ? 2 : 1)
  if (italic) return style === 'italic' ? 5 : (style === 'regular' || style === 'normal' ? 2 : 1)
  return style === 'regular' || style === 'normal' ? 5 : 1
}

function fontTag(bytes) {
  return String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
}

function rememberFaces(faces) {
  cachedFaces = faces
}

async function localFaces() {
  if (cachedFaces) return cachedFaces
  if (typeof window.queryLocalFonts !== 'function') {
    throw new Error('当前浏览器不能读取本机字体，无法生成可复制文字的 PDF')
  }
  let faces = []
  try {
    faces = await window.queryLocalFonts()
  } catch (error) {
    console.warn('[word-pdf] 读取本机字体失败', error && error.name, error && error.message)
    throw new Error('需要允许读取本机字体，PDF 才能按 Word 的字体嵌入')
  }
  console.log('[word-pdf] 本机字体数量', faces.length)
  if (!faces.length) throw new Error('需要允许读取本机字体，PDF 才能按 Word 的字体嵌入')
  rememberFaces(faces)
  return faces
}

async function loadFace(faces, family, bold, italic) {
  const names = fallbackNames(family)
  for (let n = 0; n < names.length; n++) {
    const matches = []
    for (let i = 0; i < faces.length; i++) {
      if (sameName(faces[i], names[n])) matches.push(faces[i])
    }
    matches.sort((a, b) => styleRank(b, bold, italic) - styleRank(a, bold, italic))
    for (let i = 0; i < matches.length; i++) {
      const bytes = new Uint8Array(await (await matches[i].blob()).arrayBuffer())
      if (fontTag(bytes) === 'ttcf') {
        console.warn('[word-pdf] 跳过字体集合', matches[i].fullName || matches[i].family)
        continue
      }
      const style = (matches[i].style || '').toLowerCase()
      const syntheticBold = !!bold && style !== 'bold' && style.indexOf('bold') !== 0
      if (names[n] !== family && n > 0) {
        console.warn('[word-pdf] 字体改用可嵌入版本', family, '→', matches[i].fullName || matches[i].family)
      } else {
        console.log('[word-pdf] 嵌入字体', family, matches[i].fullName || matches[i].family, matches[i].style)
      }
      return { bytes: bytes, syntheticBold: syntheticBold }
    }
  }
  return null
}

function isCjk(char) {
  const code = char.charCodeAt(0)
  return (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef)
}

function scriptPieces(token) {
  const pieces = []
  let buffer = ''
  let cjk = null
  const chars = Array.from(token.text || '')
  chars.forEach((char) => {
    const next = isCjk(char)
    if (cjk === null) cjk = next
    if (next !== cjk) {
      pieces.push({
        text: buffer,
        family: cjk ? token.style.eastAsia : token.style.ascii,
        size: token.style.size,
        bold: token.style.bold,
        italic: token.style.italic,
        color: token.style.color,
        underline: token.style.underline
      })
      buffer = ''
      cjk = next
    }
    buffer += char
  })
  if (buffer) {
    pieces.push({
      text: buffer,
      family: cjk ? token.style.eastAsia : token.style.ascii,
      size: token.style.size,
      bold: token.style.bold,
      italic: token.style.italic,
      color: token.style.color,
      underline: token.style.underline
    })
  }
  return pieces
}

function fontKey(piece) {
  return piece.family + '|' + (piece.bold ? 'b' : '') + (piece.italic ? 'i' : '')
}

function takeText(text, font, size, room, fullWidth) {
  if (!text) return { text: '', rest: '', forceBreak: false }
  if (font.widthOfTextAtSize(text, size) <= room) return { text: text, rest: '', forceBreak: false }
  const chars = Array.from(text)
  const lead = text.charAt(0) === ' ' ? ' ' : ''
  const word = text.replace(/^ /, '').match(/^[A-Za-z0-9]+/)
  if (word && font.widthOfTextAtSize(lead + word[0], size) > room && font.widthOfTextAtSize(word[0], size) <= fullWidth) {
    return { text: '', rest: text, forceBreak: false }
  }
  let low = 1
  let high = chars.length
  let best = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const slice = chars.slice(0, mid).join('')
    if (font.widthOfTextAtSize(slice, size) <= room) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (!best) return { text: '', rest: text, forceBreak: false }
  let cut = best
  const next = chars[cut] || ''
  const keepPunctuation = cut > 1 && '，。、；：！？）》」』】〕〉'.indexOf(next) >= 0
  if (keepPunctuation) cut -= 1
  if (!keepPunctuation && /[A-Za-z]/.test(next)) {
    const prefix = chars.slice(0, cut).join('')
    const space = prefix.lastIndexOf(' ')
    if (space > 0) cut = Array.from(prefix.slice(0, space)).length
  }
  return {
    text: chars.slice(0, cut).join('').replace(/ $/, ''),
    rest: chars.slice(cut).join(''),
    forceBreak: keepPunctuation
  }
}

function colorToRgb(value) {
  const hex = /^[0-9a-fA-F]{6}$/.test(value || '') ? value : '000000'
  const number = parseInt(hex, 16)
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255]
}

function hexColor(value) {
  const parts = colorToRgb(value)
  return rgb(parts[0], parts[1], parts[2])
}

function rememberLine(lines, parts, width) {
  lines.push({ parts: parts, width: width })
}

async function embedUsedFonts(pdf, model, faces) {
  const pieces = []
  const seen = {}
  model.paragraphs.forEach((paragraph) => {
    paragraph.tokens.forEach((token) => {
      if (token.type !== 'text') return
      scriptPieces(token).forEach((piece) => {
        const key = fontKey(piece)
        if (seen[key]) return
        seen[key] = true
        pieces.push(piece)
      })
    })
  })
  const embedded = {}
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]
    const loaded = await loadFace(faces, piece.family, piece.bold, piece.italic)
    if (!loaded) throw new Error('找不到可嵌入的字体：' + piece.family)
    const font = await pdf.embedFont(loaded.bytes, { subset: true })
    embedded[fontKey(piece)] = { font: font, syntheticBold: loaded.syntheticBold }
  }
  return embedded
}

async function embedUsedImages(pdf, model) {
  const images = {}
  const paths = Object.keys(model.images)
  for (let i = 0; i < paths.length; i++) {
    const bytes = model.images[paths[i]]
    images[paths[i]] = bytes[0] === 137 ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
  }
  return images
}

function layoutParagraph(paragraph, contentWidth, embedded) {
  const lines = []
  let current = []
  let currentWidth = 0
  function flush() {
    rememberLine(lines, current, currentWidth)
    current = []
    currentWidth = 0
  }
  paragraph.tokens.forEach((token) => {
    if (token.type === 'break') {
      flush()
      return
    }
    if (token.type === 'image') {
      if (current.length) flush()
      lines.push({ image: token })
      return
    }
    const pieces = scriptPieces(token)
    for (let s = 0; s < pieces.length; s++) {
      let rest = pieces[s].text
      const used = embedded[fontKey(pieces[s])]
      while (rest) {
        if (currentWidth === 0) rest = rest.replace(/^ /, '')
        if (!rest) break
        const room = contentWidth - currentWidth
        let taken = takeText(rest, used.font, pieces[s].size, room, contentWidth)
        if (!taken.text) {
          if (currentWidth > 0) {
            flush()
            continue
          }
          const chars = Array.from(rest)
          taken = { text: chars[0], rest: chars.slice(1).join(''), forceBreak: false }
        }
        current.push({
          text: taken.text,
          size: pieces[s].size,
          font: used.font,
          syntheticBold: used.syntheticBold,
          color: pieces[s].color,
          underline: pieces[s].underline,
          width: used.font.widthOfTextAtSize(taken.text, pieces[s].size)
        })
        currentWidth += current[current.length - 1].width
        rest = taken.rest
        if (taken.forceBreak) flush()
      }
    }
  })
  if (current.length || !lines.length) rememberLine(lines, current, currentWidth)
  return lines
}

async function drawDocument(model, faces) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const embedded = await embedUsedFonts(pdf, model, faces)
  const images = await embedUsedImages(pdf, model)
  const section = model.section
  let page = pdf.addPage([section.pageWidth, section.pageHeight])
  let cursorY = section.pageHeight - section.marginTop
  function newPage() {
    page = pdf.addPage([section.pageWidth, section.pageHeight])
    cursorY = section.pageHeight - section.marginTop
  }
  function ensure(height) {
    if (cursorY - height < section.marginBottom) newPage()
  }
  model.paragraphs.forEach((paragraph, index) => {
    const contentWidth = Math.max(
      40,
      section.pageWidth - section.marginLeft - section.marginRight - paragraph.indentLeft - paragraph.indentRight
    )
    if (index > 0 && paragraph.before && cursorY < section.pageHeight - section.marginTop) {
      cursorY -= paragraph.before
    }
    const lines = layoutParagraph(paragraph, contentWidth, embedded)
    lines.forEach((line) => {
      if (line.image) {
        const image = images[line.image.path]
        if (!image) return
        let width = line.image.widthPt
        let height = line.image.heightPt
        if (width > contentWidth) {
          height = height * contentWidth / width
          width = contentWidth
        }
        ensure(height)
        page.drawImage(image, {
          x: section.marginLeft + paragraph.indentLeft,
          y: cursorY - height,
          width: width,
          height: height
        })
        cursorY -= height + 4
        return
      }
      let maxSize = paragraph.size || 12
      line.parts.forEach((part) => {
        if (part.size > maxSize) maxSize = part.size
      })
      const lineHeight = Math.max(maxSize * 1.2, section.linePitch || 0, 8)
      ensure(lineHeight)
      let x = section.marginLeft + paragraph.indentLeft
      if (paragraph.align === 'center') x += Math.max(0, (contentWidth - line.width) / 2)
      if (paragraph.align === 'right') x += Math.max(0, contentWidth - line.width)
      line.parts.forEach((part) => {
        const color = hexColor(part.color)
        const y = cursorY - part.size * 0.88
        if (part.syntheticBold) {
          const parts = colorToRgb(part.color)
          page.pushOperators(
            pushGraphicsState(),
            setTextRenderingMode(TextRenderingMode.FillAndOutline),
            setLineWidth(Math.max(0.15, part.size * 0.02)),
            setStrokingRgbColor(parts[0], parts[1], parts[2])
          )
        }
        page.drawText(part.text, { x: x, y: y, size: part.size, font: part.font, color: color })
        if (part.syntheticBold) page.pushOperators(popGraphicsState())
        if (part.underline) {
          page.drawLine({
            start: { x: x, y: y - 1.2 },
            end: { x: x + part.width, y: y - 1.2 },
            thickness: 0.4,
            color: color
          })
        }
        x += part.width
      })
      cursorY -= lineHeight
    })
    cursorY -= paragraph.after
  })
  console.log('[word-pdf] 版面', {
    pages: pdf.getPageCount(),
    width: section.pageWidth,
    height: section.pageHeight,
    marginLeft: section.marginLeft,
    marginTop: section.marginTop
  })
  return pdf.save()
}

export async function convertDocxToPdf(arrayBuffer) {
  let model
  try {
    model = await parseDocx(arrayBuffer)
  } catch (error) {
    console.warn('[word-pdf] Word 打开失败', error && error.message)
    throw new Error('文件已损坏或无法解析')
  }
  const faces = await localFaces()
  const bytes = await drawDocument(model, faces)
  return new Blob([bytes], { type: 'application/pdf' })
}
