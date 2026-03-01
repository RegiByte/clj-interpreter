export class TokenizerError extends Error {
  context: unknown
  constructor(message: string, context: unknown) {
    super(message)
    this.name = 'TokenizerError'
    this.context = context
  }
}

export class ReaderError extends Error {
  context: unknown
  constructor(message: string, context: unknown) {
    super(message)
    this.name = 'ParserError'
    this.context = context
  }
}

export class EvaluationError extends Error {
  context: unknown
  constructor(message: string, context: unknown) {
    super(message)
    this.name = 'EvaluationError'
    this.context = context
  }
}
