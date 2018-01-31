/* global hello */

(function() {
  var authUrl = (
    window.bbpConfig && window.bbpConfig.auth && window.bbpConfig.auth.url) ||
    'https://services.humanbrainproject.eu/oidc';
  hello.init({
    hbp: {
      name: 'Human Brain Project',
      oauth: {
        version: '2',
        auth: authUrl + '/authorize',
        grant: authUrl + '/token'
      },
      // API base URL
      base: authUrl + '/',
      scope_delim: ' ', // eslint-disable-line camelcase
      login: login,
      logout: logout
    }
  });

  function login(p) {
    // Reauthenticate
    if (p.options.force) {
      p.qs.prompt = 'login';
    }
    // If no scope has been provided,
    // remove the param for the server to allocate
    // the default application scope.
    if (!p.qs.scope) {
      delete p.qs.scope;
    }
  }

  function logout(callback, p) {
    if (p.options.force) {
      var token = p.authResponse.access_token;
      var oReq = new XMLHttpRequest();
      oReq.onload = function() {
        callback();
      };
      oReq.open('post', authUrl + '/slo', true);
      oReq.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      oReq.withCredentials = true;
      oReq.send(JSON.stringify({ token: token }));
    } else {
      callback();
    }
  }
})();
