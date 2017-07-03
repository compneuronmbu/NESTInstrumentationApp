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

var controls;

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
var newDevicePos = [0.0, 0.15, -0.15, 0.3, -0.3];
var newDeviceIndex = 0;

var circle_objects = [];

var serverUpdateEvent;
var serverUpdatePlotEvent;

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

    controls = new Controls( circle_objects, camera, renderer.domElement );

    serverUpdateEvent = new EventSource("/simulationData");
    serverUpdateEvent.onmessage = handleMessage;

    serverUpdatePlotEvent = new EventSource("/simulationPlotData");
    serverUpdatePlotEvent.onmessage = getPlotEvents;

    //render();
}

function handleMessage(e)
{
    var recordedData = JSON.parse(e.data);
    // console.log(recordedData);
    var t;
    for (var device in recordedData)
    {
        for (var gid in recordedData[device])
        {
            t = recordedData[device][gid][0];
        }
    }
    $("#infoconnected").html( "Simulating | " + t.toString() + " ms" );
    var spiked = colorFromSpike(recordedData);
    colorFromVm(recordedData, spiked);

    for (var layer in layer_points)
    {
        layer_points[layer].points.geometry.attributes.customColor.needsUpdate = true;
    }
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
    // TODO: sjekk max funksjon!
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
    // TODO: ta fra stylesheet
    var rectangleButtoncss = $("#rectangleButton");
    rectangleButtoncss.css({backgroundColor: '#FF6633'});
    var ellipticalButtoncss = $("#ellipticalButton");
    ellipticalButtoncss.css({backgroundColor: '#F1EEEC'});

    selectedShape = 'Rectangle';
}
function makeEllipticalShape()
{
    var rectangleButtoncss = $("#rectangleButton");
    rectangleButtoncss.css({backgroundColor: '#F1EEEC'});
    var ellipticalButtoncss = $("#ellipticalButton");
    ellipticalButtoncss.css({backgroundColor: '#FF6633'});

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

function colorFromVm(response, spiked)
{
    var time = 0;
    var V_m = 0;
    var point;
    for (var device in response)
    {
        var deviceModel = device.slice(0, device.lastIndexOf("_"));
        if (deviceModel === "voltmeter")
        {
            for (gid in response[device])
            {
                if (spiked.indexOf(gid) === -1)  // if GID did not spike
                {
                    point = getGIDPoint(gid);
                    V_m = response[device][gid][1];
                    colorVm = mapVmToColor(V_m, -70., -50.);

                    var points = layer_points[point.layer].points;
                    var colors = points.geometry.getAttribute("customColor").array;

                    colors[ point.pointIndex ]     = colorVm[0];
                    colors[ point.pointIndex + 1 ] = colorVm[1];
                    colors[ point.pointIndex + 2 ] = colorVm[2];
                    //points.geometry.attributes.customColor.needsUpdate = true;
                }
            }
        }
    }
}

function colorFromSpike(response)
{
    var time = 0;
    var V_m = 0;
    var point;
    var spikedGIDs = [];
    for (var device in response)
    {
        var deviceModel = device.slice(0, device.lastIndexOf("_"));
        if (deviceModel === "spike_detector")
        {
            for (gid in response[device])
            {
                point = getGIDPoint(gid);
                colorSpike = [0.9, 0.0, 0.0];

                var points = layer_points[point.layer].points;
                var colors = points.geometry.getAttribute("customColor").array;

                colors[ point.pointIndex ]     = colorSpike[0];
                colors[ point.pointIndex + 1 ] = colorSpike[1];
                colors[ point.pointIndex + 2 ] = colorSpike[2];
                //points.geometry.attributes.customColor.needsUpdate = true;
                spikedGIDs.push(gid);
            }
        }
    }
    return spikedGIDs;
}

function mapVmToColor(Vm, minVm, maxVm)
{
    var clampedVm;
    clampedVm = (Vm < minVm) ? minVm : Vm;
    clampedVm = (Vm > maxVm) ? maxVm : Vm;
    var colorRG = (clampedVm - minVm) / (maxVm - minVm);
    return [colorRG, colorRG, 1.0];
}

function resetBoxColors()
{
    for (device in deviceBoxMap)
    {
        for (i in deviceBoxMap[device].connectees)
        {
            deviceBoxMap[device].connectees[i].updateColors();
        }
    }
    
}

function makeProjections()
{
    var projections = {};
    projections['internal'] = modelParameters.projections;
    $("#infoconnected").html( "Gathering selections to be connected ..." );
    for (device in deviceBoxMap)
    {
      projections[device] = {
          specs: deviceBoxMap[device].specs,
          connectees: []
      };
      for (i in deviceBoxMap[device].connectees)
      {
          projections[device].connectees.push(deviceBoxMap[device].connectees[i].getSelectionInfo())
      }
    }
    return projections;
}

function makeConnections()
{
  // create object to be sent
  var projections = makeProjections();
  console.log(projections);

  $("#infoconnected").html( "Connecting ..." );
  // send selected connections
  $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/connect",
      data: JSON.stringify({network: modelParameters,
                            synapses: synModels,
                            projections: projections}),
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
    var projections = makeProjections();

    makeDevicePlot();

    $("#infoconnected").html( "Simulating ..." );

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "/simulate",
        data: JSON.stringify({network: modelParameters,
                      synapses: synModels,
                      projections: projections,
                      time: "100"}),
        dataType: "json"
        }).done(function(data){
              console.log("Simulation finished");
              $("#infoconnected").html( "Simulation finished" );
            });

}

function streamSimulate()
{
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "/streamSimulate",
        data: JSON.stringify({network: modelParameters,
                      synapses: synModels,
                      projections: makeProjections(),
                      time: "10000"}),
        dataType: "json"
        }).done(function(data)
           {
                console.log("Simulation started successfully");
           });
}

function abortSimulation()
{
    $.ajax({
        url: "/abortSimulation",
        }).done(function(data)
           {
                console.log(data);
                resetBoxColors();
           });
}

function saveSelection()
{
    //TODO: velge hvilken fil man vil lagre til
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
      deviceModel = deviceBoxMap[device].specs.model;
      projections[device] = {
          specs: deviceBoxMap[device].specs,
          connectees: []
      };
      for (i in deviceBoxMap[device].connectees)
      {
          projections[device].connectees.push(deviceBoxMap[device].connectees[i].getInfoForSaving())
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
    console.log(inputObj)
    var IDsCreated = [];
    for (device in inputObj.projections)
    {
        var deviceModel = inputObj.projections[device].specs.model;
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
            console.log(deviceBoxMap)
            deviceBoxMap[device].connectees.push(box);
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

function makeDevice( device, col, map, params={} )
{
    var geometry = new THREE.CircleBufferGeometry( 0.05, 32 );
    geometry.computeBoundingSphere(); // needed for loading
    var material = new THREE.MeshBasicMaterial( { color: col, map: map} );
    var circle = new THREE.Mesh( geometry, material );
    var deviceName = device + "_" + String( deviceCounter++ );
    circle.name = deviceName;

    circle.position.y = newDevicePos[newDeviceIndex];
    newDeviceIndex = (newDeviceIndex + 1 === newDevicePos.length) ? 0 : ++newDeviceIndex;

    scene.add( circle );
    circle_objects.push( circle );

    controls.deviceInFocus = circle;
    controls.makeOutline(controls.deviceInFocus);

    deviceBoxMap[deviceName] = {specs: {model: device,
                                        params: params},
                                connectees: []};
}

function makeStimulationDevice( device )
{
    console.log("making stimulation device of type", device)
    var col = 0xB28080
    //var map = new THREE.TextureLoader().load( "static/js/textures/current_source_white.png" );
    var map = new THREE.TextureLoader().load( "static/js/textures/poisson.png" );
    var params = { rate: 70000.0 }
    makeDevice( device, col, map, params );
}

function makeRecordingDevice( device )
{
    console.log("making recording device of type", device)
    if (device === "voltmeter")
    {
        var col = 0xBDB280;
        var map = new THREE.TextureLoader().load( "static/js/textures/voltmeter.png" );
    }
    else if (device === "spike_detector")
    {
        var col = 0x809980;
        var map = new THREE.TextureLoader().load( "static/js/textures/spike_detector.png" );
    }
    else
    {
        var col = 0xBDB280;
        var map = new THREE.TextureLoader().load( "static/js/textures/recording_device.png" );
    }
    
    makeDevice( device, col, map );
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
