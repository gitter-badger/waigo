var co = require('co'),
  moment = require('moment'),
  path = require('path'),
  Promise = require('bluebird');

var testBase = require('../../../../_base'),
  assert = testBase.assert,
  expect = testBase.expect,
  should = testBase.should,
  testUtils = testBase.utils,
  test = testUtils.createTest(module),
  waigo = testBase.waigo;


var errors = null,
  errorHandler = null;


test['error handler middleware'] = {
  beforeEach: function(done) {
    waigo.__modules = {};
    waigo.initAsync()
      .then(function() {
        errors = waigo.load('support/errors');
        errorHandler = waigo.load('support/middleware/errorHandler');
      })
      .nodeify(done);
  },

  'returns middleware': function() {
    var fn = errorHandler();

    expect(testUtils.isGeneratorFunction(fn)).to.be.true;
  },

  'default handling': function(done) {
    var fn = errorHandler();

    var ctx = {
      app: waigo.load('server')
    };
    ctx.app.logger = {
      error: test.mocker.spy()
    };

    var e = new errors.BaseError('bla bla bla', 403);

    var testFn = Promise.promisify(co(function*() {
      yield* fn.call(ctx, function*() {
        throw e;
      });      
    }));

    testFn()
      .then(function() {
        ctx.status.should.eql(403);
        ctx.body.should.eql({
          type: 'BaseError',
          msg: 'bla bla bla'
        });
        expect(ctx.body.stack).to.be.undefined;
        ctx.type.should.eql('json');

        ctx.app.logger.error.should.have.been.calledOnce;
        ctx.app.logger.error.should.have.been.calledWithExactly('bla bla bla', e);
      })
      .nodeify(done);
  },

  'show stack': function(done) {
    var fn = errorHandler({
      showStack: true
    });

    var ctx = {
      app: waigo.load('server')
    };
    ctx.app.logger = {
      error: test.mocker.spy()
    };

    var e = new errors.BaseError('bla bla bla', 403);

    var testFn = Promise.promisify(co(function*() {
      yield* fn.call(ctx, function*() {
        throw e;
      });      
    }));

    testFn()
      .then(function() {
        expect(ctx.body.stack).to.not.be.undefined;
      })
      .nodeify(done);
  }

};