"use strict";


var waigo = require('../../'),
  _ = waigo._;


module.exports = {
  fields: [
    {
      name: 'email',
      type: 'text',
      label: 'Email address / Username',
      required: true,
      sanitizers: [ 'trim' ],
      validators: [ 'notEmpty', 'isEmailAddress' ],
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      required: true,
      sanitizers: [ 'trim' ],
      validators: [ 'notEmpty' ],
    },
    {
      // where to take take user once logged-in
      name: 'postLoginUrl',
      type: 'hidden',
    },
  ],
  method: 'POST',
  postValidation: [
    function* updateUserLoginTimestamp(next) {
      var User = this.context.app.models.User;

      // load user
      var user = yield User.findOne({
        $or: [
          {
            username: this.fields.email.value,
          },
          {
            'emails.email': this.fields.email.value,
          }
        ]
      }, {
        fields: {
          _id: 1
        }
      });

      // if user not found then incorrect credentials
      if (!user) {
        throw new Error('Incorrect username or password');
      }

      // log the user in
      yield user.login(this.context);

      yield next;
    }
  ]
};

