const nanoiterator = require('nanoiterator')
const maybe = require('call-me-maybe')

// TODO: This will get a lot of reuse -- extract into its own module
class StackIterator {
  constructor () {
    this._stack = []
    this._destroyed = false
  }

  push (ite) {
    this._stack.unshift(ite)
  }

  next (cb) {
    if (this._destroyed) return cb(new Error('Iterator was destroyed.'))
    if (!this._stack.length) return cb(null, null)
    return this._stack[0].next((err, val) => {
      if (err) return cb(err)
      if (val === null) {
        this._stack.shift()
        return this.next(cb)
      }
      return cb(null, val)
    })
  }

  destroy (cb) {
    this._destroyed = true
    var pending = this._stack.length
    if (!pending) return process.nextTick(cb, null)
    for (const ite of this._stack) {
      ite.destroy(err => {
        if (err) return cb(err)
        if (!--pending) return cb(null)
      })
    }
  }
}

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
