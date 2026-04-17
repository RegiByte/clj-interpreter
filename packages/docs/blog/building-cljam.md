---
title: Building a Clojure interpreter from scratch
description: A journey of understanding through building
---

# Building a Clojure interpreter from scratch

*A journey of understanding through building.*

---


## How it Started


I am [RegiByte](https://github.com/regibyte), a senior software engineer with 12 years of experience, mostly in the web domain.

In February 2026, I had a question that had been sitting in my mind for a long while: *how does an interpreter actually work?*

Not just the theory. I knew about environments and closures and lexical scoping from a developer perspective, but I wanted to understand it the way you understand something you've built yourself, from the inside, with bugs.

I didn't know how to build an interpreter, but I knew I wanted to learn, and we're in the age of AI, the barrier to get started is much lower than it used to be.

So I started the project. Did some research with LLMs to understand the architecture of these things. I then learned that there are lots of different ways to build an interpreter/compiler. Since I love Clojure, I decided to build a Clojure interpreter, and thankfully, the "syntax" of Clojure (and lisps in general) is conceptually simple to parse.

The architecture presented itself as a pipeline of stages, starting from the source code itself, a string, we pass it through these different stages:

1. [Tokenizer](https://github.com/RegiByte/cljam/blob/main/packages/cljam/src/core/tokenizer.ts): splits the source code into characters, then groups them into tokens of the language
2. [Reader](https://github.com/RegiByte/cljam/blob/main/packages/cljam/src/core/reader.ts): reads the token stream and builds a tree of values
3. [Evaluator](https://github.com/RegiByte/cljam/blob/main/packages/cljam/src/core/evaluator/evaluate.ts): evaluates expressions (trees of values) generating a result or running side effects
4. [Printer](https://github.com/RegiByte/cljam/blob/main/packages/cljam/src/core/printer.ts): prints values back to a string

This is the core of the interpreter pipeline.

### Why TypeScript?

My experience in the industry was dedicated to web development, mostly JavaScript, Node, React, Vue, and PHP with Laravel. 

Last year, a colleague at work evangelized Clojure to me until I finally agreed to learn it. I fell in love with the language, its ideas and ecosystem.

Because of this familiarity and close contact at work with the JavaScript platform, I decided to build this experimental interpreter with it, I didn't know where this would lead, but I knew I wanted to learn, and I wanted to build something that could be used in parallel with existing JavaScript projects.

So that's what I did. Clojure in TypeScript, from a blank types file. By the end of the first session: a tokenizer, 17 tests, and the lexical layer complete. The next session added a reader, and a simple evaluator that could evaluate the most basic forms like primitive values (a.k.a self evaluating forms), `if` and `do` special forms.

Now, two months later, [**cljam**](https://github.com/RegiByte/cljam) is a modest implementation of a Clojure dialect, a runtime with 3,500+ tests passing, an nREPL server that [Calva](https://calva.io/), [Cider](https://cider.mx/) and [Cursive](https://cursive-ide.com/) can connect to.

This is the story of how it got built, and a few of the bugs that taught me the most.

---

## What is a value?

The first file committed to this project was [`types.ts`](https://github.com/RegiByte/cljam/blob/main/packages/cljam/src/core/types.ts). Nothing else.

Fifty lines answering the most fundamental question in language design: *what can a value be?* In cljam, a value is a plain tagged object, a discriminated union with a `kind` field:

```typescript
// the entire value system, in simplified form
type CljValue =
  | { kind: 'number';  value: number }
  | { kind: 'string';  value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'keyword'; value: string }
  | { kind: 'symbol';  value: string }
  | { kind: 'nil' }
  | { kind: 'list';    value: CljValue[] }
  | { kind: 'vector';  value: CljValue[] }
  | { kind: 'map';     value: [CljValue, CljValue][] }
  // ...
```

No class hierarchy or prototype chain. Just tagged unions that TypeScript can exhaustively check. Every function in the evaluator, the compiler, and the standard library branches on `value.kind`.

Then: the tokenizer. A single-pass scanner that walked source text character by character: `peek`, `advance`, `consumeWhile` fns were all I needed to start. After the first session: 17 tests passing, the lexical layer complete.

Then: the reader. [Recursive descent](https://en.wikipedia.org/wiki/Recursive_descent_parser) over the token stream. Lists, vectors, maps, quote expansion (`'x` → `(quote x)`). Round-trip verified: parse then print gives back the original source. By the end of session one: 82 tests, and a Clojure form could be read from text and written back out.

Nothing had executed yet, but the pipeline had its first two stages.

> **A note on interpreters vs compilers.** I started with an interpreter because they're conceptually straightforward: walk the AST, dispatch on node type, evaluate each node one at a time. The bulk of the logic lives in the list-handling code, figuring out if you're calling a function, expanding a macro, dispatching a multimethod, etc. Later, I added an incremental compiler. It doesn't output JS source; instead, it transforms forms into native JavaScript closures that the VM can optimize aggressively. I did not do an extensive performance benchmark, and I'm pretty sure it can be optimized further, but I'm happy with the results so far. Given this is my first runtime, it's already a miracle that it works!

---

## First-timer bugs

The first real evaluator got 270 tests passing, but not before running into the two bugs that I think are common for new language authors.

**The unevaluated argument.** An evaluator walks an AST. When it reaches a function call `(+ 1 2)`, it needs to evaluate the arguments before passing them to the function. Obvious in retrospect. Easy to forget the first time:

```typescript
// wrong: raw AST nodes go in, nonsense comes out
applyFunction(fn, args)

// right: evaluate first, then apply, args can be complex expressions
applyFunction(fn, args.map(arg => evaluate(arg, env)))
```

The function doesn't throw here, it receives a tree of expressions where it expected a number value. It just produces wrong results, silently.

**The closure environment.** A function in a Lisp captures the environment where it was *defined*, not where it's *called*. When you call the function, you extend the definition-time environment, not the caller's:

```typescript
// wrong: works by coincidence in flat programs, breaks in any real closure
const localEnv = extend(callerEnv, params, args)

// right: always extend the definition-time environment
const localEnv = extend(fn.env, params, args)
```

Both bugs are documented in language design books. You still have to hit them yourself to really understand how and why closures work the way they do.

---

## The macro insight

Six sessions in and I'd reached maybe one of the most powerful features of Clojure/Lisp: metaprogramming, the ability to transform code with code before it's evaluated.

Macros are a way to extend the language with new constructs and semantics from within the language without growing the evaluator. But how does it work?

The perspective that clicked for me was thinking of it like a mini templating system, the goal of macros is to give you the freedom to generate or transform code, the same way functions manipulate their evaluated arguments. Except that macros receive the unevaluated forms.

Conceptually: quasiquote is a tree walk with one rule per node type. Is this an `(unquote x)` form? Evaluate `x` and substitute. Is this `(unquote-splicing xs)`? Evaluate and spread the result into the parent's children (may be a list, a vector, a map, etc.). Otherwise, recurse as data.

One escape hatch per level, that's the whole thing. You get the power of the language to manipulate the language itself.

Once that was in place, `defn` and `when` became user-space macros, no special evaluator support required:

```clojure
(defmacro defn [name params & body]
  `(def ~name (fn ~params ~@body)))


(defmacro when
  "Executes body when condition is true, otherwise returns nil."
  [condition & body]
  `(if ~condition (do ~@body) nil))
```

So when you write something like:

```clojure
(defn my-fn [x y]
  (println "Hello, " x " and " y))

(when (true? x)
  (println "Hello, " x))
```

The macro system will expand it to:

```clojure
(def my-fn (fn [x y]
  (println "Hello, " x " and " y)))

(if (true? x)
  (do (println "Hello, " x))
  nil)
```

The evaluator handles `def`, `if`, `fn` and `do`. The macro system handles everything else built on top of them. This is what people mean when they say Lisp macros are different from metaprogramming in other languages, there is no special syntax for macros, they are just functions that return code as data.

At this point, I had a working interpreter and macro system, so it was time to make it useful. I recreated many of the fundamental Clojure macros like threading macros `->` `->>` `as->` `some->` `cond` `when` etc... It was nice to see how much surface area I could cover with just a few lines of macro code.

Several sessions later, a big part of the stdlib was ported over, tested and working, following the same semantics as jvm-clojure (as much as possible).

---

## Making it real

Writing an interpreter is fun, but languages are much more than just the runtime, to be useful in practice, a language must integrate with editors, provide tooling for bundling, debugging, extension through libraries, and a way to connect to other systems.

This was where I thought the project was "done" for me — I had gotten quite far, but didn't think there was a way to integrate what I'd built with real tooling.

That's when I met [Peter Strömberg](https://github.com/PEZ), creator of [Calva](https://calva.io/) and a well known contributor of the clojure community, I reached out and shared what I've built so far, and asked him if it would be possible to integrate with Calva, given the variety of exotic runtimes that he already supports.

Peter was kind enough to share knowledge with me, he said Calva only speaks bencode, and if I could get an nREPL server speaking bencode, calva could talk to it.

I didn't even know what the heck [Bencode](https://en.wikipedia.org/wiki/Bencode) was, so I looked it up, and it turns out that it is the same protocol behind **BitTorrent**!

And the guy didn't stop there! he kindly shared his own implementation of a bencode encoder and decoder, that I could use to get the nREPL server speaking bencode. And within a few hours, a working nREPL server was built that could be used with Calva. Evaluating expressions directly from within my vscode editor, this was the turning point for me, I knew then that I could make this **real**. Even if it was just me using it.

With the nREPL server working, it was time to figure out other ways to integrate my thing with the existing JS ecosystem, so I created a Vite plugin that wired cljam into a JavaScript project, so that `.clj` files could be imported from JS modules, and JavaScript files could be imported from Clojure files, they could chain freely.

Another cool thing about the browser integration is that I managed to spawn an nREPL from within vite's dev server, and pipe commands back and forth between the browser and the nREPL server through vite's built in websocket server. This allowed me to connect directly with the browser's runtime and evaluate code there, the feedback loop was instant.

The embedding story closed the loop. Now I could talk to the runtime anywhere, on node, bun, browser... wherever JS runs.

I am deeply grateful to Peter for his help and kindness, I could not have gotten this far without his support and guidance.

---

## A few bugs you don't forget

**The missing delimiter.** After adding `@` as a reader macro for `deref`, I forgot to add it to the `isDelimiter` set. The tokenizer was now producing `foo@bar` as a single symbol token. No error. Just a token you'd never intentionally write. One character list entry fixed it. The investigation took a bit longer.

**The uncatchable error.** Early on, probably due to lack of experience with runtime design, I decided runtime type errors shouldn't be catchable, they're programmer mistakes, not domain errors. Then I tested against real Clojure. They're catchable. `(catch Exception e ...)` exists and is commonly used, so I changed the design to match jvm-clojure behavior.

**The 30GB lazy sequence.** Lazy sequences can encapsulate conceptually infinite sequences, values produced one by one, potentially never ending. For this to work, the entire stdlib must be aware of lazy seqs and handle them correctly. One of my first tests after implementing them got stuck in an unbounded realization loop, consuming memory forever. I watched a single Node process climb to 30GB of RAM. These are powerful mechanisms that need to be used wisely, or they'll consume everything. (The fix: proper handling of chunked sequences and ensuring `seq` doesn't realize more than necessary.)

---

## The ecosystem

Once the runtime was real, I started building on top of it. Date handling, a schema library inspired by [malli](https://github.com/metosin/malli), a port of [integrant](https://github.com/weavejester/integrant) for data-driven system composition, and an MCP server that gives LLMs a persistent Clojure REPL they can share with a human developer via nREPL. Same registered multimethods, vars, atoms, same everything.

That last one has been the most surprising. In my sessions, having a persistent REPL changes the interaction quality noticeably: the model stops speculating and starts iterating. And even with the divergences from jvm-clojure, LLMs adapt quickly, especially when using the `handbook` tool which documents the differences.

Today, cljam ships five packages that you can install from npm:

| Package | What it is |
|---|---|
| `@regibyte/cljam` | Embeddable interpreter with incremental compiler, CLI, nREPL server, Vite plugin |
| `@regibyte/cljam-schema` | malli-inspired data validation + JSON Schema generation |
| `@regibyte/cljam-integrant` | Integrant port: data-driven system composition |
| `@regibyte/cljam-date` | Date arithmetic and formatting |
| `@regibyte/cljam-mcp` | MCP server: persistent Clojure REPL for LLM agents |

---

## Performance

I want to be transparent about the performance characteristics of cljam, as a tree-walking interpreter it is inherently slower than raw js for most operations. I did a lot of work to make sure the performance is acceptable for the common use case where I/O dominates, but there are still situations where the interpreted version is significantly slower than raw JS would be.

One concrete example is a naive `(fib 35)` implementation, e.g:
```clojure
(defn fib [n]
    (if (<= n 1)
      n
      (+ (fib (- n 1)) (fib (- n 2)))))
```

Executing `(fib 35)` in cljam takes about 20 seconds. The same function compiled by [Squint](https://squint-cljs.github.io/squint/), which outputs native JS code, runs under 100ms, cljam is roughly 200x slower.

If you take an algorithm like a naive `fib(35)`, the algorithm alone is going to make 29 million recursive calls, pure arithmetic+recursion, no I/O. For cljam, every one of those 29M function calls pays a small overhead: type dispatch, value boxing and argument handling. These costs add up to a big number over many iterations. It is the worst case scenario for this architecture.

There are many workloads that I consider cljam ready for: processing data, scripting, schema validation, system configuration and composition... The picture is different here, and this is where I am focusing for now.

To have a broad idea, based on small isolated benchmarks:
- Filtering and transforming a collection of 1000 items with maps takes ~10ms
- Building a 500-entry map takes ~4ms
- Transforming a nested record of 100 users takes under 1ms

These are the operations that I believe happen most often in real-world software. The question for the reader is, are you running naive (fib 35) in production? If so, I am curious to understand why.

As the author of cljam, I made the conscious decision of focusing on embeddability and keeping the dynamic properties of clojure intact and available during runtime, when you compile straight to js source, you gain performance but lose the ability to introspect the environment, to manipulate code with macros and etc... these are capabilities I wanted to keep. You as a potential user of this library should be aware of this trade-off to decide what is best for you.

The next big architectural milestone for cljam is a bytecode VM. The idea is well described in books like "Crafting Interpreters" by Robert Nystrom, and I am currently reading the book to understand the mechanics deeply before changing the core architecture. I expect this to be a major performance boost for cljam when it happens.


---

## Final Thoughts

Building a language runtime is an incredibly rewarding experience; a journey of discovery, building, breaking, fixing, and improving. It is also a journey of understanding: you have to dig really deep to create a mental model of how these things work, and that is what makes it so rewarding.

Two months of exploration and building led me here, and I am proud of what I've built. 

For the sake of transparency, I'd like to highlight that Claude Code has been an invaluable thinking partner, helping me understand the basic mechanics of everything and expand the stdlib vertically once everything else was in place.

### What's next?

cljam is not done, it's just getting started. The next phase focuses on stability, performance and stdlib feature parity. Bundle size is a priority: I've already done work to create specialized browser-only bundles of `clojure.core` and other namespaces, and I'll continue refining this so people only pay for what they use. That's what makes embedding cljam in existing projects viable without bloating your bundle. Currently cljam (the core lib) ships with 70kb gzipped.

There's also the question of persistent data structures. Clojure's immutable vectors, maps, and sets are powered by sophisticated persistent data structures (HAMT, finger trees, etc.). Implementing these would be an interesting challenge, probably more than I can handle with my current knowledge, but it would take cljam to the absolute next level. Maybe someday. 

That clojure stdlib is no joke, hundreds of incredibly powerful functions and macros, I'm still amazed by how much power can be harnessed with even a subset of it. 

Rich Hickey and the Clojure community are truly amazing, and I am grateful for being lucky enough to learn from them.

Also a huge thanks to everyone in the **#clojurians** slack channel for answering my questions and helping me understand more about PL theory and language design trade-offs, it's been a great learning experience.

---

## Try it!

The fastest path: visit the [browser playground](/playground) to evaluate Clojure code right now, no install needed.

If you want it locally:

```bash
npm install -g @regibyte/cljam
cljam repl
```

To embed in a project:

```typescript
import { createSession, printString } from '@regibyte/cljam'

const session = createSession()
console.log(printString(session.evaluate('(map inc [1 2 3])')))
// => (2 3 4)
```

**If you've read this far, I appreciate you taking the time to read this, I hope you enjoyed the reading, maybe you'll try it out, if you have any questions or would like to connect, feel free to reach out to me on [twitter](https://x.com/regibyte) or [github](https://github.com/regibyte).**


Questions, issues, and contributions welcome at [github.com/RegiByte/cljam](https://github.com/RegiByte/cljam).

