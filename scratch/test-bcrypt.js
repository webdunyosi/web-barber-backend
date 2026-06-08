const bcrypt = require('bcryptjs');

const hash = '$2b$10$WbkxFxDn1XijtKcP7SJEP.4guIEJQQD40wo5ZNFU8S7XanfLDhJqC';
bcrypt.compare('admin', hash).then(res => {
  console.log('Is "admin" correct?', res);
});
