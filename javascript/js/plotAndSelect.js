/**
* Script
*
*
*/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;
var marquee = $("#select-square");
var camera, scene, renderer, materials;

var number_of_layers = 0;
var offsett = 0.6;

//var positions;
//var colors;

var cameraControls;
var effectController;

var mouseUp = true;
var mouseDown = false;
var mouseCoords = { x: 0, y: 0 };
var mRelPos = { x: 0, y: 0 };

var nSelected = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;


init();

function init()
{
    //container = document.createElement( 'div' );
    container = document.getElementById( 'main_body' );
	document.body.appendChild( container );

    // CAMERA
	camera = new THREE.PerspectiveCamera( 45, container.clientWidth / container.clientHeight, 1, 8000 );
	camera.position.set( 0, 0, 2.5 );

	scene = new THREE.Scene();
	
	// POINTS
    var layers_info = JSON.parse(my_json); // TODO: Er det meningen at model etc, skal være her og?
    var layers = layers_info.layers;
    console.log(layers);
    console.log(layers.Excitatory);
    console.log(container.clientWidth)
    
    color = new THREE.Color();
    color.setRGB( 0.9, 0.9, 0.9 );

    initPoints( layers.Excitatory.neurons, offsett )
    initPoints( layers.Inhibitory.neurons, -offsett )

    for ( layer in layers )
    {
        if (layer.toLowerCase().indexOf("generator") === -1 &&
            layer.toLowerCase().indexOf("detector") === -1 &&
            layer.toLowerCase().indexOf("meter") === -1 )
        {
            console.log(layer);
            number_of_layers++;
        }
    }


    
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

    render();
}

function initPoints( neurons, offsett )
{
    var geometry = new THREE.BufferGeometry();
    
    var positions = new Float32Array( Object.keys(neurons).length * 3 );
    var colors = new Float32Array( Object.keys(neurons).length * 3 );
    
    var i = 0;
    for (var neuron in neurons)
    {
        if (neurons.hasOwnProperty(neuron))
        {
            positions[ i ] = neurons[neuron].x + offsett;
            positions[ i + 1 ] = neurons[neuron].y;
            positions[ i + 2 ] = 0;
            
            colors[ i ]     = color.r;
            colors[ i + 1 ] = color.g;
            colors[ i + 2 ] = color.b;
            
            i += 3;
        }
    }

    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

    geometry.computeBoundingSphere();

    material = new THREE.PointsMaterial( { size: 0.01, vertexColors: THREE.VertexColors } );

    points = new THREE.Points( geometry, material );
    
    scene.add( points );
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
}

// takes the mouse up and mouse down positions and calculates an origin
// and delta for the square.
// this is compared to the unprojected XY centroids of the cubes.
function findBounds (pos1, pos2)
{
    // calculating the origin and vector.
    //var origin = {},
    //delta = {};
    var lower_left = {};
    var upper_right = {};

    if(pos1.x < pos2.x) {
        lower_left.x = pos1.x;
        upper_right.x = pos2.x;
    } else {
        lower_left.x = pos2.x;
        upper_right.x = pos1.x;
    }

    if (pos1.y < pos2.y) {
        lower_left.y = pos1.y;
        upper_right.y = pos2.y;
    } else {
        lower_left.y = pos2.y;
        upper_right.y = pos1.y;
    }
    return ({lower_left: lower_left, upper_right: upper_right});
}

// Takes a position and detect if it is within delta of the origin defined by findBounds ({origin, delta})
function withinBounds(pos, bounds)
{
    var ll = bounds.lower_left;
    var ur = bounds.upper_right;

    if ((pos.x >= ll.x) && (pos.x <= ur.x) && (pos.y >= ll.y) && (pos.y <= ur.y))
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
    var bounds;
    var inside = false;
    var selectedUnits = [];
    var dupeCheck = {};
    var mouseUpCoords = {};
    var xypos;

    mouseDownCorrected.x = mouseDownCoords.x;
    mouseDownCorrected.y = renderer.getSize().height - mouseDownCoords.y;

    mouseUpCoords.x = mRelPos.x + mouseDownCorrected.x;
    mouseUpCoords.y = -mRelPos.y + mouseDownCorrected.y;

    bounds = findBounds(mouseUpCoords, mouseDownCorrected);
    
    var colors = points.geometry.getAttribute("color").array;
    var positions = points.geometry.getAttribute("position").array;    
    
    for (var i = 0; i < positions.length; i += 3)
    {
        var p = {};
        p.x = positions[i];
        p.y = positions[i + 1];
        p.z = positions[i + 2];
        xypos = toScreenXY(p);

        inside = withinBounds(xypos, bounds);
        if (inside)
        {
            //color.setRGB(0.7, 0.0, 0.0);
            colors[ i ]     = 1.0;
            colors[ i + 1 ] = 0.4;
            colors[ i + 2 ] = 0.4;
            
            points.geometry.attributes.color.needsUpdate = true;
            nSelected += 1;
        }
    }
    $("#infoselected").html( nSelected.toString() + " selected" );
}

function onMouseDown( event )
{
    //event.preventDefault();
    //if (controls.shiftDown === true) return;

    mouseDown = true;
    mouseDownCoords = {};

    mouseDownCoords.x = event.clientX;
    mouseDownCoords.y = event.clientY;
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

    // reset the marquee selection
    selectPoints();
    resetMarquee();
}

function onWindowResize()
{
	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function render()
{
    requestAnimationFrame( render );
    renderer.render( scene, camera );
}
