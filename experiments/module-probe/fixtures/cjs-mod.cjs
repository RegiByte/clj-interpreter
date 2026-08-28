// CommonJS fixture — the classic sync module.
function greet(name) {
  return `hello ${name} (cjs)`
}
module.exports = { greet, kind: 'cjs', answer: 42 }
