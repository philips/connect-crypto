/*!
 * Connect - encrypt
 * Copyright(c) 2012 Brandon Philips
 * MIT Licensed
 */

var util = require('util')
var EventEmitter = require('events').EventEmitter
var crypto = require('crypto')

function CryptoStream(key, cipher) {
  this._key = key;
  this._cipher = cipher;
}

util.inherits(CryptoStream, EventEmitter);

CryptoStream.prototype.write = function(data) {
  this.emit("data", this._cipher.update(data));
}

CryptoStream.prototype.end = function(data) {
  if (data) {
    this.emit("data", this._cipher.update(data))
  }
  this.emit("data", this._cipher.final())
  this.emit("end");
}

var EncryptStream = function(key) {
  EncryptStream.super_.call(this, key, crypto.createCipher('aes-256-cbc', key));
}

util.inherits(EncryptStream, CryptoStream);

var DecryptStream = function(key) {
  DecryptStream.super_.call(this, key, crypto.createDecipher('aes-256-cbc', key));
}

util.inherits(DecryptStream, CryptoStream);

/**
 * Encrypt:
 *
 * Encrypt http request bodies with the given `key`.
 *
 * Options:
 *
 *   - `key`     AES Key for encryption
 *   - `options` fields: decrypt defaults to false
 *
 * Examples:
 *
 *      connect-encrypt.encrypt('password')
 *
 */

module.exports = function connect_encrypt(key, options) {
  if ('object' == typeof options) {
    options = options || {};
  } else {
    options = {}
  }

  if ('string' != typeof key) {
    throw new Error('key option required')
  }

  return function encrypt(req, res, next) {
    var write = res.write;
    var end = res.end;
    var stream;

    if (options.decrypt === true) {
      stream = new DecryptStream(key)
    } else {
      stream = new EncryptStream(key);
    }

    // flag as encrypting
    req._encrypting = true;

    res.write = function(chunk, encoding) {
      if (!this.headerSent) this._implicitHeader();
      return stream
        ? stream.write(chunk, encoding)
        : write.call(res, chunk, encoding);
    };

    res.end = function(chunk, encoding) {
      if (chunk) this.write(chunk, encoding);
      return stream
        ? stream.end()
        : end.call(res);
    };

    res.on('header', function() {
      // head
      if ('HEAD' == req.method) return;

      // header fields
      res.removeHeader('Content-Length');

      // compression
      stream.on('data', function(chunk){
        write.call(res, chunk);
      });

      stream.on('end', function(){
        end.call(res);
      });

    });

    next();
  };
};
