const MAX_FILES = 20
const MAX_BYTES = 20 * 1024 * 1024

function extname(name) {
  const index = String(name).lastIndexOf('.')
  if (index < 0) return ''
  return String(name).slice(index).toLowerCase()
}

function stripExt(name) {
  const index = String(name).lastIndexOf('.')
  if (index <= 0) return String(name)
  return String(name).slice(0, index)
}

function classifyFile(file, direction) {
  const ext = extname(file.name)
  if (file.size > MAX_BYTES) {
    return {
      status: 'failed',
      reason: '单个文件不能超过 20MB',
      locked: true
    }
  }
  if (ext === '.doc' || ext === '.docm' || (ext !== '.docx' && ext !== '.pdf')) {
    return {
      status: 'failed',
      reason: '只支持 .docx 和 .pdf',
      locked: true
    }
  }
  const expected = direction === 'docx-to-pdf' ? '.docx' : '.pdf'
  if (ext !== expected) {
    return {
      status: 'skipped',
      reason: '与当前方向不符',
      locked: false
    }
  }
  return {
    status: 'waiting',
    reason: '',
    locked: false
  }
}

function buildOutputName(fileName, ext, used) {
  const base = stripExt(fileName)
  let candidate = base + '.' + ext
  if (!used[candidate]) {
    used[candidate] = true
    return candidate
  }
  let index = 2
  while (used[base + '（' + index + '）.' + ext]) {
    index += 1
  }
  candidate = base + '（' + index + '）.' + ext
  used[candidate] = true
  return candidate
}

module.exports = {
  MAX_FILES,
  MAX_BYTES,
  classifyFile,
  buildOutputName
}
