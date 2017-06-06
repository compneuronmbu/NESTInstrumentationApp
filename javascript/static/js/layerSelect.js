/**
* Script
*
*
*/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container
var camera, scene, renderer, material;

var layer_points = {};

var mouseDownCoords = { x: 0, y: 0};
var mRelPos = { x: 0, y: 0 };

var modelParameters;
var selectionCollection = {selections: []};
var bounds;
var layerSelected = "";
var neuronModels = ['All'];
var synModels = [];
var layerNamesMade = false;

var nSelected = 0;

var circle_objects = [];
var line_objects = [];
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
  
    // POINTS
    color = new THREE.Color();
    color.setRGB( 0.5, 0.5, 0.5 );
    
    var xmlReq = new XMLHttpRequest();
    xmlReq.onreadystatechange = function() {
        if (xmlReq.readyState == 4 && xmlReq.status == 200) {
            modelParameters = JSON.parse(this.responseText);
            Brain( camera, scene );
        }
    };
    xmlReq.open("get", "static/examples/brunel_converted.json", true);
    xmlReq.send();

    // RENDERER
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.clientWidth, container.clientHeight );

    container.appendChild( renderer.domElement );

    Controls( circle_objects, line_objects, camera, renderer.domElement );

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

// Finds the lower_left and upper_right coordinates of the selected square
function findBounds (pos1, pos2)
{
    var lower_left = {};
    var upper_right = {};

    if( pos1.x < pos2.x )
    {
        lower_left.x = pos1.x;
        upper_right.x = pos2.x;
    }
    else
    {
        lower_left.x = pos2.x;
        upper_right.x = pos1.x;
    }

    if ( pos1.y < pos2.y )
    {
        lower_left.y = pos1.y;
        upper_right.y = pos2.y;
    }
    else
    {
        lower_left.y = pos2.y;
        upper_right.y = pos1.y;
    }
    return ({lower_left: lower_left, upper_right: upper_right});
}

// Takes a position and detect if it is within the boundary box defined by findBounds(..)
function withinBounds(pos, bounds)
{
    var ll = bounds.lower_left;
    var ur = bounds.upper_right;

    if ( (pos.x >= ll.x) && (pos.x <= ur.x) && (pos.y >= ll.y) && (pos.y <= ur.y) )
    {
        return true;
    }
    return false;
}

function selectPoints()
{
    var currentMouse = {};
    var mouseDownCorrected = {};
    var mouseUpCoords = {};
    var xypos;
    var nSelectedOld = nSelected;

    mouseDownCorrected.x = mouseDownCoords.x;
    mouseDownCorrected.y = renderer.getSize().height - mouseDownCoords.y;

    mouseUpCoords.x = mRelPos.x + mouseDownCorrected.x;
    mouseUpCoords.y = -mRelPos.y + mouseDownCorrected.y;

    bounds = findBounds(mouseUpCoords, mouseDownCorrected);

    for ( var layer_name in layer_points )
    {
        if (layer_points.hasOwnProperty(layer_name))
        {
            var points = layer_points[layer_name].points;
            var colors = points.geometry.getAttribute("customColor").array;
            var positions = points.geometry.getAttribute("position").array;
            
            for (var i = 0; i < positions.length; i += 3)
            {
                var p = {};
                p.x = positions[i];
                p.y = positions[i + 1];
                p.z = positions[i + 2];
                xypos = toScreenXY(p);

                if (withinBounds(xypos, bounds))
                {
                    //color.setRGB(0.7, 0.0, 0.0);
                    if (getSelectedRadio('endpoint') === 'Source')
                    {
                      colors[ i ]     = 1.0;
                      colors[ i + 1 ] = 0.0;
                      colors[ i + 2 ] = 1.0;
                    } else
                    {
                      colors[ i ]     = 0.85;
                      colors[ i + 1 ] = 0.65;
                      colors[ i + 2 ] = 0.13;
                    }
                    
                    
                    points.geometry.attributes.customColor.needsUpdate = true;
                    nSelected += 1;

                    if (layerSelected === "" )
                    {
                        layerSelected = layer_name;
                    }
                }
            }
            if (nSelected != nSelectedOld)
            {
                $("#infoselected").html( nSelected.toString() + " selected" );
            }
        }
    }
}

function getSelectedDropDown(id)
{
    var dd = document.getElementById(id);
    return dd.options[dd.selectedIndex].text;
}

function getSelectedRadio(id)
{
    var query = 'input[name="' + id + '"]:checked';
    return $(query).val();
}

function makeSelectionInfo()
{
    var selectedBBoxXYZ = {
        "ll": toObjectCoordinates(bounds.lower_left),
        "ur": toObjectCoordinates(bounds.upper_right) };

    var selectionBox = {
        "ll": {
            x: selectedBBoxXYZ.ll.x - layer_points[layerSelected].offsetts.x,
            y: -(selectedBBoxXYZ.ll.y - layer_points[layerSelected].offsetts.y),
            z: 0
        },
        "ur": {
            x: selectedBBoxXYZ.ur.x - layer_points[layerSelected].offsetts.x,
            y: -(selectedBBoxXYZ.ur.y - layer_points[layerSelected].offsetts.y),
            z: 0
        }
    }

    selectedProjection = getSelectedDropDown("projections");
    selectedNeuronType = getSelectedDropDown("neuronType");
    selectedSynModel = getSelectedDropDown("synapseModel");
    selectedShape = getSelectedRadio("maskShape");
    selectedEndpoint = getSelectedRadio("endpoint");


    var selectionInfo = {
        name: layerSelected,
        selection: selectionBox,
        projection: selectedProjection,
        neuronType: selectedNeuronType,
        synModel: selectedSynModel,
        maskShape: selectedShape,
        endpoint: selectedEndpoint
    }

    return selectionInfo;
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

  $("#infoconnected").html( "Connecting ..." );
  // send selected connections
  $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/connect",
      data: JSON.stringify(selectionCollection),
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
              $("#infoconnected").html( data.connections.length.toString() + " connection(s)" );
            });
}

function makeTail()
{
    var line_material = new THREE.LineBasicMaterial({ color: 0x809980*1.1, linewidth: 3 });
    var line_geometry = new THREE.BufferGeometry();
    var vertices = new Float32Array( [
        0.0, -0.05, 0.0,
        0.0, -0.20, 0.0
    ] );

    line_geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    var line = new THREE.Line(line_geometry, line_material);

    return line;
}

function makeStimulationDevice( device )
{
    console.log("making stimulation device of type", device)
    var col = 0xB28080
    var geometry = new THREE.CircleBufferGeometry( 0.05, 32 );
    var material = new THREE.MeshBasicMaterial( { color: col } );
    var circle = new THREE.Mesh( geometry, material );

    var line = makeTail();

    circle.children = line;

    scene.add( circle );
    scene.add( line );

    circle_objects.push( circle );
    line_objects.push( line );
}

function makeRecordingDevice( device )
{
    console.log("making recording device of type", device)
    var col = ( device === "voltmeter" ) ? 0xBDB280 : 0x809980;
    var geometry = new THREE.CircleBufferGeometry( 0.05, 32 );
    var material = new THREE.MeshBasicMaterial( { color: col } );
    var circle = new THREE.Mesh( geometry, material );
    
    var line = makeTail();

    circle.children = line;

    scene.add( circle );
    scene.add( line );

    circle_objects.push( circle );
    line_objects.push( line );
}

function render()
{
    for ( var device in stimulationButtons )
    {
        if ( stimulationButtons[device] === true )
        {
            makeStimulationDevice(device);
            stimulationButtons[device] = false;
        }
    }
    for ( var device in recordingButtons )
    {
        if ( recordingButtons[device] === true )
        {
            makeRecordingDevice(device);
            recordingButtons[device] = false;
        }
    }

    renderer.render( scene, camera );
    requestAnimationFrame( render );

    if (!layerNamesMade)
    {
        make_layer_names();
        layerNamesMade = true;
    }
}
