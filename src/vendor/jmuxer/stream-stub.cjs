/**
 * jmuxer 的 UMD 构建在 CJS 路径会 require('stream')。
 * 浏览器 / Vite renderer 不需要真实 Node Duplex，这里提供最小 stub。
 */

function Duplex(options) {
  this._options = options || {};
}

Duplex.prototype.push = function push() {
  return true;
};

Duplex.prototype.write = function write(chunk, encoding, callback) {
  if (typeof encoding === "function") {
    callback = encoding;
  }
  if (typeof this._options.write === "function") {
    this._options.write(chunk, encoding, callback || function noop() {});
  } else if (typeof callback === "function") {
    callback();
  }
  return true;
};

Duplex.prototype.end = function end() {};
Duplex.prototype.on = function on() {
  return this;
};
Duplex.prototype.once = function once() {
  return this;
};
Duplex.prototype.pipe = function pipe() {
  return this;
};

module.exports = { Duplex };
module.exports.Duplex = Duplex;
