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
      queryPath(storage_this.id, (data) => {
        storage_this.uuid = data.uuid;
        console.log(`Got collab UUID: ${storage_this.uuid}`);
      });
    })
    .fail(function(err) {
      console.log("Something went wrong when getting collab id: ", JSON.stringify(err, null, 2));
    });
  }

  function queryPath(path, callback)
  {
    $.ajax(
    {
      beforeSend: function (jqXHR, settings) {
        jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
      },
      type: "GET",
      url: `${storage_this.baseUrl}/entity/?path=/${path}/`,
    }
    )
    .done(function(data)
    {
      // storage_this.uuid = data.uuid;
      callback(data);
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

  function loadFromFile(filename, callback)
  {
    this_ = this;
    this_.callback = callback;

    function getFileContent(uuid)
    {
      console.log(`Trying to get content from file with uuid: ${uuid}`);
      // 0dd90ebc-168c-421c-a41c-94b1732fd05c
      $.ajax(
      {
        beforeSend: function (jqXHR, settings) {
          jqXHR.setRequestHeader('Authorization', 'Bearer ' + storage_this.token);
          // jqXHR.setRequestHeader('If-None-Match', '');
        },
        type: "GET",
        url: `${storage_this.baseUrl}/file/${uuid}/content/`,
      }
      )
      .done(function(data)
      {
        // storage_this.uuid = data.uuid;
        console.log('Got data from file:');
        this_.callback(data);
        // callback(token, new_data);
      })
      .fail(function(err) {
        console.log("Something went wrong when getting file content: ", JSON.stringify(err, null, 2));
      });
    }

    if (storage_this.token)
    {
      queryPath(`${storage_this.id}/${filename}.json`, (data)=>{getFileContent(data.uuid)})
    } else
    {
      console.log("data-source: Not Authenticated");
      console.log("user-id: Please login first");
    }
  }
  return {
    saveToFile: saveToFile,
    loadFromFile: loadFromFile
  }
}

function getFilesInFolder(token, uuid)
{
  baseUrl = "https://services.humanbrainproject.eu/storage/v1/api";
  $.ajax(
  {
    beforeSend: function (jqXHR, settings) {
            jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
        },
    type: "GET",
    url: 'https://services.humanbrainproject.eu/storage/v1/api/folder/' + uuid + '/children/'
  })
  .done(function(recv_data)
  {
    file_dict = {}
    for ( count in recv_data.results )
    {
      if ( recv_data.results[count].entity_type === "file" )
      {
        file_dict[recv_data.results[count].name] = recv_data.results[count].uuid;
      }
    }
    console.log("FILE DICT", file_dict)

  })
  .fail(function(err) {
      console.log("Something went wrong when looking at folder: ", JSON.stringify(err, null, 2));
  });
}
