---
outline: [2, 3]
---

# Namespace: `clojure.core`

---
The core Clojure standard library. Provides the fundamental building blocks
  of the language: collection operations, sequence processing, arithmetic,
  destructuring, macros, protocols, multimethods, atoms, and more.

  This namespace is automatically loaded in every cljam session.

## Functions

### Abstractions

#### `ancestors`

```clojure
(ancestors tag)
(ancestors h tag)
```

Returns the set of all ancestors of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no ancestors.

---

#### `derive`

```clojure
(derive child parent)
(derive h child parent)
```

Establishes a parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects.

---

#### `descendants`

```clojure
(descendants tag)
(descendants h tag)
```

Returns the set of all descendants of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no descendants.

---

#### `extenders`

```clojure
(extenders protocol)
```

Returns a vector of type-tag strings that have extended the protocol.

---

#### `isa?`

```clojure
(isa? child parent)
(isa? h child parent)
```

Returns true if child is either identical to parent, or child derives from
  parent in the given hierarchy (default: *hierarchy*).

---

#### `make-hierarchy`

```clojure
(make-hierarchy)
```

Returns a new, empty hierarchy.

---

#### `parents`

```clojure
(parents tag)
(parents h tag)
```

Returns the immediate parents of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no parents.

---

#### `protocols`

```clojure
(protocols type-kw-or-value)
```

Returns a vector of all protocols that a type implements. Accepts a keyword type tag (:string, :user/Circle) or any value.

---

#### `satisfies?`

```clojure
(satisfies? protocol value)
```

Returns true if value implements the protocol.

---

#### `underive`

```clojure
(underive child parent)
(underive h child parent)
```

Removes the parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects.

---

### Arithmetic

#### `*`

```clojure
(* & nums)
```

Returns the product of the arguments. Throws on non-number arguments.

---

#### `+`

```clojure
(+ & nums)
```

Returns the sum of the arguments. Throws on non-number arguments.

---

#### `-`

```clojure
(- & nums)
```

Returns the difference of the arguments. Throws on non-number arguments.

---

#### `/`

```clojure
(/ & nums)
```

Returns the quotient of the arguments. Throws on non-number arguments or division by zero.

---

#### `NaN?`

```clojure
(NaN? num)
```

Returns true if num is NaN, else false.

---

#### `abs`

```clojure
(abs a)
```

Returns the absolute value of a.

---

#### `bit-and`

```clojure
(bit-and x y)
```

Bitwise and

---

#### `bit-not`

```clojure
(bit-not x)
```

Bitwise complement

---

#### `bit-or`

```clojure
(bit-or x y)
```

Bitwise or

---

#### `bit-shift-left`

```clojure
(bit-shift-left x n)
```

Bitwise shift left

---

#### `bit-shift-right`

```clojure
(bit-shift-right x n)
```

Bitwise shift right

---

#### `bit-xor`

```clojure
(bit-xor x y)
```

Bitwise exclusive or

---

#### `char`

```clojure
(char n)
```

Returns the character at the given Unicode code point.

---

#### `dec`

```clojure
(dec x)
```

Returns the argument decremented by 1. Throws on non-number arguments.

---

#### `even?`

```clojure
(even? n)
```

Returns true if the argument is an even number, false otherwise.

---

#### `inc`

```clojure
(inc x)
```

Returns the argument incremented by 1. Throws on non-number arguments.

---

#### `infinite?`

```clojure
(infinite? num)
```

Returns true if num is positive or negative infinity, else false.

---

#### `int`

```clojure
(int x)
```

Coerces x to int. For characters, returns the Unicode code point.

---

#### `max`

```clojure
(max & nums)
```

Returns the largest of the arguments. Throws on non-number arguments.

---

#### `min`

```clojure
(min & nums)
```

Returns the smallest of the arguments. Throws on non-number arguments.

---

#### `mod`

```clojure
(mod n d)
```

Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.

---

#### `neg?`

```clojure
(neg? n)
```

Returns true if the argument is a negative number, false otherwise.

---

#### `odd?`

```clojure
(odd? n)
```

Returns true if the argument is an odd number, false otherwise.

---

#### `pos?`

```clojure
(pos? n)
```

Returns true if the argument is a positive number, false otherwise.

---

#### `quot`

```clojure
(quot num div)
```

quot[ient] of dividing numerator by denominator.

---

#### `rand`

```clojure
(rand)
(rand n)
```

Returns a random floating point number between 0 (inclusive) and n (default 1) (exclusive).

---

#### `rand-int`

```clojure
(rand-int n)
```

Returns a random integer between 0 (inclusive) and n (exclusive).

---

#### `rand-nth`

```clojure
(rand-nth coll)
```

Return a random element of the (sequential) collection.

---

#### `rem`

```clojure
(rem num div)
```

remainder of dividing numerator by denominator.

---

#### `sqrt`

```clojure
(sqrt n)
```

Returns the square root of n.

---

#### `unsigned-bit-shift-right`

```clojure
(unsigned-bit-shift-right x n)
```

Bitwise shift right, without sign-extension

---

#### `zero?`

```clojure
(zero? n)
```

Returns true if the argument is zero, false otherwise.

---

### Async

#### `all`

```clojure
(all pendings)
```

Returns a pending that resolves with a vector of all results when every input resolves.

---

#### `catch*`

```clojure
(catch* val f)
```

Handles rejection of a pending value by calling f with the thrown value or an error map.

---

#### `make-promise`

```clojure
(make-promise executor)
```

Creates a pending value from an executor fn (fn [resolve reject] ...). Like JS new Promise(executor).

---

#### `pending?`

```clojure
(pending? val)
```

Returns true if val is a pending (async) value.

---

#### `promise-of`

```clojure
(promise-of val)
```

Wraps val in an immediately-resolving pending value. Useful for testing async composition.

---

#### `then`

```clojure
(then val f)
```

Applies f to the resolved value of a pending, or to val directly if not pending.

---

### Comparison

#### `<`

```clojure
(< & nums)
```

Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.

---

#### `<=`

```clojure
(<= & nums)
```

Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.

---

#### `=`

```clojure
(= & vals)
```

Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.

---

#### `>`

```clojure
(> & nums)
```

Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.

---

#### `>=`

```clojure
(>= & nums)
```

Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.

---

#### `compare`

```clojure
(compare x y)
```

Comparator. Returns a negative number, zero, or a positive number.

---

#### `identical?`

```clojure
(identical? x y)
```

Tests if 2 arguments are the same object (reference equality).

---

#### `not`

```clojure
(not x)
```

Returns true if x is logical false, false otherwise.

---

#### `not=`

```clojure
(not= & vals)
```

Returns true if any two adjacent arguments are not equal, false otherwise.

---

### Dev

#### `all-ns`

```clojure
(all-ns)
```

Returns a list of all namespaces loaded in the session.

---

#### `alter-var-root`

```clojure
(alter-var-root v f & args)
```

Atomically alters the root binding of var v by applying f to its current value plus any additional args.

---

#### `describe`

```clojure
(describe x)
(describe x limit)
```

Returns a plain map describing any cljam value.

  Works on protocols, records, functions, namespaces, multimethods,
  vars, and all primitive types. Output is always a plain Clojure map —
  composable with get, get-in, filter, and any other map operation.

  For namespaces, the number of vars shown is capped by *describe-limit*
  (default 50). Bind *describe-limit* to nil for unlimited output.

  Examples:
    (describe (-&gt;Circle 5))        ;; record
    (describe IShape)              ;; protocol
    (describe area)                ;; protocol dispatch fn
    (describe println)             ;; native fn
    (describe (find-ns 'user))     ;; namespace
    (describe #'my-fn)             ;; var

---

#### `eval`

```clojure
(eval form)
```

Evaluates the given form in the global environment and returns the result.

---

#### `find-ns`

```clojure
(find-ns sym)
```

Returns the namespace as a value for the given symbol, or nil if the symbol is not a namespace or not loaded.

---

#### `gensym`

```clojure
(gensym)
(gensym prefix)
```

Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.

---

#### `in-ns`

```clojure
(in-ns sym)
```

Sets the current namespace to the given symbol and returns the namespace as a value.

---

#### `loaded-libs`

```clojure
(loaded-libs)
```

Returns a set of the loaded libraries.

---

#### `macroexpand`

```clojure
(macroexpand form)
```

Expands all macros until the expansion is stable (head is no longer a macro)

Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms

---

#### `macroexpand-1`

```clojure
(macroexpand-1 form)
```

If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.

---

#### `macroexpand-all`

```clojure
(macroexpand-all form)
```

Fully expands all macros in a form recursively — including in sub-forms.

Unlike macroexpand, this descends into every sub-expression.
Expansion stops at quote/quasiquote boundaries and fn/loop bodies.

---

#### `name`

```clojure
(name x)
```

Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.

---

#### `namespace`

```clojure
(namespace x)
```

Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.

---

#### `ns-aliases`

```clojure
(ns-aliases sym)
```

Returns a map of the aliases for the given namespace.

---

#### `ns-interns`

```clojure
(ns-interns sym)
```

Returns a map of the interned vars for the given namespace.

---

#### `ns-map`

```clojure
(ns-map sym)
```

Returns a map of the vars for the given namespace.

---

#### `ns-name`

```clojure
(ns-name x)
```

Returns the namespace name as a symbol for the given value.

---

#### `ns-publics`

```clojure
(ns-publics sym)
```

Returns a map of the public vars for the given namespace.

---

#### `ns-refers`

```clojure
(ns-refers sym)
```

Returns a map of the refers for the given namespace.

---

#### `require`

```clojure
(require args)
```

Parses the require spec and load the namespace(s) specified into the current namespace.

---

#### `resolve`

```clojure
(resolve sym)
```

Resolves the given symbol to a value in the current namespace.

---

#### `special-symbol?`

```clojure
(special-symbol? sym)
```

Returns true if the given symbol is a special symbol reserved by the language.

---

#### `symbol`

```clojure
(symbol name)
(symbol ns name)
```

Returns a Symbol with the given namespace and name.

---

#### `the-ns`

```clojure
(the-ns sym)
```

Returns the namespace as a value for the given symbol, or nil if the symbol is not a namespace or not loaded.

---

#### `type`

```clojure
(type x)
```

Returns a keyword representing the type of a value. Records return :ns/RecordType; built-ins return :string, :number, :nil, etc.

---

#### `var-get`

```clojure
(var-get x)
```

Returns the value in the Var object.

---

### Errors

#### `ex-cause`

```clojure
(ex-cause e)
```

Returns the :cause of an error map, or nil.

---

#### `ex-data`

```clojure
(ex-data e)
```

Returns the :data map of an error map, or nil.

---

#### `ex-info`

```clojure
(ex-info msg data)
(ex-info msg data cause)
```

Creates an error map with :message and :data keys. Optionally accepts a :cause.

---

#### `ex-message`

```clojure
(ex-message e)
```

Returns the :message of an error map, or nil.

---

#### `make-err`

```clojure
(make-err type message)
(make-err type message data)
(make-err type message data cause)
```

Creates an error map with type, message, data and optionally cause

---

#### `throw`

```clojure
(throw value)
```

Throws a value as an exception. The value may be any CljValue; maps are idiomatic.

---

### Higher-order

#### `apply`

```clojure
(apply f args)
(apply f & args)
```

Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.

---

#### `comp`

```clojure
(comp)
(comp f)
(comp f g)
(comp f g & fns)
```

Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and collections.

---

#### `complement`

```clojure
(complement f)
```

Takes a fn f and returns a fn that takes the same arguments as f,
  has the same effects, if any, and returns the opposite truth value.

---

#### `constantly`

```clojure
(constantly x)
```

Returns a function that takes any number of arguments and returns x.

---

#### `identity`

```clojure
(identity x)
```

Returns its single argument unchanged.

---

#### `juxt`

```clojure
(juxt & fns)
```

Takes a set of functions and returns a fn that is the juxtaposition
  of those fns. The returned fn takes a variable number of args and
  returns a vector containing the result of applying each fn to the args.

---

#### `memoize`

```clojure
(memoize f)
```

Returns a memoized version of a referentially transparent function. The
  memoized version of the function keeps a cache of the mapping from arguments
  to results and, when calls with the same arguments are repeated often, has
  higher performance at the expense of higher memory use.

---

#### `partial`

```clojure
(partial f & args)
```

Returns a function that calls f with pre-applied args prepended to any additional arguments.

---

#### `trampoline`

```clojure
(trampoline f)
(trampoline f & args)
```

trampoline can be used to convert algorithms requiring mutual
  recursion without stack consumption. Calls f with supplied args, if
  any. If f returns a fn, calls that fn with no arguments, and
  continues to repeat, until the return value is not a fn, then
  returns that non-fn value.

---

### IO

#### `newline`

```clojure
(newline)
```

Writes a newline to *out*.

---

#### `pprint`

```clojure
(pprint form max-width)
(pprint form)
```

Pretty-prints the arguments to the current output channel.

---

#### `pprint-str`

```clojure
(pprint-str x)
(pprint-str x max-width)
```

Returns the pretty-printed string representation of x, optionally
  limiting line width to max-width (default 80).

---

#### `pr`

```clojure
(pr & args)
```

Prints the arguments to the output stream that *out* is bound to. Returns nil.

---

#### `print`

```clojure
(print & args)
```

Prints the arguments to the current output channel.

---

#### `println`

```clojure
(println & args)
```

Prints the arguments to the current output channel, followed by a newline.

---

#### `prn`

```clojure
(prn & args)
```

Same as pr, but prints a newline after the arguments.

---

#### `warn`

```clojure
(warn & args)
```

Prints the arguments to the current error channel, followed by a newline.

---

### Interop

#### `clj->js`

```clojure
(clj->js val)
```

Converts a Clojure value to a JavaScript value. Should be used sparingly at the boundaries of the program.

---

#### `js->clj`

```clojure
(js->clj val)
```

Converts a JavaScript value to a Clojure value. Should be used sparingly at the boundaries of the program. Unsupported types are boxed as js-value.

---

### Maps

#### `assoc-in`

```clojure
(assoc-in m ks v)
```

Associates a value in a nested associative structure, where ks is a
  sequence of keys and v is the new value. Returns a new nested structure.

---

#### `fnil`

```clojure
(fnil f x)
(fnil f x y)
(fnil f x y z)
```

Takes a function f, and returns a function that calls f, replacing
  a nil first argument with x, optionally nil second with y, nil third with z.

---

#### `frequencies`

```clojure
(frequencies coll)
```

Returns a map from distinct items in coll to the number of times they appear.

---

#### `get-in`

```clojure
(get-in m ks)
(get-in m ks not-found)
```

Returns the value in a nested associative structure, where ks is a
  sequence of keys. Returns nil if the key is not present, or the not-found
  value if supplied.

---

#### `group-by`

```clojure
(group-by f coll)
```

Returns a map of the elements of coll keyed by the result of f on each
  element. The value at each key is a vector of matching elements.

---

#### `hash-map`

```clojure
(hash-map & kvals)
```

Returns a new hash-map containing the given key-value pairs.

---

#### `keys`

```clojure
(keys m)
```

Returns a vector of the keys of the given map or record.

---

#### `merge`

```clojure
(merge & maps)
```

Returns a map that consists of the rest of the maps conj-ed onto
  the first. If a key occurs in more than one map, the mapping from
  the latter (left-to-right) will be the mapping in the result.

---

#### `merge-with`

```clojure
(merge-with f & maps)
```

Returns a map that consists of the rest of the maps conj-ed onto
  the first.  If a key occurs in more than one map, the mapping(s)
  from the latter (left-to-right) will be combined with the mapping in
  the result by calling (f val-in-result val-in-latter).

---

#### `select-keys`

```clojure
(select-keys m keys)
```

Returns a map containing only those entries in map whose key is in keys.

---

#### `update`

```clojure
(update m k f & args)
```

Updates a value in an associative structure where k is a key and f is a
  function that will take the old value and any supplied args and return the
  new value, and returns a new structure.

---

#### `update-in`

```clojure
(update-in m ks f & args)
```

Updates a value in a nested associative structure, where ks is a
  sequence of keys and f is a function that will take the old value and any
  supplied args and return the new value. Returns a new nested structure.

---

#### `update-keys`

```clojure
(update-keys m f)
```

m f =&gt; apply f to each key in m

---

#### `update-vals`

```clojure
(update-vals m f)
```

m f =&gt; apply f to each val in m

---

#### `vals`

```clojure
(vals m)
```

Returns a vector of the values of the given map or record.

---

#### `zipmap`

```clojure
(zipmap ks vs)
```

Returns a new map with the keys and values of the given collections.

---

### Metadata

#### `alter-meta!`

```clojure
(alter-meta! ref f & args)
```

Applies f to ref's current metadata (with optional args), sets the result as the new metadata, and returns it.

---

#### `meta`

```clojure
(meta val)
```

Returns the metadata map of a value, or nil if the value has no metadata.

---

#### `vary-meta`

```clojure
(vary-meta obj f & args)
```

Returns an object of the same type and value as obj, with
  (apply f (meta obj) args) as its metadata.

---

#### `with-meta`

```clojure
(with-meta val m)
```

Returns a new value with the metadata map m applied to val.

---

### Predicates

#### `any?`

```clojure
(any? x)
```

Returns true for any given argument

---

#### `associative?`

```clojure
(associative? coll)
```

Returns true if coll implements Associative (map or vector).

---

#### `boolean?`

```clojure
(boolean? x)
```

Returns true if the value is a boolean, false otherwise.

---

#### `char?`

```clojure
(char? x)
```

Returns true if the value is a character, false otherwise.

---

#### `coll?`

```clojure
(coll? x)
```

Returns true if the value is a collection, false otherwise.

---

#### `contains?`

```clojure
(contains? coll key)
```

Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.

---

#### `counted?`

```clojure
(counted? coll)
```

Returns true if coll implements count in constant time.

---

#### `double?`

```clojure
(double? x)
```

Return true if x is a Double (all numbers in JS are doubles).

---

#### `empty?`

```clojure
(empty? coll)
```

Returns true if coll has no items. Accepts collections, strings, and nil.

---

#### `every?`

```clojure
(every? pred coll)
```

Returns true if all items in coll satisfy pred, false otherwise.

---

#### `false?`

```clojure
(false? arg)
```

Returns true if the value is a boolean and false, false otherwise.

---

#### `falsy?`

```clojure
(falsy? arg)
```

Returns true if the value is nil or false, false otherwise.

---

#### `fn?`

```clojure
(fn? x)
```

Returns true if the value is a function, false otherwise.

---

#### `ident?`

```clojure
(ident? x)
```

Returns true if x is a symbol or keyword.

---

#### `int?`

```clojure
(int? x)
```

Return true if x is a fixed precision integer.

---

#### `keyword?`

```clojure
(keyword? x)
```

Returns true if the value is a keyword, false otherwise.

---

#### `list?`

```clojure
(list? x)
```

Returns true if the value is a list, false otherwise.

---

#### `map?`

```clojure
(map? x)
```

Returns true if the value is a map, false otherwise.

---

#### `multimethod?`

```clojure
(multimethod? x)
```

Returns true if x is a multimethod.

---

#### `namespace?`

```clojure
(namespace? x)
```

Returns true if x is a namespace.

---

#### `nat-int?`

```clojure
(nat-int? x)
```

Return true if x is a non-negative fixed precision integer.

---

#### `neg-int?`

```clojure
(neg-int? x)
```

Return true if x is a negative fixed precision integer.

---

#### `nil?`

```clojure
(nil? arg)
```

Returns true if the value is nil, false otherwise.

---

#### `not-any?`

---

#### `not-every?`

```clojure
(not-every? pred coll)
```

Returns false if (pred x) is logical true for every x in
  coll, else true.

---

#### `number?`

```clojure
(number? x)
```

Returns true if the value is a number, false otherwise.

---

#### `pos-int?`

```clojure
(pos-int? x)
```

Return true if x is a positive fixed precision integer.

---

#### `protocol?`

```clojure
(protocol? x)
```

Returns true if x is a protocol.

---

#### `qualified-ident?`

```clojure
(qualified-ident? x)
```

Returns true if x is a symbol or keyword with a namespace component.

---

#### `qualified-keyword?`

```clojure
(qualified-keyword? x)
```

Returns true if the value is a qualified keyword, false otherwise.

---

#### `qualified-symbol?`

```clojure
(qualified-symbol? x)
```

Returns true if the value is a qualified symbol, false otherwise.

---

#### `record?`

```clojure
(record? x)
```

Returns true if x is a record.

---

#### `reduced?`

```clojure
(reduced? value)
```

Returns true if the given value is a reduced value, false otherwise.

---

#### `regexp?`

```clojure
(regexp? x)
```

Returns true if x is a regular expression pattern.

---

#### `seqable?`

```clojure
(seqable? x)
```

Return true if the seq function is supported for x.

---

#### `sequential?`

```clojure
(sequential? coll)
```

Returns true if coll is a sequential collection (list, vector, lazy-seq, or cons).

---

#### `set?`

```clojure
(set? x)
```

Returns true if x is a set.

---

#### `simple-ident?`

```clojure
(simple-ident? x)
```

Returns true if x is a symbol or keyword with no namespace component.

---

#### `simple-keyword?`

```clojure
(simple-keyword? x)
```

Returns true if x is a keyword with no namespace component.

---

#### `simple-symbol?`

```clojure
(simple-symbol? x)
```

Returns true if x is a symbol with no namespace component.

---

#### `some?`

```clojure
(some? x)
```

Returns true if x is not nil, false otherwise

---

#### `string?`

```clojure
(string? x)
```

Returns true if the value is a string, false otherwise.

---

#### `symbol?`

```clojure
(symbol? x)
```

Returns true if the value is a symbol, false otherwise.

---

#### `true?`

```clojure
(true? arg)
```

Returns true if the value is a boolean and true, false otherwise.

---

#### `truthy?`

```clojure
(truthy? arg)
```

Returns true if the value is not nil or false, false otherwise.

---

#### `var?`

```clojure
(var? x)
```

Returns true if x is a Var.

---

#### `vector?`

```clojure
(vector? x)
```

Returns true if the value is a vector, false otherwise.

---

#### `volatile?`

```clojure
(volatile? value)
```

Returns true if the given value is a volatile value, false otherwise.

---

### Sequences

#### `assoc`

```clojure
(assoc collection & kvals)
```

Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.

---

#### `butlast`

```clojure
(butlast coll)
```

Return a seq of all but the last item in coll, in linear time

---

#### `completing`

```clojure
(completing f)
(completing f cf)
```

Takes a reducing function f of 2 args and returns a fn suitable for
  transduce by adding an arity-1 signature that calls cf (default -
  identity) on the result argument.

---

#### `concat`

```clojure
(concat)
(concat x)
(concat x y)
(concat x y & zs)
```

Returns a lazy seq representing the concatenation of the elements in the
  supplied colls.

---

#### `conj`

```clojure
(conj collection & args)
```

Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.

---

#### `cons`

```clojure
(cons x xs)
```

Returns a new collection with x prepended to the head of xs.

---

#### `count`

```clojure
(count countable)
```

Returns the number of elements in the given countable value.

---

#### `cycle`

```clojure
(cycle coll)
(cycle n coll)
```

Returns a lazy infinite sequence of repetitions of the items in coll.
  With 2 args (n coll), returns a finite sequence (backwards compat).

---

#### `dedupe`

```clojure
(dedupe)
(dedupe coll)
```

Returns a sequence removing consecutive duplicates in coll.
   Returns a transducer when no collection is provided.

---

#### `delay?`

```clojure
(delay? x)
```

Returns true if x is a Delay.

---

#### `disj`

```clojure
(disj s & items)
```

Returns a set with the given items removed.

---

#### `dissoc`

```clojure
(dissoc collection & keys)
```

Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.

---

#### `distinct`

```clojure
(distinct coll)
```

Returns a vector of the elements of coll with duplicates removed,
  preserving first-seen order.

---

#### `doall`

```clojure
(doall coll)
```

Forces realization of a (possibly lazy) sequence. Unlike dorun,
  retains the head and returns the seq.

---

#### `dorun`

```clojure
(dorun coll)
```

Forces realization of a (possibly lazy) sequence. Walks the sequence
  without retaining the head. Returns nil.

---

#### `drop`

```clojure
(drop n)
(drop n coll)
```

Returns a sequence of all but the first n items in coll.
   Returns a stateful transducer when no collection is provided.

---

#### `drop-last`

```clojure
(drop-last coll)
(drop-last n coll)
```

Return a sequence of all but the last n (default 1) items in coll

---

#### `drop-while`

```clojure
(drop-while pred)
(drop-while pred coll)
```

Returns a sequence of the items in coll starting from the
  first item for which (pred item) returns logical false.  Returns a
  stateful transducer when no collection is provided.

---

#### `empty`

```clojure
(empty coll)
```

Returns an empty collection of the same category as coll, or nil.

---

#### `filter`

```clojure
(filter pred)
(filter pred coll)
```

Returns a sequence of the items in coll for which
  (pred item) returns logical true. pred must be free of side-effects.
  Returns a transducer when no collection is provided.

---

#### `filterv`

```clojure
(filterv pred coll)
```

Returns a vector of the items in coll for which
  (pred item) returns logical true.

---

#### `first`

```clojure
(first coll)
```

Returns the first element of the given collection or string.

---

#### `flatten`

```clojure
(flatten x)
```

Takes any nested combination of sequential things (lists/vectors) and
  returns their contents as a single flat vector.

---

#### `flatten-step`

```clojure
(flatten-step v)
```

Internal helper for flatten.

---

#### `fnext`

```clojure
(fnext x)
```

Same as (first (next x))

---

#### `force`

```clojure
(force x)
```

If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.

---

#### `get`

```clojure
(get target key)
(get target key not-found)
```

Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.

---

#### `hash-set`

```clojure
(hash-set & xs)
```

Returns a set containing the given values.

---

#### `insert-sorted`

```clojure
(insert-sorted cmp x sorted)
```

Internal helper for insertion-sort based sort implementation.

---

#### `interleave`

```clojure
(interleave c1 c2)
(interleave c1 c2 & colls)
```

Returns a lazy sequence of the first item in each coll, then the second etc.
  Stops as soon as any coll is exhausted.

---

#### `interpose`

```clojure
(interpose sep)
(interpose sep coll)
```

Returns a sequence of the elements of coll separated by sep.
  Returns a transducer when no collection is provided.

---

#### `into`

```clojure
(into to from)
(into to xf from)
```

Returns a new coll consisting of to-coll with all of the items of
   from-coll conjoined. A transducer may be supplied.

---

#### `iterate`

```clojure
(iterate f x)
(iterate f x n)
```

Returns a lazy sequence of x, (f x), (f (f x)) etc.
  With 3 args, returns a finite sequence of n items (backwards compat).

---

#### `keep`

```clojure
(keep f)
(keep f coll)
```

Returns a sequence of the non-nil results of (f item). Note,
  this means false return values will be included.  f must be free of
  side-effects.  Returns a transducer when no collection is provided.

---

#### `keep-indexed`

```clojure
(keep-indexed f)
(keep-indexed f coll)
```

Returns a sequence of the non-nil results of (f index item). Note,
  this means false return values will be included.  f must be free of
  side-effects.  Returns a stateful transducer when no collection is provided.

---

#### `last`

```clojure
(last coll)
```

Returns the last element of the given collection.

---

#### `lazy-seq?`

```clojure
(lazy-seq? x)
```

Returns true if x is a LazySeq.

---

#### `list`

```clojure
(list & args)
```

Returns a new list containing the given values.

---

#### `list*`

```clojure
(list* args)
(list* a args)
(list* a b args)
(list* a b c args)
(list* a b c d & more)
```

Creates a new seq containing the items prepended to the rest, the
  last of which will be treated as a sequence.

---

#### `make-delay`

```clojure
(make-delay thunk-fn)
```

Creates a Delay that invokes thunk-fn (a zero-arg function) on first force.

---

#### `make-lazy-seq`

```clojure
(make-lazy-seq thunk-fn)
```

Creates a LazySeq that invokes thunk-fn (a zero-arg function) on first realization.

---

#### `map`

```clojure
(map f)
(map f coll)
(map f c1 c2)
(map f c1 c2 & colls)
```

Returns a sequence consisting of the result of applying f to the set
  of first items of each coll, followed by applying f to the set of
  second items in each coll, until any one of the colls is exhausted.
  Any remaining items in other colls are ignored. Returns a transducer
  when no collection is provided.

---

#### `map-indexed`

```clojure
(map-indexed f)
(map-indexed f coll)
```

Returns a sequence consisting of the result of applying f to 0
   and the first item of coll, followed by applying f to 1 and the second
   item in coll, etc, until coll is exhausted. Thus function f should
   accept 2 arguments, index and item. Returns a stateful transducer when
   no collection is provided.

---

#### `mapcat`

```clojure
(mapcat f)
(mapcat f coll)
(mapcat f coll & more)
```

Returns the result of applying concat to the result of applying map
  to f and colls.  Thus function f should return a collection. Returns
  a transducer when no collections are provided.

---

#### `mapv`

```clojure
(mapv f coll)
(mapv f c1 c2)
(mapv f c1 c2 c3)
(mapv f c1 c2 c3 & colls)
```

Returns a vector consisting of the result of applying f to the
  set of first items of each coll, followed by applying f to the set
  of second items in each coll, until any one of the colls is exhausted.

---

#### `next`

```clojure
(next coll)
```

Returns a seq of the items after the first. Calls seq on its
  argument.  If there are no more items, returns nil.

---

#### `nfirst`

```clojure
(nfirst x)
```

Same as (next (first x))

---

#### `nnext`

```clojure
(nnext x)
```

Same as (next (next x))

---

#### `not-empty`

```clojure
(not-empty coll)
```

If coll is empty, returns nil, else coll

---

#### `nth`

```clojure
(nth coll n not-found)
```

Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.

---

#### `nthnext`

```clojure
(nthnext coll n)
```

Returns the nth next of coll, (seq coll) when n is 0.

---

#### `nthrest`

```clojure
(nthrest coll n)
```

Returns the nth rest of coll, coll when n is 0.

---

#### `partition`

```clojure
(partition n coll)
(partition n step coll)
(partition n step pad coll)
```

Returns a sequence of lists of n items each, at offsets step
  apart. If step is not supplied, defaults to n, i.e. the partitions
  do not overlap. If a pad collection is supplied, use its elements as
  necessary to complete last partition up to n items. In case there are
  not enough padding elements, return a partition with less than n items.

---

#### `partition-all`

```clojure
(partition-all n)
(partition-all n coll)
```

Returns a sequence of lists like partition, but may include
   partitions with fewer than n items at the end.  Returns a stateful
   transducer when no collection is provided.

---

#### `partition-by`

```clojure
(partition-by f)
(partition-by f coll)
```

Applies f to each value in coll, splitting it each time f returns a
  new value.  Returns a sequence of partitions.  Returns a stateful
  transducer when no collection is provided.

---

#### `peek`

```clojure
(peek coll)
```

For a list, same as first. For a vector, same as last.

---

#### `pop`

```clojure
(pop coll)
```

For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.

---

#### `range`

```clojure
(range)
(range end)
(range start end)
(range start end step)
```

Returns a lazy infinite sequence of integers from 0.
  With args, returns a finite sequence (delegates to native range*).

---

#### `realized?`

```clojure
(realized? x)
```

Returns true if a Delay or LazySeq has been realized.

---

#### `reduce`

```clojure
(reduce f coll)
(reduce f val coll)
```

Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).

---

#### `reduce-kv`

```clojure
(reduce-kv f init coll)
```

Reduces an associative structure. f should be a function of 3
  arguments: accumulator, key/index, value.

---

#### `reductions`

```clojure
(reductions f coll)
(reductions f init coll)
```

Returns a sequence of the intermediate values of the reduction (as
  by reduce) of coll by f, starting with init.

---

#### `remove`

```clojure
(remove pred)
(remove pred coll)
```

Returns a lazy sequence of the items in coll for which
  (pred item) returns logical false. pred must be free of side-effects.
  Returns a transducer when no collection is provided.

---

#### `repeat`

```clojure
(repeat x)
(repeat n x)
```

Returns a lazy infinite sequence of xs.
  With 2 args (n x), returns a finite sequence of n copies.

---

#### `repeatedly`

```clojure
(repeatedly f)
(repeatedly n f)
```

Takes a function of no args, presumably with side effects, and
  returns a lazy infinite sequence of calls to it.
  With 2 args (n f), returns a finite sequence of n calls.

---

#### `rest`

```clojure
(rest coll)
```

Returns a sequence of the given collection or string excluding the first element.

---

#### `reverse`

```clojure
(reverse coll)
```

Returns a new sequence with the elements of the given collection in reverse order.

---

#### `run!`

```clojure
(run! proc coll)
```

Runs the supplied procedure (via reduce), for purposes of side
  effects, on successive items in the collection. Returns nil.

---

#### `second`

```clojure
(second coll)
```

Same as (first (next x))

---

#### `seq`

```clojure
(seq coll)
```

Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.

---

#### `sequence`

```clojure
(sequence coll)
(sequence xf coll)
```

Coerces coll to a (possibly empty) sequence, if it is not already
  one. Will not force a seq. (sequence nil) yields (), When a
  transducer is supplied, returns a lazy sequence of applications of
  the transform to the items in coll

---

#### `set`

```clojure
(set coll)
```

Returns a set of the distinct elements of the given collection.

---

#### `shuffle`

```clojure
(shuffle coll)
```

Return a random permutation of coll.

---

#### `some`

```clojure
(some pred coll)
```

Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.

---

#### `sort`

```clojure
(sort coll)
(sort cmp coll)
```

Returns the items in coll in sorted order. With no comparator, uses
  compare (works on numbers, strings, keywords, chars). Comparator may
  return boolean or number.

---

#### `sort-by`

```clojure
(sort-by keyfn coll)
(sort-by keyfn cmp coll)
```

Returns a sorted sequence of items in coll, where the sort order is
  determined by comparing (keyfn item). Default comparator is compare.

---

#### `sort-compare`

```clojure
(sort-compare cmp a b)
```

Internal helper: normalizes comparator results.

---

#### `split-at`

```clojure
(split-at n coll)
```

Returns a vector of [(take n coll) (drop n coll)]

---

#### `split-with`

```clojure
(split-with pred coll)
```

Returns a vector of [(take-while pred coll) (drop-while pred coll)]

---

#### `subvec`

```clojure
(subvec v start)
(subvec v start end)
```

Returns a vector of the items in vector from start (inclusive) to end (exclusive).

---

#### `take`

```clojure
(take n)
(take n coll)
```

Returns a sequence of the first n items in coll, or all items if
  there are fewer than n.  Returns a stateful transducer when
  no collection is provided.

---

#### `take-last`

```clojure
(take-last n coll)
```

Returns a sequence of the last n items in coll.  Depending on the type
  of coll may be no better than linear time.  For vectors, see also subvec.

---

#### `take-nth`

```clojure
(take-nth n)
(take-nth n coll)
```

Returns a sequence of every nth item in coll.  Returns a stateful
  transducer when no collection is provided.

---

#### `take-while`

```clojure
(take-while pred)
(take-while pred coll)
```

Returns a sequence of successive items from coll while
  (pred item) returns logical true. pred must be free of side-effects.
  Returns a transducer when no collection is provided.

---

#### `vec`

```clojure
(vec coll)
```

Creates a new vector containing the contents of coll.

---

#### `vector`

```clojure
(vector & args)
```

Returns a new vector containing the given values.

---

### State

#### `add-watch`

```clojure
(add-watch atom key fn)
```

Adds a watch function to an atom. The watch fn must be a fn of 4 args: a key, the atom, its old-state, its new-state.

---

#### `atom`

```clojure
(atom value)
```

Returns a new atom holding the given value.

---

#### `atom?`

```clojure
(atom? value)
```

Returns true if the value is an atom, false otherwise.

---

#### `compare-and-set!`

```clojure
(compare-and-set! atom oldval newval)
```

Atomically sets the value of atom to newval if and only if the current value of the atom is identical to oldval. Returns true if set happened, else false.

---

#### `deref`

```clojure
(deref value)
```

Returns the wrapped value from an atom, volatile, reduced, or delay value.

---

#### `remove-watch`

```clojure
(remove-watch atom key)
```

Removes a watch (set by add-watch) from an atom.

---

#### `reset!`

```clojure
(reset! atomVal newVal)
```

Sets the value of the atom to newVal and returns the new value.

---

#### `reset-vals!`

```clojure
(reset-vals! atom newval)
```

Sets the value of atom to newVal. Returns [old new].

---

#### `set-validator!`

```clojure
(set-validator! atom fn)
```

Sets the validator-fn for an atom. fn must be nil or a side-effect-free fn of one argument.

---

#### `swap!`

```clojure
(swap! atomVal fn & extraArgs)
```

Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.

---

#### `swap-vals!`

```clojure
(swap-vals! atom f & args)
```

Atomically swaps the value of atom to be (apply f current-value-of-atom args). Returns [old new].

---

#### `volatile!`

```clojure
(volatile! value)
```

Returns a volatile value with the given value as its value.

---

#### `vreset!`

```clojure
(vreset! vol newVal)
```

Resets the value of the given volatile to the given new value and returns the new value.

---

#### `vswap!`

```clojure
(vswap! vol fn)
(vswap! vol fn & extraArgs)
```

Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.

---

### Strings

#### `keyword`

```clojure
(keyword name)
(keyword ns name)
```

Constructs a keyword with the given name and namespace strings. Returns a keyword value.

Note: do not use : in the keyword strings, it will be added automatically.
e.g. (keyword "foo") =&gt; :foo

---

#### `pr-str`

```clojure
(pr-str & args)
```

Returns a readable string representation of the given values (strings are quoted).

---

#### `pretty-print-str`

```clojure
(pretty-print-str form)
(pretty-print-str form max-width)
```

Returns a pretty-printed string representation of form.

---

#### `print-str`

```clojure
(print-str & args)
```

print to a string (human-readable, no quotes on strings).

---

#### `println-str`

```clojure
(println-str & args)
```

println to a string.

---

#### `prn-str`

```clojure
(prn-str & args)
```

pr-str to a string, followed by a newline.

---

#### `re-find`

```clojure
(re-find re s)
```

Returns the next regex match, if any, of string to pattern, using
  java.util.regex.Matcher.find(). Returns the match or nil. When there
  are groups, returns a vector of the whole match and groups (nil for
  unmatched optional groups).

---

#### `re-matches`

```clojure
(re-matches re s)
```

Returns the match, if any, of string to pattern, using
  java.util.regex.Matcher.matches(). The entire string must match.
  Returns the match or nil. When there are groups, returns a vector
  of the whole match and groups (nil for unmatched optional groups).

---

#### `re-pattern`

```clojure
(re-pattern s)
```

Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.
  (re-pattern "\\d+") produces the same pattern as #"\d+".

---

#### `re-seq`

```clojure
(re-seq re s)
```

Returns a lazy sequence of successive matches of pattern in string,
  using java.util.regex.Matcher.find(), each such match processed with
  re-groups.

---

#### `read-string`

```clojure
(read-string s)
```

Reads one object from the string s. Returns nil if string is empty.

---

#### `str`

```clojure
(str & args)
```

Returns a concatenated string representation of the given values.

---

#### `str-trimr*`

```clojure
(str-trimr* s)
```

Internal helper. Removes whitespace from the right of s.

---

#### `subs`

```clojure
(subs s start)
(subs s start end)
```

Returns the substring of s beginning at start, and optionally ending before end.

---

### Transducers

#### `ensure-reduced`

```clojure
(ensure-reduced value)
```

Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.

---

#### `reduced`

```clojure
(reduced value)
```

Returns a reduced value, indicating termination of the reduction process.

---

#### `transduce`

```clojure
(transduce xform f coll)
(transduce xform f init coll)
```

reduce with a transformation of f (xf). If init is not
supplied, (f) will be called to produce it. f should be a reducing
step function that accepts both 1 and 2 arguments, if it accepts
only 2 you can add the arity-1 with 'completing'. Returns the result
of applying (the transformed) xf to init and the first item in coll,
then applying xf to that result and the 2nd item, etc. If coll
contains no items, returns init and f is not called. Note that
certain transforms may inject or skip items.

---

#### `unreduced`

```clojure
(unreduced value)
```

Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.

---

### Utilities

#### `boolean`

```clojure
(boolean x)
```

Coerces to boolean. Everything is true except false and nil.

---

#### `clojure-version`

```clojure
(clojure-version)
```

Returns a string describing the current Clojure version.

---

#### `hash`

```clojure
(hash x)
```

Returns the hash code of its argument.

---

#### `parse-boolean`

```clojure
(parse-boolean s)
```

Parses string s as a boolean. Returns true for "true", false for "false", nil for anything else.

---

#### `parse-double`

```clojure
(parse-double s)
```

Parses string s as a double. Returns nil if s is not a valid number string.

---

#### `parse-long`

```clojure
(parse-long s)
```

Parses string s as a long integer. Returns nil if s is not a valid integer string.

---

## Macros

### Abstractions

#### `defmethod`

```clojure
(defmethod mm-name dispatch-val & fn-tail)
```

Creates and installs a new method for multimethod mm-name with dispatch value dispatch-val.

---

#### `defmulti`

```clojure
(defmulti name dispatch-fn & opts)
```

Creates a new multimethod with the given name and dispatch function. Re-evaluating a defmulti preserves all previously registered methods.

---

#### `defprotocol`

```clojure
(defprotocol name & specs)
```

Defines a named protocol. Creates a protocol var and one dispatch
  function var per method in the current namespace.

  (defprotocol IShape
    "doc"
    (area [this] "Compute area.")
    (perimeter [this] "Compute perimeter."))

---

#### `defrecord`

```clojure
(defrecord type-name fields & specs)
```

Defines a record type: a named, typed persistent map.
  Creates -&gt;Name (positional) and map-&gt;Name (map-based) constructors.
  Optionally implements protocols inline.

  (defrecord Circle [radius]
    IShape
    (area [this] (* js/Math.PI radius radius)))

---

#### `delay`

```clojure
(delay & body)
```

Takes a body of expressions and yields a Delay object that will invoke the body only the first time it is forced (via force or deref/@), and will cache the result and return it on all subsequent force calls.

---

#### `extend-protocol`

```clojure
(extend-protocol proto-sym & specs)
```

Extends a protocol to one or more types.

  (extend-protocol IShape
    nil
    (area [_] 0)
    String
    (area [s] (count s)))

---

#### `extend-type`

```clojure
(extend-type type-sym & specs)
```

Extends a type to implement one or more protocols.

  (extend-type Circle
    IShape
    (area [this] ...)
    ISerializable
    (to-json [this] ...))

---

### Control Flow

#### `and`

```clojure
(and & forms)
```

Evaluates exprs one at a time, from left to right. If a form returns logical false, returns that value without evaluating the rest. Otherwise returns the value of the last expr. (and) returns true.

---

#### `case`

```clojure
(case e & clauses)
```

Takes an expression, and a set of clauses. Each clause can take the form of
  either:
    test-constant result-expr
  If no clause matches, and there is an odd number of forms (a default), the
  last expression is returned.

---

#### `cond`

```clojure
(cond & clauses)
```

Takes a set of test/expr pairs. Evaluates each test one at a time from left to right. If a test returns logical true, returns the value of the corresponding expr without evaluating the remaining tests.

---

#### `condp`

```clojure
(condp pred expr & clauses)
```

Takes a binary predicate, an expression, and a set of clauses.
  Each clause can take the form of either:
    test-expr result-expr
  The predicate is applied to each test-expr and the expression in turn.

---

#### `doseq`

```clojure
(doseq seq-exprs & body)
```

Repeatedly executes body (presumably for side-effects) with
  bindings. Supports :let, :when, and :while modifiers.

---

#### `dotimes`

```clojure
(dotimes bindings & body)
```

bindings =&gt; name n
  Repeatedly executes body (presumably for side-effects) with name
  bound to integers from 0 through n-1.

---

#### `for`

```clojure
(for seq-exprs & body)
```

List comprehension. Takes a vector of one or more
  binding-form/collection-expr pairs, each followed by zero or more
  modifiers, and yields a sequence of evaluations of expr.
  Supported modifiers: :let, :when, :while.

---

#### `if-let`

```clojure
(if-let bindings then)
(if-let bindings then else)
```

bindings =&gt; binding-form test
  If test is true, evaluates then with binding-form bound to the value of test, otherwise evaluates else.

---

#### `if-some`

```clojure
(if-some bindings then)
(if-some bindings then else)
```

bindings =&gt; binding-form test
  If test is not nil, evaluates then with binding-form bound to the
  value of test, if not, yields else

---

#### `let`

```clojure
(let bindings & body)
```

binding =&gt; binding-form init-expr
  Evaluates the exprs in a lexical context in which the symbols in the binding-forms are bound to their respective init-exprs values. Supports destructuring.

---

#### `letfn`

```clojure
(letfn fnspecs & body)
```

fnspecs =&gt; (fname [params*] exprs)+
  Takes a vector of function specs and a body. Binds each fname to its fn in a shared environment so all functions can mutually reference each other.

---

#### `loop`

```clojure
(loop bindings & body)
```

Evaluates the exprs in a lexical context in which the symbols in the binding-forms are bound to their respective init-exprs values, then evaluates body. recur rebinds the bindings to the supplied values and re-evaluates body.

---

#### `or`

```clojure
(or & forms)
```

Evaluates exprs one at a time, from left to right. If a form returns a logical true value, returns that value without evaluating the rest. Otherwise returns the value of the last expr. (or) returns nil.

---

#### `when`

```clojure
(when condition & body)
```

Executes body when condition is true, otherwise returns nil.

---

#### `when-first`

```clojure
(when-first bindings & body)
```

bindings =&gt; x xs
  Roughly the same as (when (seq xs) (let [x (first xs)] body)) but xs is evaluated only once

---

#### `when-let`

```clojure
(when-let bindings & body)
```

bindings =&gt; binding-form test
  When test is true, evaluates body with binding-form bound to the value of test.

---

#### `when-not`

```clojure
(when-not condition & body)
```

Executes body when condition is false, otherwise returns nil.

---

#### `when-some`

```clojure
(when-some bindings & body)
```

bindings =&gt; binding-form test
  When test is not nil, evaluates body with binding-form bound to the
  value of test

---

#### `while`

```clojure
(while test & body)
```

Repeatedly executes body while test expression is true. Presumes
  some side-effect will cause test to become false/nil.

---

#### `with-redefs`

```clojure
(with-redefs bindings & body)
```

binding =&gt; var-symbol temp-value-expr
  Temporarily redefines Vars while executing the body. The
  temp-value-exprs will be evaluated and each resulting value will
  replace in parallel the root value of its Var. Always restores
  the original values, even if body throws.

---

### Dev

#### `doc`

```clojure
(doc sym)
```

---

### Functions

#### `defn`

```clojure
(defn name & fdecl)
```

Same as (def name (fn [params*] exprs*)). Optionally accepts a docstring and attribute-map before params. Attaches :doc and :arglists metadata to the var.

---

#### `fn`

```clojure
(fn & sigs)
```

params =&gt; positional-params*, or positional-params* & rest-param
  Defines an anonymous function. Supports destructuring, multiple arities, and an optional name for self-recursion.

---

### IO

#### `with-err-str`

```clojure
(with-err-str & body)
```

Like with-out-str but captures *err* output (warn, etc.).

---

#### `with-out-str`

```clojure
(with-out-str & body)
```

Evaluates body in a context in which *out* is bound to a fresh string
  accumulator. Returns the string of all output produced by println, print,
  pr, prn, pprint and newline during the evaluation.

---

### Sequences

#### `lazy-seq`

```clojure
(lazy-seq & body)
```

Takes a body of expressions that returns a seq or nil, and yields a LazySeq that will invoke the body only the first time it is realized.

---

### Threading

#### `->`

```clojure
(-> x & forms)
```

Threads the expr through the forms. Inserts x as the second item in the first form, making a list of it if it is not a list already. If there are more forms, inserts the first form as the second item in second form, etc.

---

#### `->>`

```clojure
(->> x & forms)
```

Threads the expr through the forms. Inserts x as the last item in the first form, making a list of it if it is not a list already. If there are more forms, inserts the first form as the last item in second form, etc.

---

#### `as->`

```clojure
(as-> expr name & forms)
```

Binds name to expr, evaluates the first form in the lexical context of that binding, then binds name to that result, repeating for each successive form. Returns the result of the last form.

---

#### `cond->`

```clojure
(cond-> expr & clauses)
```

Takes an expression and a set of test/form pairs. Threads expr through each form (via -&gt;) whose corresponding test returns logical true.

---

#### `cond->>`

```clojure
(cond->> expr & clauses)
```

Takes an expression and a set of test/form pairs. Threads expr through each form (via -&gt;&gt;) whose corresponding test returns logical true.

---

#### `some->`

```clojure
(some-> expr & forms)
```

When expr is not nil, threads it into the first form (via -&gt;), and when that result is not nil, through the next etc.

---

#### `some->>`

```clojure
(some->> expr & forms)
```

When expr is not nil, threads it into the first form (via -&gt;&gt;), and when that result is not nil, through the next etc.

---

### General

#### `comment`

```clojure
(comment & body)
```

Ignores body, yields nil

---

#### `declare`

```clojure
(declare sym)
```

defs the supplied var names with no bindings, useful for making forward declarations.

---

#### `defn-`

```clojure
(defn- name & fdecl)
```

Same as defn, but marks the var as private.

---

## Special Vars

### Abstractions

#### `*hierarchy*`

**dynamic var** · default: `{3 entries}`

---

### General

#### `*compiler-options*`

**dynamic var** · default: `{}`

---

#### `*data-readers*`

**dynamic var** · default: `{}`

---

#### `*describe-limit*`

**dynamic var** · default: `50`

---

#### `*err*`

**dynamic var** · default: `nil`

---

#### `*ns*`

**dynamic var**

---

#### `*out*`

**dynamic var** · default: `nil`

---

#### `*print-length*`

**dynamic var** · default: `nil`

---

#### `*print-level*`

**dynamic var** · default: `nil`

---