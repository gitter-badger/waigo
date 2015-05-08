"use strict";

/** 
 * @fileOverview Base class for mailer types.
 */

var debug = require('debug')('waigo-mailer-base'),
  co = require('co'),
  Q = require('bluebird'),
  path = require('path'),
  emailTemplates = Q.promisify(require('email-templates')),
  marked = require('marked');


var waigo = require('../../../'),
  _ = waigo._,
  errors = waigo.load('support/errors'),
  NodeMailer = waigo.load('support/mailer/engines/nodeMailer').NodeMailer,
  viewObjects = waigo.load('support/viewObjects');


var MailerError = errors.define('MailerError');



var Mailer = exports.Mailer = function(app, config, logger) {
  this.app = app;
  this.logger = logger;
  this.config = config;
};


Mailer.prototype._init = function*(transport) {
  this._nodeMailer = new NodeMailer(this.logger, this.config, transport);

  this._emailBuilder = yield emailTemplates(
    path.join(waigo.getAppFolder(), 'views', 'emailTemplates')
  );
};



Mailer.prototype._renderEmailTemplate = function(templateName, locals) {
  var self = this;

  this.logger.debug('Rendering template ' + templateName);

  return new Q(function(resolve, reject) {
    self._emailBuilder(templateName, locals, function(err, html, text) {
      if (err) {
        reject(err);
      } else {
        resolve({
          html: html,
          text: text
        });          
      }
    });
  });
};



Mailer.prototype._renderBodyMarkdown = function*(template, templateVars) {
  var self = this;

  var compiled = _.template(template, {
    interpolate: /{{([\s\S]+?)}}/img
  });

  var content = marked(compiled(templateVars || {}));

  var locals = _.extend({}, templateVars, {
    content: content
  });

  var body = yield this._renderEmailTemplate('layout', locals);

  return body.html;
};




Mailer.prototype._renderBodyTemplate = function*(templateName, templateVars) {
  var self = this;

  var content = yield this._renderEmailTemplate(templateName, templateVars);

  var locals = _.extend({}, templateVars, {
    content: content.html
  });

  var body = yield this._renderEmailTemplate('layout', locals);

  return body.html;
};




Mailer.prototype._renderBody = function*(mailOptions, templateVars) {
  if (mailOptions.bodyTemplate) {
    return yield this._renderBodyTemplate(mailOptions.bodyTemplate, templateVars);
  } else {
    return yield this._renderBodyMarkdown(mailOptions.body, templateVars);
  }
};





Mailer.prototype._renderSubject = function*(mailOptions, templateVars) {
  debug('Rendering subject');

  var compiled = _.template(mailOptions.subject, {
    interpolate: /{{([\s\S]+?)}}/img
  });

  return compiled(templateVars || {});
};



Mailer.prototype._prepareMailOptions = function*(mailOptions) {
  mailOptions = _.extend({
    from: this.config.from,
    subject: null,
    body: null,
    bodyTemplate: null,
    locals: {},
    ctx: {},
    allowEmpty: false
  }, mailOptions);


  if (_.isEmpty(mailOptions.to)) {
    throw new MailerError('Recipients must be set');
  }

  // it not allowed to send empty email
  if (!mailOptions.allowEmpty) {
    if (_.isEmpty(mailOptions.subject) || 
        (_.isEmpty(mailOptions.body) && _.isEmpty(mailOptions.bodyTemplate)) ) {
      throw new MailerError('Subject and body/template must be set');
    }    
  }

  if (!_.isArray(mailOptions.to)) {
    mailOptions.to = [mailOptions.to];
  }

  // locals common to all recipients
  mailOptions.locals = _.extend({}, this.app.locals, mailOptions.ctx.locals, 
    yield viewObjects.toViewObjectYieldable(mailOptions.ctx, mailOptions.locals)
  );

  return mailOptions;
};



Mailer.prototype._send = function*(mailOptions) {
  var self = this;

  mailOptions = yield this._prepareMailOptions(mailOptions);

  return yield _.map(mailOptions.to, function(recipient) {
    return co.wrap(function*() {
      // email address
      var email = _.get(recipient, 'emails.0.email', recipient);

      self.logger.debug('Email ' + email + ': ' + mailOptions.subject);

      // user-specific locals
      var userLocals = _.extend({}, mailOptions.locals, 
        yield viewObjects.toViewObjectYieldable(mailOptions.ctx, {
          recipient: recipient
        })
      );

      // render body
      var body = yield this._renderBody(mailOptions, userLocals);
      var subject = yield self._renderSubject(mailOptions, userLocals);

      // setup actual options
      var sendOptions = _.extend({
        from: mailOptions.from,
      }, {
        to: email,
        subject: subject,
        html: body
      });

      self.logger.debug('Content', sendOptions.html);

      // send
      var ret = yield self._nodeMailer.send(sendOptions);

      // record
      yield self.app.record('email', recipient, {
        subject: sendOptions.subject
      });

      return ret;
    })();    
  });
};




Mailer.prototype.render = function*(mailOptions) {
  mailOptions = yield this._prepareMailOptions(mailOptions);

  var recipient = mailOptions.to.pop();

  var email = _.get(recipient, 'emails.0.email', recipient);

  this.logger.debug('Render email ' + email + ': ' + mailOptions.subject);

  // user-specific locals
  var userLocals = _.extend({}, mailOptions.locals, 
    yield viewObjects.toViewObjectYieldable(mailOptions.ctx, {
      recipient: recipient
    })
  );

  return {
    body: yield this._renderBody(mailOptions, userLocals),
    subject: yield this._renderSubject(mailOptions, userLocals),
  }
};



