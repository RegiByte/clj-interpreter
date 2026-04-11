import {
  greeting,
  pi,
  add,
  square,
  factorial,
  greet,
  fibonacci,
} from './clojure/demo.clj'

const results = document.getElementById('results')!

function show(label: string, value: unknown) {
  const div = document.createElement('div')
  div.className = 'result'
  div.innerHTML = `<span class="label">${label}</span> → <span class="value">${JSON.stringify(value)}</span>`
  results.appendChild(div)
}

function section(title: string) {
  const h2 = document.createElement('h2')
  h2.textContent = title
  results.appendChild(h2)
}

section('Values')
show('greeting', greeting)
show('pi', pi)
section('Functions')
show('(add 3 4)', add(3, 4))
show('(square 7)', square(7))
show('(factorial 10)', factorial(10))
show('(greet "RegiByte")', greet('RegiByte'))

section('Fibonacci sequence')
for (let i = 0; i <= 10; i++) {
  show(`(fibonacci ${i})`, fibonacci(i))
}
console.log('All Clojure imports working!')
;(window as any).bindings = {
  greeting,
  pi,
  add,
  square,
  factorial,
  greet,
  fibonacci,
}
console.log((window as any).bindings)
