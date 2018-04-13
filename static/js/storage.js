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
      storage_this.id = data.collab.id;
      console.log(`Got collab id: ${storage_this.id}`);
      queryProjectId(storage_this.id, (data) => {
        storage_this.uuid = data.uuid;
        console.log(`Got collab UUID: ${storage_this.uuid}`);
      });
    })
    .fail(function(err) {
      console.log("Something went wrong when getting collab id: ", JSON.stringify(err, null, 2));
    });
  }

  function queryProjectId(id, callback)
  {
    $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
        jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
      },
      type: "GET",
      url: `${storage_this.baseUrl}/project/?collab_id=${id}`,
    }
    )
    .done(function(data)
    {
      if (data.count > 1)
      {
        throw "Ambiguous collab id.";
      }
      callback(data.results[0]);
    })
    .fail(function(err) {
      console.log("Something went wrong when getting project data: ", JSON.stringify(err, null, 2));
    });
  }

  function saveToFile(filename, data, callback)
  {
    this_ = this;
    this_.filename = filename;
    this_.data = data;
    this_.callback = callback;

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
        this_.callback();
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

  function loadFromFile(filename, callback)
  {
    this_ = this;
    this_.callback = callback;

    function getFileContent(uuid)
    {
      console.log(`Trying to get content from file with uuid: ${uuid}`);
      $.ajax(
      {
        beforeSend: function (jqXHR, settings) {
          jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
        },
        type: "GET",
        url: `${storage_this.baseUrl}/file/${uuid}/content/`,
      }
      )
      .done(function(data)
      {
        console.log('Got data from file: ', data);
        this_.callback(data);
      })
      .fail(function(err) {
        console.log("Something went wrong when getting file content: ", JSON.stringify(err, null, 2));
      });
    }

    if (storage_this.token)
    {
      // TODO: If we only use uuid as input (not filename), don't use nested function.
      getFileContent(filename);
    } else
    {
      console.log("data-source: Not Authenticated");
      console.log("user-id: Please login first");
    }
  }

  function getFilesInFolder(callback, fail_callback)
  {
    $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
              jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
          },
      type: "GET",
      url: storage_this.baseUrl + '/folder/' + storage_this.uuid + '/children/'
    })
    .done(function(recv_data)
    {
      file_dict = {};
      for ( var count in recv_data.results )
      {
        if ( recv_data.results[count].entity_type === "file" )
        {
          file_dict[recv_data.results[count].name] = recv_data.results[count].uuid;
        }
      }
      console.log("FILE DICT", file_dict);
      callback(file_dict);
    })
    .fail(function(err) {
        console.log("Something went wrong when looking at folder: ", JSON.stringify(err, null, 2));
        fail_callback("ERROR: " + err.responseJSON[0]);
    });
  }

  return {
    saveToFile: saveToFile,
    loadFromFile: loadFromFile,
    getFilesInFolder: getFilesInFolder
  };
}
