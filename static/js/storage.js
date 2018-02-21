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

function hbpStorage()
{
  storage_this = this;
  storage_this.collabUrl = "https://services.humanbrainproject.eu/collab/v0/collab/context";
  storage_this.baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";

  // Retrieve the user auth informations
  var auth = hello.getAuthResponse('hbp');
  if (auth && auth.access_token)
  {
    storage_this.token = auth.access_token;
    getCollabId();
    // getCollabUuid();

    // accessStorage(auth.access_token,
    //               saveDataToNewFile(filename, data));
  } else
  {
    console.log("data-source: Not Authenticated");
    console.log("user-id: Please login first");
  }

  function getCollabId()
  {
    var ctx = extractCtx();
    $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
        jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
      },
      type: "GET",
      url: `${storage_this.collabUrl}/${ctx}/`,
    }
    )
    .done(function(data)
    {
      // Update the DOM with the context object retrieved by the web service.
      storage_this.id = data.collab.id
      console.log(`Got collab id: ${storage_this.id}`);
      getCollabUuid();
    })
    .fail(function(err) {
      console.log("Something went wrong when getting collab id: ", JSON.stringify(err, null, 2));
    });
  }

  function getCollabUuid()
  {
    $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
        jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
      },
      type: "GET",
      url: `${storage_this.baseUrl}/entity/?path=/${storage_this.id}/`,
    }
    )
    .done(function(data)
    {
      storage_this.uuid = data.uuid;
      console.log(`Got collab UUID: ${storage_this.uuid}`);
      // callback(token, new_data);
    })
    .fail(function(err) {
      console.log("Something went wrong when getting collab UUID: ", JSON.stringify(err, null, 2));
    });
  }

  function saveToFile(filename, data)
  {
    this_ = this;
    this_.filename = filename;
    this_.data = data;

    function makeAndWriteFile()
    {
      $.ajax(
      {
        beforeSend: function (jqXHR, settings) {
          jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
        },
        type: "POST",
        url: `${storage_this.baseUrl}/file/`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({
          'name': `${this_.filename}.json`,
          'content_type': 'application/json',
          'parent': storage_this.uuid
        }, null, 2)
      })
      .done(function(data)
      {
        console.log(`Created new file: ${data.name}`);
        console.log(data);
        writeToFile(data);
      })
      .fail(function(err) {
        console.log("Something went wrong when making file: ", JSON.stringify(err, null, 2));
      });
    }

    function writeToFile(data)
    {
      $.ajax(
      {
        beforeSend: function (jqXHR, settings) {
          jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
        },
        type: "POST",
        url: `${storage_this.baseUrl}/file/${data.uuid}/content/upload/`,
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(this_.data, null, 2)
      })
      .done(function(new_data)
      {
        console.log(`Successfully wrote data to ${data.name}`);
      })
      .fail(function(err) {
        console.log("Something went wrong when writing to file: ", JSON.stringify(err, null, 2));
      });
    }

    // Retrieve the user auth informations
    if (storage_this.token)
    {
      makeAndWriteFile();
    } else
    {
      console.log("data-source: Not Authenticated");
      console.log("user-id: Please login first");
    }
  }

  return {
    saveToFile: saveToFile
  }
}
