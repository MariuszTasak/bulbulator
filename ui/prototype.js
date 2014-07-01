// Using Object.defineProperty ensures that the newly added function doesn't appear in the list of enumerable properties of every Object.

Object.defineProperty(Object.prototype, 'map', {
  value: function(f, ctx) {
    ctx = ctx || this;
    var self = this, result = {};
    Object.keys(self).forEach(function(v) {
      result[v] = f.call(ctx, self[v], v, self);
    });
    return result;
  }
});