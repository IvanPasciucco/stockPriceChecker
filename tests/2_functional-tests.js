const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  // Variable para guardar los likes y verificar que no suben duplicados
  let likesStock1 = 0;

  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' })
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, 'GOOG');
        done();
      });
  });

  test('Viewing one stock and liking it: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: true })
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.likes);
        assert.isAbove(res.body.stockData.