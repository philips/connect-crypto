var crypto = require('crypto');
var connect = require('connect');
var connect_encrypt = require('../');

var fixtures = __dirname + '/fixtures';

var app = connect();
var key = 'testtesttest'
app.use(connect_encrypt(key));
var decipher = crypto.createDecipher('aes-256-cbc', key);
app.use(connect.static(fixtures));

describe('connect.encrypt()', function(){
  it('should encrypt body', function(done){
    app.request()
    .get('/todo.txt')
    .end(function(res){
      res.body.should.not.equal('');
      res.body.should.not.equal('- security');
      var data = decipher.update(res.body);
      data += decipher.final();
      res.body.should.not.equal('- security');
      data.should.equal('- security\n');
      done();
    });
  })

  it('should transfer chunked', function(done){
    app.request()
    .get('/todo.txt')
    .expect('Transfer-Encoding', 'chunked', done);
  })

  it('should remove Content-Length for chunked', function(done){
    app.request()
    .get('/todo.txt')
    .end(function(res){
      res.headers.should.not.have.property('content-length');
      done()
    });
  })

})
