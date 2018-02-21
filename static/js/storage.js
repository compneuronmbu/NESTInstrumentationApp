/*
*
* HBP STORAGE
*
*/

// Extract the context UUID from the querystring.
var extractCtx = function() {
    return window.location.search.substr(
      window.location.search.indexOf('ctx=') + 4,
      36 // UUID is 36 chars long.
    );
};

function get_ctx_data(token)
{
  var collabUrl = "https://services.humanbrainproject.eu/collab/v0/collab/context";
  var ctx = extractCtx();
  $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
          },
      type: "GET",
      url: collabUrl + '/' + ctx + '/',
    }
  )
  .done(function(data)
  {
    // Update the DOM with the context object retrieved by the web service.
    // console.log("data-source: ", JSON.stringify(data, null, 2));
    get_collab_uuid(token, data);
  });
}

function get_collab_uuid(token, data)
{
  var baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";
  $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
          },
      type: "GET",
      url: baseUrl + `/entity/?path=/${data.collab.id}/`,
    }
  )
  .done(function(new_data)
  {
    make_file(token, new_data);
  });
}

function make_file(token, data)
{
  var baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";
  $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
          },
      type: "POST",
      url: baseUrl + '/file/',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify({
                      'name': 'file_6.json',
                      'content_type': 'application/json',
                      'parent': data.uuid
                    }, null, 2)
    })
    .done(function(data)
    {
      // console.log('file-data: ', data);
      write_to_file(token, data);
    })
    .fail(function(err) {
        console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      });
}

function write_to_file(token, data)
{
  var baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";
  $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
          },
      type: "POST",
      url: baseUrl + `/file/${data.uuid}/content/upload/`,
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify({
        data: 'data'
      }, null, 2)
    })
    .done(function(data)
    {
      console.log('Success!');
    })
    .fail(function(err) {
        console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      });
}

function save_data_to_new_file(filename, data, token)
{
  this_ = this;
  this_.filename = filename;
  this_.data = data;
  return 
}

function storage()
{
    console.log(window.location)

    // Retrieve the user auth informations
    var auth = hello.getAuthResponse('hbp');
    console.log(auth)
    if (auth && auth.access_token) {
      var token = auth.access_token;
      get_ctx_data(token)
      // Query the collaboratory service to retrieve the current context
      // related collab and other associated informations.
      //66925d61-3d21-47ce-829b-dd68c6f795d7
      //$.ajax('https://services.humanbrainproject.eu/storage/v1/api/file/63ba08cf-e09b-4a4a-8267-45c38ee92c27/',{//https://services.humanbrainproject.eu/collab/v0/collab/context/' + ctx + '/', {
      //$.ajax('https://services.humanbrainproject.eu/storage/v1/api/folder/eea99ccd-2057-485a-8219-4e5c4b4baf72/children/',{
      //$.ajax('https://services.humanbrainproject.eu/collab/v0/collab/context/' + ctx + '/', {
      //$.ajax('https://services.humanbrainproject.eu/storage/v1/api/project/',{//5a7c2945-d681-471f-97c6-f04c38b5cfbc/children',{
      // $.ajax(
      //   {
      //     beforeSend: function (jqXHR, settings) {
      //             jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
      //         },
      //     type: "GET",
      //     url: collabUrl + '/' + ctx + '/',
      //   }
      // )
      // .done(function(data) {
      //   // Update the DOM with the context object retrieved by the web service.
      //   console.log("data-source: ", JSON.stringify(data, null, 2));
      //   $.ajax(
      //     {
      //       beforeSend: function (jqXHR, settings) {
      //               jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
      //           },
      //       type: "GET",
      //       url: baseUrl + `/entity/?path=/${data.collab.id}/`,
      //     }
      //   ).done(function(data2) {
      //     console.log("data-sub: ", JSON.stringify(data2, null, 2));
      //     console.log('UUID: ', data2.uuid)
      //     $.ajax(
      //       {
      //         beforeSend: function (jqXHR, settings) {
      //                 jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
      //             },
      //         type: "POST",
      //         url: baseUrl + '/file/',
      //         contentType: 'application/json; charset=utf-8',
      //         data: JSON.stringify({
      //                         'name': 'file_2',
      //                         'content_type': 'plain/text',
      //                         'parent': data2.uuid
      //                       }, null, 2)
      //       }
      //     ).done(function(data2) {
      //       console.log("data-sub: ", JSON.stringify(data2, null, 2));
      //     } )
      //     .fail(function(err) {
      //       console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      //     });
      //   } );
      // })
      // .fail(function(err) {
      //   console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      // });



      // $.ajax(
      //   {
      //     beforeSend: function (jqXHR, settings) {
      //             jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
      //         },
      //     type: "GET",
      //     url: baseUrl + '/file/0760f2ec-c325-4b25-bb6f-04bca80c53ca/',
      //   }
      // ).done(function(data2) {
      //   console.log("data-sub: ", JSON.stringify(data2, null, 2));
      // } )
      // .fail(function(err) {
      //   console.log("Noe har failet, data-source: ", JSON.stringify(err, null, 2));
      // });







    } else {
      console.log("data-source: Not Authenticated");
      console.log("user-id: Please login first");
    }

}




//test-folder uuid: 553882e1-6cf9-4f89-acd4-1d45c1a8a518
//storage folder uuid: eea99ccd-2057-485a-8219-4e5c4b4baf72