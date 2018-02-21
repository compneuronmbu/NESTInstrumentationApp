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

function accessStorage(token, callback)
{
  var collabUrl = "https://services.humanbrainproject.eu/collab/v0/collab/context";
  var ctx = extractCtx();
  $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
          },
      type: "GET",
      url: `${collabUrl}/${ctx}/`,
    }
  )
  .done(function(data)
  {
    // Update the DOM with the context object retrieved by the web service.
    // console.log("data-source: ", JSON.stringify(data, null, 2));
    getCollabUuid(token, data, callback);
  })
  .fail(function(err) {
    console.log("Something went wrong when getting collab id: ", JSON.stringify(err, null, 2));
  });
}

function getCollabUuid(token, data, callback)
{
  var baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";
  $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
          },
      type: "GET",
      url: `${baseUrl}/entity/?path=/${data.collab.id}/`,
    }
  )
  .done(function(new_data)
  {
    callback(token, new_data);
  })
  .fail(function(err) {
    console.log("Something went wrong when getting collab UUID: ", JSON.stringify(err, null, 2));
  });
}

function saveDataToNewFile(filename, data)
{
  this_ = this;
  this_.filename = filename;
  this_.data = data;
  this_.baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";

  function makeFile(token, data)
  {
    $.ajax(
      {
        beforeSend: function (jqXHR, settings) {
                jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
            },
        type: "POST",
        url: `${this_.baseUrl}/file/`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({
                        'name': `${this_.filename}.json`,
                        'content_type': 'application/json',
                        'parent': data.uuid
                      }, null, 2)
      })
      .done(function(data)
      {
        console.log(`Created new file: ${data.name}`);
        console.log(data);
        writeToFile(token, data);
      })
      .fail(function(err) {
          console.log("Something went wrong when making file: ", JSON.stringify(err, null, 2));
        });
  }

  function writeToFile(token, data)
  {
    $.ajax(
      {
        beforeSend: function (jqXHR, settings) {
                jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
            },
        type: "POST",
        url: `${this_.baseUrl}/file/${data.uuid}/content/upload/`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(this_.data, null, 2)
      })
      .done(function(recv_data)
      {
        console.log(`Successfully wrote data to ${data.name}`);
      })
      .fail(function(err) {
          console.log("Something went wrong when writing to file: ", JSON.stringify(err, null, 2));
        });
  }
  return makeFile;
}

function hbpStorageSaveToFile(filename, data)
{
    // Retrieve the user auth informations
    var auth = hello.getAuthResponse('hbp');
    if (auth && auth.access_token)
    {
      accessStorage(auth.access_token,
                    saveDataToNewFile(filename, data));
    } else
    {
      console.log("data-source: Not Authenticated");
      console.log("user-id: Please login first");
    }
}
