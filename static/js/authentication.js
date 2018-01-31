/*
*
* HBP AUTHENTICATION
*
* This code is taken from 
* https://collab.humanbrainproject.eu/#/collab/54/nav/368
* but have some minor tweaks.
*
*/

function authentication() {
    // Setup OpenID connect authentication using the clientId provided
    // in the HBP OIDC client page.
    // https://collab.humanbrainproject.eu/#/collab/54/nav/1051

    hello.init({
      hbp: '14153d9c-a989-41a6-b6cf-f4098dc0c555'
    });

    // If the user is not authenticated, it will redirect to the HBP auth server
    // and use an OpenID connect implicit flow to retrieve an user access token.
    hello.login('hbp', {display: 'page', force: false});

    $(document).ready(function() {
      retrieveCurrentContext();
    })

}

// Extract the context UUID from the querystring.
var extractCtx = function() {
    return window.location.search.substr(
      window.location.search.indexOf('ctx=') + 4,
      36 // UUID is 36 chars long.
    );
};

var retrieveCurrentContext = function() {
    var ctx = extractCtx();

    // Retrieve the user auth informations
    var auth = hello.getAuthResponse('hbp');
    console.log(auth)
    if (auth && auth.access_token) {
      var token = auth.access_token;
      // Query the collaboratory service to retrieve the current context
      // related collab and other associated informations.
      $.ajax('https://services.humanbrainproject.eu/collab/v0/collab/context/' + ctx + '/', {
        headers: {
          Authorization: 'Bearer ' + token
        }
      })
      .done(function(data) {
        // Update the DOM with the context object retrieved by the web service.
        console.log("collab-title: ", data.collab.title);
        console.log("collab-content: ", data.collab.content);
        console.log("data-source: ", JSON.stringify(data, null, 2));
      })
      .fail(function(err) {
        console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      });
    } else {
      console.log("collab-title: Not Authenticated");
      console.log("collab-content: Please login first");
    }
};