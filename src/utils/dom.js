export function saveTextToClipBoard(text) {
  let copyInput = document.createElement('input')
  copyInput.type = 'text'
  copyInput.value = text
  document.body.appendChild(copyInput)
  copyInput.select()
  document.execCommand('Copy')
  document.body.removeChild(copyInput)
}
