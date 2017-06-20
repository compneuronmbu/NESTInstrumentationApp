/**
* Script
*
*
*/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container
var camera, scene, renderer, material;

var outlineScene;
var outlineMaterial;
var outlineMesh;

var layer_points = {};

var mouseDownCoords = { x: 0, y: 0 };
var mRelPos = { x: 0, y: 0 };

var modelParameters;
var layerSelected = "";
var neuronModels = ['All'];
var synModels = [];
var selectedShape = "Rectangle";
var layerNamesMade = false;
var selectionBoxArray = [];
var deviceBoxMap = {};

var nSelected = 0;
var deviceCounter = 1;
var uniqueID = 1;

var circle_objects = [];
var stimulationButtons = { "poissonGenerator": false };
var recordingButtons = { "spikeDetector": false, "voltmeter": false }; 


init();


function init()
{
    container = document.getElementById( 'main_body' );
    document.body.appendChild( container );

    // CAMERA
    camera = new THREE.PerspectiveCamera( 45, container.clientWidth / container.clientHeight, 0.5, 10 );
    scene = new THREE.Scene();
    outlineScene = new THREE.Scene();
  
    // POINTS
    color = new THREE.Color();
    color.setRGB( 0.5, 0.5, 0.5 );

    $.getJSON("/static/examples/brunel_converted.json", function ( data ) {
        modelParameters = data;
        Brain( camera, scene );
    });

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.clientWidth, container.clientHeight );
    renderer.autoClear = false;

    container.appendChild( renderer.domElement );

    Controls( circle_objects, camera, renderer.domElement );

    //render();
}

function toScreenXY (point_pos) {

    var point_vector = new THREE.Vector3(point_pos.x, point_pos.y, point_pos.z);
    var projScreenMat = new THREE.Matrix4();
    projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
    point_vector.applyMatrix4(projScreenMat);

    return { x: ( point_vector.x + 1 ) * renderer.getSize().width / 2,
        y: renderer.getSize().height - ( - point_vector.y + 1) * renderer.getSize().height / 2 };
}

function toObjectCoordinates( screenPos )
{
    var vector = new THREE.Vector3();

    vector.set(
        ( screenPos.x / container.clientWidth ) * 2 - 1,
        - ( screenPos.y / container.clientHeight ) * 2 + 1,
        0.5 );

    vector.unproject( camera );

    var dir = vector.sub( camera.position ).normalize();

    var distance = - camera.position.z / dir.z;

    var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

    return pos
}

// Finds the ll and ur coordinates of the selected square
function findBounds (pos1, pos2)
{
    var ll = {};
    var ur = {};

    if( pos1.x < pos2.x )
    {
        ll.x = pos1.x;
        ur.x = pos2.x;
    }
    else
    {
        ll.x = pos2.x;
        ur.x = pos1.x;
    }

    if ( pos1.y < pos2.y )
    {
        ll.y = pos1.y;
        ur.y = pos2.y;
    }
    else
    {
        ll.y = pos2.y;
        ur.y = pos1.y;
    }
    return ({ll: ll, ur: ur});
}

function makeRectangularShape()
{
    var rectangleButtoncss = $("#rectangleButton");
    rectangleButtoncss.css({backgroundColor: '#607d8b', border: 1 + 'px solid #999'});
    var ellipticalButtoncss = $("#ellipticalButton");
    ellipticalButtoncss.css({backgroundColor: '#609f9f', border: 0 + 'px'});

    selectedShape = 'Rectangle';
}
function makeEllipticalShape()
{
    var rectangleButtoncss = $("#rectangleButton");
    rectangleButtoncss.css({backgroundColor: '#609f9f', border: 0 + 'px'});
    var ellipticalButtoncss = $("#ellipticalButton");
    ellipticalButtoncss.css({backgroundColor: '#607d8b', border: 1 + 'px solid #999'});

    selectedShape = 'Ellipse';
}

function getSelectedDropDown(id)
{
    var dd = document.getElementById(id);
    return dd.options[dd.selectedIndex].value;
}

function getSelectedShape()
{
    return selectedShape;
}


function getGIDPoint(gid)
{
    /*
    * Gets layer and point index for a specified GID.
    */
    var minGID = 0;
    for (var l in layer_points)
    {
        minGID += 1;  // from the GID of the layer
        var pos = layer_points[l].points.geometry.attributes.position;
        if (gid <= minGID + pos.count)
        {
            // point is in this layer
            var pointIndex = 3*(gid - minGID - 1);
            return {layer: l, pointIndex: pointIndex};
        }
        minGID += pos.count;
    }
}

function colorFromVm(response)
{
    var time = 0;
    var V_m = 0;
    var point;
    var prevPoints;
    var updateLayers = [];
    for (var device in response)
    {
        var deviceModel = device.slice(0, device.lastIndexOf("_"));
        if (deviceModel === "voltmeter")
        {
            for (gid in response[device])
            {
                point = getGIDPoint(gid);
                V_m = response[device][gid][1];
                colorVm = mapVmToColor(V_m, -70., -50.);

                var points = layer_points[point.layer].points;
                var colors = points.geometry.getAttribute("customColor").array;

                colors[ point.pointIndex ]     = colorVm[0];
                colors[ point.pointIndex + 1 ] = colorVm[1];
                colors[ point.pointIndex + 2 ] = colorVm[2];
                points.geometry.attributes.customColor.needsUpdate = true;
            }
        }
    }
}

function mapVmToColor(Vm, minVm, maxVm)
{
    var clampedVm;
    clampedVm = (Vm < minVm) ? minVm : Vm;
    clampedVm = (Vm > maxVm) ? maxVm : Vm;
    var colorRG = (clampedVm - minVm) / (maxVm - minVm);
    return [colorRG, colorRG, 1.0];
}


function makeNetwork()
{
  $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/network",
      data: JSON.stringify(modelParameters),
      success: function (data) {
          console.log(data.title);
          console.log(data.article);
      },
      dataType: "json"
  });
}

function makeConnections()
{
  $("#infoconnected").html( "Making network ..." );
  makeNetwork();
  // send synapse specifications
  $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/synapses",
      data: JSON.stringify(synModels),
      success: function (data) {
          console.log(data.title);
          console.log(data.article);
      },
      dataType: "json"
  });

  // create object to be sent
  var projections = {};
  projections['internal'] = modelParameters.projections;
  $("#infoconnected").html( "Gathering selections to be connected ..." );
  for (device in deviceBoxMap)
  {
    deviceModel = device.slice(0, device.lastIndexOf("_"));
    projections[device] = {
        specs: {
            model: deviceModel
        },
        connectees: []
    };
    for (i in deviceBoxMap[device])
    {
        projections[device].connectees.push(deviceBoxMap[device][i].getSelectionInfo())
    }
  }

  $("#infoconnected").html( "Connecting ..." );
  // send selected connections
  $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/connect",
      data: JSON.stringify(projections),
      success: function (data) {
          console.log(data.title);
          console.log(data.article);
      },
      dataType: "json"
  });
  getConnections();
}


function getConnections()
{
  $.getJSON("/connections",
            {
              input: "dummyData"
            }).done(function(data){
              $("#infoconnected").html( data.connections.toString() + " connection(s)" );
            });
}

function runSimulation()
{
    // Make the network and connections before simulating
    makeConnections();
    $("#infoconnected").html( "Simulating ..." );
    $.getJSON("/simulate",
            {
              time: "10000"
            }).done(function(data){
              console.log("Simulation finished");
              $("#infoconnected").html( "Simulation finished" );
            });

    // ping the server a few times
    for (var i = 0; i < 3; ++i)
    {
        $.getJSON("/ping").done(function(data){
                  console.log("Server responded");
                });
    }
}


function stream()
{
    makeConnections();
    var last_response_len = -1;
    $.ajax('/streamSimulate',
            {
                data: {time: "10000"},
                 xhrFields: {
                     onprogress: function(e)
                     {
                         var this_response, response = e.currentTarget.response;
                         if (last_response_len === -1)
                         {
                            this_response = response;
                            last_response_len = response.length;
                         }
                         else
                         {
                            this_response = response.substring(last_response_len);
                            last_response_len = response.length;
                         }
                         // console.log("##################")
                         var responseArray = this_response.split("|");
                         last_response = responseArray[responseArray.length - 2];
                         if (last_response !== "")
                         {
                             var this_responseJSON = JSON.parse(last_response);
                             colorFromVm(this_responseJSON);
                         }
                     }
                }
            }
            ).done(function(data)
           {
                // console.log("Complete response:", data);
           })
           console.log("Request sent");
}


function saveSelection()
{
    console.log("##################");
    console.log("    Selections");
    console.log("##################");
    console.log("deviceBoxMap", deviceBoxMap);
    console.log("circle_objects", circle_objects);
    console.log("selectionBoxArray", selectionBoxArray);
    console.log("##################");

    // create object to be saved
    var projections = {};
    for (device in deviceBoxMap)
    {
      deviceModel = device.slice(0, device.lastIndexOf("_"));
      projections[device] = {
          specs: {
              model: deviceModel
          },
          connectees: []
      };
      for (i in deviceBoxMap[device])
      {
          projections[device].connectees.push(deviceBoxMap[device][i].getInfoForSaving())
      }
    }
    console.log("projections", projections);

    dlObject = {projections: projections};
    jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dlObject));
    var dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute("href", jsonStr);
    dlAnchorElem.setAttribute("download", "connectionData.json");
    dlAnchorElem.click();
}

function loadSelection()
{
    document.getElementById('uploadAnchorElem').click();
}

function loadFromJSON(textJSON)
{
    var inputObj = JSON.parse( textJSON );
    var IDsCreated = [];
    for (device in inputObj.projections)
    {
        var deviceModel = device.slice(0, device.lastIndexOf("_"));
        if (deviceModel === "poisson_generator")
        {
            makeStimulationDevice( deviceModel );
        }
        else
        {
            makeRecordingDevice( deviceModel );
        }

        var target = circle_objects[circle_objects.length - 1];

        for (i in inputObj.projections[device].connectees)
        {
            var boxSpecs = inputObj.projections[device].connectees[i];

            // if not created yet, the box must be created
            if ( IDsCreated.indexOf(boxSpecs.uniqueID) === -1 )
            {
                IDsCreated.push(boxSpecs.uniqueID);
                var box = new SelectionBox( boxSpecs.ll, boxSpecs.ur, boxSpecs.maskShape );
                box.uniqueID = boxSpecs.uniqueID;

                // update our uniqueID count only if box.uniqueID is greater
                uniqueID = ( boxSpecs.uniqueID > uniqueID ) ? boxSpecs.uniqueID : uniqueID;
                
                box.layerName = boxSpecs.name;
                box.selectedNeuronType = boxSpecs.neuronType;
                box.selectedSynModel = boxSpecs.synModel;
                box.selectedShape = boxSpecs.maskShape;

                selectionBoxArray.push(box);
                box.makeBox();
            }
            // if the box is already created, it must be found
            else
            {
                for (i in selectionBoxArray)
                {
                    if (selectionBoxArray[i].uniqueID === boxSpecs.uniqueID)
                    {
                        var box = selectionBoxArray[i];
                        break;
                    }
                }
            }

            box.makeLine();
            var radius = target.geometry.boundingSphere.radius;
            box.setLineTarget(target.name);
            box.lineToDevice(target.position, radius, target.name);

            box.updateColors();

            deviceBoxMap[device].push(box);
        }
    }
}

function handleFileUpload( event )
{
    console.log("file uploaded")
    // TODO: need some checks here
    fr = new FileReader();
    var result;
    fr.onload = function (e) {
        loadFromJSON(fr.result);
    };
    fr.readAsText(event.target.files[0]);
}


function addDeviceToProjections( device )
{
    var deviceName = device + "_" + String(deviceCounter++);
    deviceBoxMap[deviceName] = [];
}

function makeStimulationDevice( device )
{
    console.log("making stimulation device of type", device)
    var col = 0xB28080
    var geometry = new THREE.CircleBufferGeometry( 0.05, 32 );
    geometry.computeBoundingSphere(); // needed for loading
    var map = new THREE.TextureLoader().load( "static/js/textures/current_source_white.png" );
    var material = new THREE.MeshBasicMaterial( { color: col, map: map} );
    var circle = new THREE.Mesh( geometry, material );
    circle.name = device + "_" + String(deviceCounter);

    scene.add( circle );
    circle_objects.push( circle );

    addDeviceToProjections( device );
}

function makeRecordingDevice( device )
{
    console.log("making recording device of type", device)
    var col = ( device === "voltmeter" ) ? 0xBDB280 : 0x809980;
    var geometry = new THREE.CircleBufferGeometry( 0.05, 32 );
    geometry.computeBoundingSphere(); // needed for loading
    var map = new THREE.TextureLoader().load( "static/js/textures/multimeter_white.png" );
    var material = new THREE.MeshBasicMaterial( { color: col, map: map } );
    var circle = new THREE.Mesh( geometry, material );
    circle.name = device + "_" + String(deviceCounter);

    scene.add( circle );
    circle_objects.push( circle );

    addDeviceToProjections( device );
}

function render()
{
    requestAnimationFrame( render );

    renderer.clear();
    renderer.render( outlineScene, camera );
    renderer.render( scene, camera );

    if (!layerNamesMade)
    {
        make_layer_names();
        layerNamesMade = true;
    }
}
