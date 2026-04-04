export const specialFormKeywords = {
  // Core forms
  def: 'def',
  do: 'do',
  'fn*': 'fn*',
  if: 'if',
  'let*': 'let*',
  'loop*': 'loop*',
  recur: 'recur',
  quote: 'quote',
  try: 'try',
  var: 'var',
  // Namespace form
  ns: 'ns',
  // Macro forms
  defmacro: 'defmacro',
  // Binding forms
  binding: 'binding',
  'set!': 'set!',
  'letfn*': 'letfn*',
  // Lazy forms
  'lazy-seq': 'lazy-seq',
  async: 'async',
  // JS INTEROP
  '.': '.',
  'js/new': 'js/new',
} as const

export const valueKeywords = {
  // Core values
  boolean: 'boolean',
  function: 'function',
  nativeFunction: 'native-function',
  keyword: 'keyword',
  list: 'list',
  macro: 'macro',
  map: 'map',
  nil: 'nil',
  number: 'number',
  regex: 'regex',
  set: 'set',
  string: 'string',
  symbol: 'symbol',
  vector: 'vector',
  // Stateful values
  atom: 'atom',
  delay: 'delay',
  multiMethod: 'multi-method',
  volatile: 'volatile',
  var: 'var',
  // Exotic values
  cons: 'cons',
  lazySeq: 'lazy-seq',
  reduced: 'reduced',
  // Async value
  pending: 'pending',
  // Namespace representation
  namespace: 'namespace',
  // Boxed JS values, Interop containers
  jsValue: 'js-value',
} as const
/** Tokens */
export const tokenKeywords = {
  LParen: 'LParen',
  RParen: 'RParen',
  LBracket: 'LBracket',
  RBracket: 'RBracket',
  LBrace: 'LBrace',
  RBrace: 'RBrace',
  String: 'String',
  Number: 'Number',
  Keyword: 'Keyword',
  Quote: 'Quote',
  Quasiquote: 'Quasiquote',
  Unquote: 'Unquote',
  UnquoteSplicing: 'UnquoteSplicing',
  Comment: 'Comment',
  Whitespace: 'Whitespace',
  Symbol: 'Symbol',
  AnonFnStart: 'AnonFnStart',
  Deref: 'Deref',
  Regex: 'Regex',
  VarQuote: 'VarQuote',
  Meta: 'Meta',
  SetStart: 'SetStart',
} as const
export const tokenSymbols = {
  Quote: 'quote',
  Quasiquote: 'quasiquote',
  Unquote: 'unquote',
  UnquoteSplicing: 'unquote-splicing',
  LParen: '(',
  RParen: ')',
  LBracket: '[',
  RBracket: ']',
  LBrace: '{',
  RBrace: '}',
} as const
export type TokenSymbols = (typeof tokenSymbols)[keyof typeof tokenSymbols]
export type TokenKinds = keyof typeof tokenKeywords
