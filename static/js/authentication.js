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

var retrieveCurrentContext = function() {
    // Retrieve the user auth informations
    var auth = hello.getAuthResponse('hbp');
    console.log(auth)
    if (auth && auth.access_token) {
      var token = auth.access_token;
      // Query the collaboratory service to retrieve the current context
      // related collab and other associated informations.
      $.ajax('https://services.humanbrainproject.eu/oidc/userinfo/', {
        headers: {
          Authorization: 'Bearer ' + token
        }
      })
      .done(function(data) {
        // Update the DOM with the context object retrieved by the web service.
        console.log("data-source: ", JSON.stringify(data, null, 2));
        console.log("user_id: ", data.sub);
        console.log("name: ", data.name);
        app.init(data.sub);
      })
      .fail(function(err) {
        console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      });
    } else {
      console.log("data-source: Not Authenticated");
      console.log("user-id: Please login first");
    }
};