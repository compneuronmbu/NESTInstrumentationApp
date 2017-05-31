/**
* Script
*
*
*/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;
var marquee = $("#select-square");
var camera, scene, renderer, material;

var number_of_layers = 0;

var layer_points = {};

var cameraControls;

var mouseUp = true;
var mouseDown = false;
var mouseCoords = { x: 0, y: 0 };
var mRelPos = { x: 0, y: 0 };

var modelParameters;
var selectionCollection = {selections: []};
var bounds;
var layerSelected = "";

var nSelected = 0;

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
    
    //var layers_info;
    var xmlReq = new XMLHttpRequest();
    //xmlReq.onload = function() {
    xmlReq.onreadystatechange = function() {
        if (xmlReq.readyState == 4 && xmlReq.status == 200) {
            modelParameters = JSON.parse(this.responseText);
            initLayers(modelParameters);
        }
    };
    xmlReq.open("get", "static/examples/brunel_converted.json", true);
    xmlReq.send();
    
    // RENDERER
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( container.clientWidth, container.clientHeight );

  container.appendChild( renderer.domElement );
  
  // CONTROLS
  //cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  //cameraControls.target.set( 0, 0, 0 );
  //cameraControls.addEventListener( 'change', render );
  
  document.addEventListener( 'mousedown', onMouseDown );
  document.addEventListener( 'mousemove', onMouseMove );
  document.addEventListener( 'mouseup', onMouseUp );
  
  window.addEventListener( 'resize', onWindowResize, false );

    //render();
}


// Display layers
function initLayers( layers_info )
{
    var layers = layers_info.layers;

    for ( var layer in layers )
    {
        if (layers.hasOwnProperty(layer))
        {
            if (layers[layer].name.toLowerCase().indexOf("generator") === -1 &&
                layers[layer].name.toLowerCase().indexOf("detector") === -1 &&
                layers[layer].name.toLowerCase().indexOf("meter") === -1 )
            {
                number_of_layers++;
            }
        }
    }

    if ( number_of_layers >12 )
    {
        window.alert( "Please reconsider the number of layers. The app is constructed to properly display at most 12 layers." );
    }

    var no_rows = Math.round(Math.sqrt(number_of_layers));
    var no_cols = Math.ceil(Math.sqrt(number_of_layers));

    var offsett_x = ( number_of_layers > 1 ) ? -0.6*(no_cols - 1) : 0.0;
    var offsett_y = 0.0;
    var i = 1;

    for ( var layer in layers )
    {
        if (layers.hasOwnProperty(layer))
        {
            if (layers[layer].name.toLowerCase().indexOf("generator") === -1 &&
                layers[layer].name.toLowerCase().indexOf("detector") === -1 &&
                layers[layer].name.toLowerCase().indexOf("meter") === -1 )
            {
                // Not sure if this is the best way. Could also do
                // points: new initPoints( layers[layer].neurons, offsett_x, offsett_y ),
                // but then I think we would have to rewrite some of the code below.
                layer_points[layers[layer].name] =
                {
                    points: initPoints( layers[layer].neurons, offsett_x, offsett_y ),
                    offsetts: {x: offsett_x, y: offsett_y}
                };

                if ( i % no_cols == 0 )
                {
                    offsett_x = -0.6*(no_cols - 1);
                    offsett_y += -1.2;
                }
                else
                {
                    offsett_x += 0.6*2;
                }
                ++i;
            }
        }
    }

//    console.log(layer_points);
    camera.position.set( 0, -0.6*no_rows + 0.6, no_rows + 1.5 );

    render();
    make_layer_names();
}


function initPoints( neurons, offsett_x, offsett_y )
{
    var geometry = new THREE.BufferGeometry();
    
    var positions = new Float32Array( neurons.length * 3 );
    var colors = new Float32Array( neurons.length * 3 );
    
    var i = 0;
    for (var neuron in neurons)
    {
        positions[ i ] = neurons[neuron].x + offsett_x;
        positions[ i + 1 ] = neurons[neuron].y + offsett_y;
        positions[ i + 2 ] = 0;
        
        colors[ i ]     = color.r;
        colors[ i + 1 ] = color.g;
        colors[ i + 2 ] = color.b;
        
        i += 3;
    }

    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

    geometry.computeBoundingSphere();

    material = new THREE.PointsMaterial( { size: 0.01, vertexColors: THREE.VertexColors } );

    points = new THREE.Points( geometry, material );
    
    scene.add( points );

    return points;
}


function make_layer_names()
{
    var center;
    var bounding_radius;
    var name_pos;
    var screenCenter;

    for ( var layer_name in layer_points )
    {
        if (layer_points.hasOwnProperty(layer_name))
        {
            center = layer_points[layer_name].points.geometry.boundingSphere.center;
            bounding_radius = layer_points[layer_name].points.geometry.boundingSphere.radius;

            name_pos = {
                x: center.x,
                y: center.y + bounding_radius - 0.1,
                z: center.z
            };

            screenCenter = toScreenXY(name_pos);
            screenCenter.y = container.clientHeight - screenCenter.y;

            var text = document.createElement('div');
            text.style.position = 'absolute';
            text.style.width = 100;
            text.style.height = 100;
            text.style.color = "white";
            text.style.fontSize = 18 + 'px'
            text.innerHTML = layer_name;
            text.style.top = screenCenter.y + 'px';
            text.style.left = screenCenter.x + 'px';
            document.body.appendChild(text);
        }
    }
}


// Selection
function resetMarquee ()
{
  mouseUp = true;
  mouseDown = false;
  marquee.fadeOut();
  marquee.css({width: 0, height: 0});
  mouseDownCoords.x = 0;
  mouseDownCoords.y = 0;
  mRelPos = { x: 0, y: 0 };
  layerSelected = "";
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
    } else
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


function toScreenXY (point_pos) {

    var point_vector = new THREE.Vector3(point_pos.x, point_pos.y, point_pos.z);
    var projScreenMat = new THREE.Matrix4();
    projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
    point_vector.applyMatrix4(projScreenMat);

    return { x: ( point_vector.x + 1 ) * renderer.getSize().width / 2,
        y: renderer.getSize().height - ( - point_vector.y + 1) * renderer.getSize().height / 2 };
}


function selectPoints()
{
    var currentMouse = {};
    var mouseDownCorrected = {};
    var units;
    //var bounds;
    var inside = false;
    var selectedUnits = [];
    var dupeCheck = {};
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
            var colors = points.geometry.getAttribute("color").array;
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
                    
                    
                    points.geometry.attributes.color.needsUpdate = true;
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


function makeConnections()
{
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
}


// Events
function onMouseDown( event )
{
    //event.preventDefault();
    //if (controls.shiftDown === true) return;
    if (event.target.localName === "canvas")
    {
        mouseDown = true;
        mouseDownCoords = {};

        mouseDownCoords.x = event.clientX;
        mouseDownCoords.y = event.clientY;
    }

}


function onMouseMove( event )
{
    //event.preventDefault();
    event.stopPropagation();

    // make sure we are in a select mode.
    if(mouseDown){
        marquee.fadeIn();
        mRelPos.x = event.clientX - mouseDownCoords.x;
        mRelPos.y = event.clientY - mouseDownCoords.y;

        // square variations
        // (0,0) origin is the TOP LEFT pixel of the canvas.
        //
        //  1 | 2
        // ---.---
        //  4 | 3
        // there are 4 ways a square can be gestured onto the screen.  the following detects these four variations
        // and creates/updates the CSS to draw the square on the screen
        if (mRelPos.x < 0 && mRelPos.y < 0)
        {
          marquee.css({left: event.clientX + 'px',
                       width: -mRelPos.x + 'px',
                       top: event.clientY + 'px',
                       height: -mRelPos.y + 'px'});
        } else if ( mRelPos.x >= 0 && mRelPos.y <= 0)
        {
          marquee.css({left: mouseDownCoords.x + 'px',
                       width: mRelPos.x + 'px',
                       top: event.clientY,
                       height: -mRelPos.y + 'px'});
        } else if (mRelPos.x >= 0 && mRelPos.y >= 0)
        {
          marquee.css({left: mouseDownCoords.x + 'px',
                       width: mRelPos.x + 'px',
                       height: mRelPos.y + 'px',
                       top: mouseDownCoords.y + 'px'});
        } else if (mRelPos.x < 0 && mRelPos.y >= 0)
        {
          marquee.css({left: event.clientX + 'px',
                       width: -mRelPos.x + 'px',
                       height: mRelPos.y + 'px',
                       top: mouseDownCoords.y + 'px'});
        }
    }
}


function onMouseUp( event )
{
    //event.preventDefault();
    event.stopPropagation();
    //if (controls.shiftDown === true) return;

    if (mouseDown)
    {
        selectPoints();
        // If we didn't click on a layer, it will cause problems further down
        if (layerSelected === "")
        {
          resetMarquee();
          return;
        }
        var selectionInfo = makeSelectionInfo();
        selectionCollection.selections.push(selectionInfo);
        console.log(selectionCollection)

        // make network
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

        // send selection
        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/selector",
            data: JSON.stringify(selectionInfo),
            success: function (data) {
                console.log(data.title);
                console.log(data.article);
            },
            dataType: "json"
        });
        resetMarquee();
        requestAnimationFrame( render );
    }
}


function onWindowResize()
{
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( container.clientWidth, container.clientHeight );
}


function render()
{
    renderer.render( scene, camera );
}
