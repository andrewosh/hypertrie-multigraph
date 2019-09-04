const test = require('tape')

const ram = require('random-access-memory')
const hypertrie = require('hypertrie')
const Graph = require('..')

test('non-recursive one-label graph traversal for a single key', async t => {
  const trie = hypertrie(ram)
  const graph = new Graph(trie)

  await graph.put('a', 'b', 'parent')
  await graph.put('b', 'a', 'child')
  await graph.put('b', 'c', 'parent')
  await graph.put('c', 'b', 'child')
  await graph.put('a', 'd', 'parent')
  await graph.put('d', 'a', 'child')

  const ite = graph.iterator({ from: 'a', label: 'parent' })
  await validate(t, ite, ['b', 'd'])

  t.end()
})

test('recursive one-label graph traversal for a single key', async t => {
  const trie = hypertrie(ram)
  const graph = new Graph(trie)

  await graph.put('a', 'b', 'parent')
  await graph.put('b', 'a', 'child')
  await graph.put('b', 'c', 'parent')
  await graph.put('c', 'b', 'child')
  await graph.put('a', 'd', 'parent')
  await graph.put('d', 'a', 'child')

  const ite = graph.iterator({ from: 'a', label: 'parent', recursive: true })
  await validate(t, ite, ['b', 'd', 'c'])

  t.end()
})

async function validate (t, ite, expected) {
  const expectedSet = new Set(expected)
  var seen = 0
  return new Promise(resolve => {
    ite.next(function onnext (err, node) {
      t.error(err, 'no error')
      if (!node) {
        t.same(seen, expectedSet.size)
        return resolve()
      }
      t.true(expectedSet.has(node.key))
      seen++
      return ite.next(onnext)
    })
  })
}
