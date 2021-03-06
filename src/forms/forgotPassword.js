"use strict";


const waigo = global.waigo,
  _ = waigo._,
  errors = waigo.load('support/errors');


const ForgotPasswordError = errors.define('ForgotPasswordError');


module.exports = {
  fields: [
    {
      name: 'email',
      type: 'text',
      label: 'Email address / Username',
      required: true,
      sanitizers: [ 'trim' ],
      validators: [ 'notEmpty' ],
    },
  ],
  method: 'POST',
  postValidation: [
    function* sendResetPasswordEmail(next) {
      let ctx = this.context,
        App = ctx.App;

      let User = App.models.User;

      // load user
      let user = yield User.getByEmailOrUsername(this.fields.email.value);

      if (!user) {
        ctx.throw(ForgotPasswordError, 'User not found', 404);
      }

      // action
      let token = yield App.actionTokens.create('reset_password', user);

      App.logger.debug('Reset password token for ' + user.id , token);

      // record
      App.emit('record', 'reset_password', user);

      // send email
      yield App.mailer.send({
        to: user,
        subject: 'Reset your password',
        bodyTemplate: 'resetPassword',
        templateVars: {
          link: App.routes.url('reset_password', null, {
            c: token
          }, {
            absolute: true
          })
        }
      });

      yield next;
    }
  ]
};

