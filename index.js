const nanoiterator = require('nanoiterator')
const maybe = require('call-me-maybe')

const { StackIterator } = require('./lib/iterators')

class HypertrieGraph {
  constructor (trie, opts) {
    this.trie = trie
    this.opts = opts
  }

  _key (opts = {}) {
    return `${opts.label || ''}/${opts.from || ''}/${opts.to || ''}`
  }

  put (from, to, label, value, cb) {
    if (typeof value === 'function') return this.insert(from, to, label, null, value)
    const key = this._key({ label, from, to })
    return maybe(cb, new Promise((resolve, reject) => {
      this.trie.put(key, value, err => {
        if (err) return reject(err)
        return resolve()
      })
    }))
  }

  iterator (opts = {}) {
    const self = this

    const ite = new StackIterator()
    const visited = new Set()

    ite.push(this.trie.iterator(this._key(opts), { recursive: true }))
    return nanoiterator({ next })

    function next (cb) {
      ite.next((err, node) => {
        if (err) return cb(err)
        if (!node) return cb(null, null)
        const split = node.key.split('/')
        const target = split[split.length - 1]
        if (visited.has(node.key)) return next(cb)
        if (opts.recursive) {
          const nextPrefix = self._key({
            ...opts,
            from: target
          })
          ite.push(self.trie.iterator(nextPrefix))
        }
        visited.add(node.key)
        return cb(null, finalize(node, target))
      })
    }

    function finalize (node, target) {
      node.key = target
      return node
    }
  }
}

module.exports = HypertrieGraph
