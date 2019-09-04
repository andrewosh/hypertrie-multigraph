// TODO: This will get a lot of reuse -- extract into its own module
class StackIterator {
  constructor (maxDepth) {
    this.maxDepth = maxDepth || -1

    this._stack = []
    this._destroyed = false
    this._depth = 0
  }

  push (ite) {
    if ((this._depth >= this.maxDepth) && this.maxDepth !== -1) return
    this._depth++
    this._stack.unshift(ite)
  }

  next (cb) {
    if (this._destroyed) return cb(new Error('Iterator was destroyed.'))
    if (!this._stack.length) return cb(null, null)
    return this._stack[0].next((err, val) => {
      if (err) return cb(err)
      if (val === null) {
        this._stack.shift()
        this._depth--
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

module.exports = {
  StackIterator
}
