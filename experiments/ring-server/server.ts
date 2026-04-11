import {
  createSession,
  cljMap,
  cljKeyword,
  cljString,
  cljNil,
  cljSymbol,
  cljList,
  jsToClj,
  cljToJs,
  printString,
} from '@regibyte/cljam'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Session setup ────────────────────────────────────────────────────────────

const session = createSession()
const handlerSource = readFileSync(
  join(import.meta.dir, 'handler.clj'),
  'utf-8'
)
session.loadFile(
  handlerSource,
  'ring-server.handler',
  join(import.meta.dir, 'handler.clj')
)
session.setNs('ring-server.handler')

// ── Request → CljMap ────────────────────────────────────────────────────────

function headersToClj(headers: Headers) {
  const entries: [
    ReturnType<typeof cljKeyword>,
    ReturnType<typeof cljString>,
  ][] = []
  headers.forEach((value, key) => {
    entries.push([cljKeyword(`:${key}`), cljString(value)])
  })
  return cljMap(entries)
}

function queryParamsToClj(params: URLSearchParams) {
  const entries: [
    ReturnType<typeof cljString>,
    ReturnType<typeof cljString>,
  ][] = []
  params.forEach((value, key) => {
    entries.push([cljString(key), cljString(value)])
  })
  return cljMap(entries)
}

async function requestToClj(req: Request) {
  const url = new URL(req.url)
  const bodyText = await req.text()

  // Try to parse JSON body as Clojure data, fall back to raw string
  let body
  const contentType = req.headers.get('content-type') ?? ''
  if (bodyText && contentType.includes('application/json')) {
    try {
      body = jsToClj(JSON.parse(bodyText))
    } catch {
      body = cljString(bodyText)
    }
  } else if (bodyText) {
    body = cljString(bodyText)
  } else {
    body = cljNil()
  }

  return cljMap([
    [cljKeyword(':method'), cljKeyword(`:${req.method.toLowerCase()}`)],
    [cljKeyword(':uri'), cljString(url.pathname)],
    [cljKeyword(':query-string'), cljString(url.search)],
    [cljKeyword(':query-params'), queryParamsToClj(url.searchParams)],
    [cljKeyword(':headers'), headersToClj(req.headers)],
    [cljKeyword(':body'), body],
  ])
}

// ── CljMap → Response ────────────────────────────────────────────────────────

function getMapEntry(map: ReturnType<typeof cljMap>, key: string) {
  const entry = map.entries.find(
    ([k]) => k.kind === 'keyword' && k.name === key
  )
  return entry ? entry[1] : null
}

function cljToResponse(resp: ReturnType<typeof cljMap>): Response {
  const statusVal = getMapEntry(resp, ':status')
  const bodyVal = getMapEntry(resp, ':body')
  const headersVal = getMapEntry(resp, ':headers')

  const status = statusVal?.kind === 'number' ? statusVal.value : 200

  // Build response headers
  const headers = new Headers()
  if (headersVal?.kind === 'map') {
    for (const [k, v] of headersVal.entries) {
      if (k.kind === 'keyword' && v.kind === 'string') {
        headers.set(k.name.slice(1), v.value) // strip leading ':'
      }
    }
  }

  // Serialize body
  let bodyStr: string | null = null
  if (bodyVal?.kind === 'string') {
    bodyStr = bodyVal.value
  } else if (bodyVal?.kind === 'nil' || bodyVal === null) {
    bodyStr = null
  } else {
    // Clojure data → JSON
    headers.set('content-type', 'application/json')
    bodyStr = JSON.stringify(cljToJs(bodyVal))
  }

  return new Response(bodyStr, { status, headers })
}

// ── Server ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000')

Bun.serve({
  port: PORT,
  async fetch(req) {
    const cljReq = await requestToClj(req)
    try {
      const result = session.evaluateForms([
        cljList([cljSymbol('handler'), cljReq]),
      ])
      if (result.kind !== 'map') {
        console.error('handler returned non-map:', printString(result))
        return new Response('handler must return a map', { status: 500 })
      }
      return cljToResponse(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Handler error:', msg)
      return new Response(`Internal Server Error\n\n${msg}`, { status: 500 })
    }
  },
})

console.log(`Ring server running on http://localhost:${PORT}`)
console.log('Routes:')
console.log('  GET  /ping')
console.log('  GET  /items')
console.log('  POST /items        (JSON body)')
console.log('  GET  /items/:id')
console.log('  DELETE /items/:id')
