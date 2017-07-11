/**
 * Script
 *
 *
 */

if ( !Detector.webgl ) Detector.addGetWebGLMessage();

var container
var camera, scene, renderer, material;

var outlineScene;
var outlineMaterial;
var outlineMesh;

var controls;

var layer_points = {};

var mouseDownCoords = {
    x: 0,
    y: 0
};
var mRelPos = {
    x: 0,
    y: 0
};

var color;
var modelParameters;
var layerSelected = "";
var neuronModels = [ 'All' ];
var synModels = [];
var selectedShape = "rectangular";
var layerNamesMade = false;
var selectionBoxArray = [];
var deviceBoxMap = {};

var nSelected = 0;
var deviceCounter = 1;
var uniqueID = 1;
var newDevicePos = [ 0.0, 0.15, -0.15, 0.3, -0.3 ];
var newDeviceIndex = 0;

var circle_objects = [];

var serverUpdateEvent;

var devicePlots;

// TODO: this class should be in a separate file.
class App
{
    constructor()
    {}
/*
 * Initializes the app.
 */
    init()
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

        $.getJSON( "/static/examples/brunel_converted.json", function( data )
        {
            modelParameters = data;
            Brain( camera, scene );
        } );

        // RENDERER
        renderer = new THREE.WebGLRenderer(
        {
            antialias: true
        } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( container.clientWidth, container.clientHeight );
        renderer.autoClear = false;

        container.appendChild( renderer.domElement );

        controls = new Controls( circle_objects, camera, renderer.domElement );

        devicePlots = new DevicePlots();

        // Server-Sent Events
        serverUpdateEvent = new EventSource( "/simulationData" );
        serverUpdateEvent.onmessage = this.handleMessage.bind(this);

        //render();
    }

    /*
     * Handles response from Server-Sent Events.
     */
    handleMessage( e )
    {
        var data = JSON.parse(e.data);
        var recordedData = data['stream_results'];
        var deviceData = data['plot_results'];
        console.log(data);

        var t = deviceData['time'];
        $("#infoconnected").html( "Simulating | " + t.toString() + " ms" );

        // Color results:
        var spiked = this.colorFromSpike(recordedData);
        this.colorFromVm(recordedData, spiked);

        for ( var layer in layer_points )
        {
            layer_points[ layer ].points.geometry.attributes.customColor.needsUpdate = true;
        }

        // Plot results:
        if ( deviceData['spike_det']['senders'].length >= 1 )
        {
            devicePlots.makeSpikeTrain(deviceData['spike_det'], t);
        }
        if ( deviceData['rec_dev']['times'].length >= 1 )
        {
            devicePlots.makeVoltmeterPlot(deviceData['rec_dev'], t);
        }
    }

    /*
     * Converts coordinates of a point in space to coordinates on screen.
     */
    toScreenXY( point_pos )
    {

        var point_vector = new THREE.Vector3( point_pos.x, point_pos.y, point_pos.z );
        var projScreenMat = new THREE.Matrix4();
        projScreenMat.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
        point_vector.applyMatrix4( projScreenMat );

        return {
            x: ( point_vector.x + 1 ) * renderer.getSize().width / 2,
            y: renderer.getSize().height - ( -point_vector.y + 1 ) * renderer.getSize().height / 2
        };
    }

    /*
     * Converts coordinates on the screen to coordinates in space.
     */
    toObjectCoordinates( screenPos )
    {
        var vector = new THREE.Vector3();

        vector.set(
            ( screenPos.x / container.clientWidth ) * 2 - 1, -( screenPos.y / container.clientHeight ) * 2 + 1,
            0.5 );

        vector.unproject( camera );

        var dir = vector.sub( camera.position ).normalize();

        var distance = -camera.position.z / dir.z;

        var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );

        return pos
    }

    /*
     * Finds the ll and ur coordinates of the selected square
     */
    findBounds( pos1, pos2 )
    {
        var ll = {};
        var ur = {};
        ll.x = Math.min( pos1.x, pos2.x );
        ll.y = Math.min( pos1.y, pos2.y );
        ur.x = Math.max( pos1.x, pos2.x );
        ur.y = Math.max( pos1.y, pos2.y );
        return (
        {
            ll: ll,
            ur: ur
        } );
    }

    /*
     * Callback for the rectangular shape button.
     */
    makeRectangularShape()
    {
        var selectedColor = window.getComputedStyle( document.body ).getPropertyValue( '--shape_selected_background' );
        var unselectedColor = window.getComputedStyle( document.body ).getPropertyValue( '--shape_not_selected_background' );
        var rectangleButtoncss = $( "#rectangleButton" );
        rectangleButtoncss.css(
        {
            backgroundColor: selectedColor
        } );
        var ellipticalButtoncss = $( "#ellipticalButton" );
        ellipticalButtoncss.css(
        {
            backgroundColor: unselectedColor
        } );

        selectedShape = 'rectangular';
    }

    /*
     * Callback for the elliptical shape button.
     */
    makeEllipticalShape()
    {
        var selectedColor = window.getComputedStyle( document.body ).getPropertyValue( '--shape_selected_background' );
        var unselectedColor = window.getComputedStyle( document.body ).getPropertyValue( '--shape_not_selected_background' );
        var rectangleButtoncss = $( "#rectangleButton" );
        rectangleButtoncss.css(
        {
            backgroundColor: unselectedColor
        } );
        var ellipticalButtoncss = $( "#ellipticalButton" );
        ellipticalButtoncss.css(
        {
            backgroundColor: selectedColor
        } );

        selectedShape = 'elliptical';
    }

    /*
     * Gets the selected value of a drop-down menu.
     */
    getSelectedDropDown( id )
    {
        var dd = document.getElementById( id );
        return dd.options[ dd.selectedIndex ].value;
    }

    /*
     * Returns the currently selected selection shape.
     */
    getSelectedShape()
    {
        return selectedShape;
    }

    /*
     * Gets layer and point index for a specified GID.
     */
    getGIDPoint( gid )
    {
        var minGID = 0;
        for ( var l in layer_points )
        {
            minGID += 1; // from the GID of the layer
            var pos = layer_points[ l ].points.geometry.attributes.position;
            if ( gid <= minGID + pos.count )
            {
                // point is in this layer
                var pointIndex = 3 * ( gid - minGID - 1 );
                return {
                    layer: l,
                    pointIndex: pointIndex
                };
            }
            minGID += pos.count;
        }
    }

    /*
     * Colours node points given their membrane potential, skipping nodes that
     * just spiked.
     */
    colorFromVm( response, spiked )
    {
        var time = 0;
        var V_m = 0;
        var point;
        for ( var device in response )
        {
            var deviceModel = device.slice( 0, device.lastIndexOf( "_" ) );
            if ( deviceModel === "voltmeter" )
            {
                for ( var gid in response[ device ] )
                {
                    if ( spiked.indexOf( gid ) === -1 ) // if GID did not spike
                    {
                        point = this.getGIDPoint( gid );
                        V_m = response[ device ][ gid ][ 1 ];
                        // TODO: Vm range should be variable
                        var colorVm = this.mapVmToColor( V_m, -70., -50. );

                        var points = layer_points[ point.layer ].points;
                        var colors = points.geometry.getAttribute( "customColor" ).array;

                        colors[ point.pointIndex ] = colorVm[ 0 ];
                        colors[ point.pointIndex + 1 ] = colorVm[ 1 ];
                        colors[ point.pointIndex + 2 ] = colorVm[ 2 ];
                        //points.geometry.attributes.customColor.needsUpdate = true;
                    }
                }
            }
        }
    }

    /*
     * Colours spiking node points.
     */
    colorFromSpike( response )
    {
        var time = 0;
        var V_m = 0;
        var point;
        var spikedGIDs = [];
        for ( var device in response )
        {
            var deviceModel = device.slice( 0, device.lastIndexOf( "_" ) );
            if ( deviceModel === "spike_detector" )
            {
                for ( var gid in response[ device ] )
                {
                    point = this.getGIDPoint( gid );
                    var colorSpike = [ 0.9, 0.0, 0.0 ];

                    var points = layer_points[ point.layer ].points;
                    var colors = points.geometry.getAttribute( "customColor" ).array;

                    colors[ point.pointIndex ] = colorSpike[ 0 ];
                    colors[ point.pointIndex + 1 ] = colorSpike[ 1 ];
                    colors[ point.pointIndex + 2 ] = colorSpike[ 2 ];
                    //points.geometry.attributes.customColor.needsUpdate = true;
                    spikedGIDs.push( gid );
                }
            }
        }
        return spikedGIDs;
    }

    /*
     * Maps the membrane potential to a colour.
     */
    mapVmToColor( Vm, minVm, maxVm )
    {
        var clampedVm;
        clampedVm = ( Vm < minVm ) ? minVm : Vm;
        clampedVm = ( Vm > maxVm ) ? maxVm : Vm;
        var colorRG = ( clampedVm - minVm ) / ( maxVm - minVm );
        return [ colorRG, colorRG, 1.0 ];
    }

    /*
     * Resets colours in the box.
     */
    resetBoxColors()
    {
        for ( var device in deviceBoxMap )
        {
            for ( var i in deviceBoxMap[ device ].connectees )
            {
                deviceBoxMap[ device ].connectees[ i ].updateColors();
            }
        }

    }

    /*
     * Creates an object with specs and connectees for each device.
     */
    makeProjections()
    {
        var projections = {};
        // projections['internal'] = modelParameters.projections;
        $( "#infoconnected" ).html( "Gathering selections to be connected ..." );
        for ( var device in deviceBoxMap )
        {
            projections[ device ] = {
                specs: deviceBoxMap[ device ].specs,
                connectees: []
            };
            for ( var i in deviceBoxMap[ device ].connectees )
            {
                projections[ device ].connectees.push( deviceBoxMap[ device ].connectees[ i ].getSelectionInfo() )
            }
        }
        return projections;
    }

    /*
     * Sends data to the server, creating the connections.
     */
    makeConnections()
    {
        // create object to be sent
        var projections = this.makeProjections();
        console.log( projections );

        $( "#infoconnected" ).html( "Connecting ..." );
        // send selected connections
        $.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/connect",
            data: JSON.stringify(
            {
                network: modelParameters,
                synapses: synModels,
                internalProjections: modelParameters.projections,
                projections: projections
            } ),
            dataType: "json"
        } );
        this.getConnections();
    }

    /*
     * Gets the number of connections from the server.
     */
    getConnections()
    {
        $.getJSON( "/connections",
        {
            input: "dummyData"
        } ).done( function( data )
        {
            $( "#infoconnected" ).html( data.connections.toString() + " connection(s)" );
        } );
    }

    /*
     * Runs a simulation.
     */
    runSimulation()
    {
        var projections = this.makeProjections();

        $( "#infoconnected" ).html( "Simulating ..." );

        $.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/simulate",
            data: JSON.stringify(
            {
                network: modelParameters,
                synapses: synModels,
                internalProjections: modelParameters.projections,
                projections: projections,
                time: "1000"
            } ),
            dataType: "json"
        } ).done( function( data )
        {
            console.log( "Simulation finished" );
            console.log( data );
            $( "#infoconnected" ).html( "Simulation finished" );
        } );

    }

    /*
     * Runs a simulation.
     */
    streamSimulate()
    {
        devicePlots.makeDevicePlot();

        $.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/streamSimulate",
            data: JSON.stringify(
            {
                network: modelParameters,
                synapses: synModels,
                internalProjections: modelParameters.projections,
                projections: this.makeProjections(),
                time: "10000"
            } ),
            dataType: "json"
        } ).done( function( data )
        {
            console.log( "Simulation started successfully" );
        } );
    }

    /*
     * Aborts the current simulation.
     */
    abortSimulation()
    {
        $.ajax(
        {
            url: "/abortSimulation",
        } ).done( function( data )
        {
            console.log( data );
            this.resetBoxColors();
        } );
    }

    /*
     * Saves selections to file.
     */
    saveSelection()
    {
        console.log( "##################" );
        console.log( "    Selections" );
        console.log( "##################" );
        console.log( "deviceBoxMap", deviceBoxMap );
        console.log( "circle_objects", circle_objects );
        console.log( "selectionBoxArray", selectionBoxArray );
        console.log( "##################" );

        var filename = prompt( "Please enter a name for the file:", "Untitled selection" );
        if ( filename === null || filename === "" )
        {
            // User canceled saving
            return;
        }
        // create object to be saved
        var projections = {};
        for ( var device in deviceBoxMap )
        {
            var deviceModel = deviceBoxMap[ device ].specs.model;
            projections[ device ] = {
                specs: deviceBoxMap[ device ].specs,
                connectees: []
            };
            for ( var i in deviceBoxMap[ device ].connectees )
            {
                projections[ device ].connectees.push( deviceBoxMap[ device ].connectees[ i ].getInfoForSaving() )
            }
        }
        console.log( "projections", projections );

        var dlObject = {
            projections: projections
        };
        var jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent( JSON.stringify( dlObject ) );
        var dlAnchorElem = document.getElementById( 'downloadAnchorElem' );
        dlAnchorElem.setAttribute( "href", jsonStr );
        dlAnchorElem.setAttribute( "download", filename + ".json" );
        dlAnchorElem.click();
    }

    /*
     * Loads selections from a file.
     */
    loadSelection()
    {
        document.getElementById( 'uploadAnchorElem' ).click();
    }

    /*
     * Creates the devices, selections, and connections, given a JSON with
     * connection data.
     */
    loadFromJSON( textJSON )
    {
        var inputObj = JSON.parse( textJSON );
        console.log( inputObj )
        var IDsCreated = [];
        for ( var device in inputObj.projections )
        {
            var deviceModel = inputObj.projections[ device ].specs.model;
            if ( deviceModel === "poisson_generator" )
            {
                this.makeStimulationDevice( deviceModel );
            }
            else
            {
                this.makeRecordingDevice( deviceModel );
            }

            var target = circle_objects[ circle_objects.length - 1 ];

            for ( var i in inputObj.projections[ device ].connectees )
            {
                var boxSpecs = inputObj.projections[ device ].connectees[ i ];

                // if not created yet, the box must be created
                if ( IDsCreated.indexOf( boxSpecs.uniqueID ) === -1 )
                {
                    IDsCreated.push( boxSpecs.uniqueID );
                    var box = new SelectionBox( boxSpecs.ll, boxSpecs.ur, boxSpecs.maskShape );
                    box.uniqueID = boxSpecs.uniqueID;

                    // update our uniqueID count only if box.uniqueID is greater
                    uniqueID = ( boxSpecs.uniqueID > uniqueID ) ? boxSpecs.uniqueID : uniqueID;

                    box.layerName = boxSpecs.name;
                    box.selectedNeuronType = boxSpecs.neuronType;
                    box.selectedSynModel = boxSpecs.synModel;
                    box.selectedShape = boxSpecs.maskShape;

                    selectionBoxArray.push( box );
                    box.makeBox();
                }
                // if the box is already created, it must be found
                else
                {
                    for ( var i in selectionBoxArray )
                    {
                        if ( selectionBoxArray[ i ].uniqueID === boxSpecs.uniqueID )
                        {
                            var box = selectionBoxArray[ i ];
                            break;
                        }
                    }
                }

                box.makeLine();
                var radius = target.geometry.boundingSphere.radius;
                box.setLineTarget( target.name );
                box.lineToDevice( target.position, radius, target.name );

                box.updateColors();
                console.log( deviceBoxMap )
                deviceBoxMap[ device ].connectees.push( box );
            }
        }
    }

    /*
     * Callback function for file upload when loading a JSON file.
     */
    handleFileUpload( event )
    {
        console.log( "file uploaded" )
        // TODO: need some checks here
        var fr = new FileReader();
        var result;
        fr.onload = function( e )
        {
            this.loadFromJSON( fr.result );
        }.bind(this);
        fr.readAsText( event.target.files[ 0 ] );
    }

    /*
     * Creates a device, with given colour, texture map, and optional parameters.
     */
    makeDevice( device, col, map, params = {} )
    {
        var geometry = new THREE.CircleBufferGeometry( 0.05, 32 );
        geometry.computeBoundingSphere(); // needed for loading
        var material = new THREE.MeshBasicMaterial(
        {
            color: col,
            map: map
        } );
        var circle = new THREE.Mesh( geometry, material );
        var deviceName = device + "_" + String( deviceCounter++ );
        circle.name = deviceName;

        circle.position.y = newDevicePos[ newDeviceIndex ];
        newDeviceIndex = ( newDeviceIndex + 1 === newDevicePos.length ) ? 0 : ++newDeviceIndex;

        scene.add( circle );
        circle_objects.push( circle );

        controls.deviceInFocus = circle;
        controls.makeOutline( controls.deviceInFocus );

        deviceBoxMap[ deviceName ] = {
            specs:
            {
                model: device,
                params: params
            },
            connectees: []
        };
    }

    /*
     * Creates a stimulation device.
     */
    makeStimulationDevice( device )
    {
        console.log( "making stimulation device of type", device )
        var col = 0xB28080
            //var map = new THREE.TextureLoader().load( "static/js/textures/current_source_white.png" );
        var map = new THREE.TextureLoader().load( "static/js/textures/poisson.png" );
        var params = {
            rate: 70000.0
        }
        this.makeDevice( device, col, map, params );
    }

    /*
     * Creates a recording device.
     */
    makeRecordingDevice( device )
    {
        console.log( "making recording device of type", device )
        if ( device === "voltmeter" )
        {
            var col = 0xBDB280;
            var map = new THREE.TextureLoader().load( "static/js/textures/voltmeter.png" );
        }
        else if ( device === "spike_detector" )
        {
            var col = 0x809980;
            var map = new THREE.TextureLoader().load( "static/js/textures/spike_detector.png" );
        }
        else
        {
            var col = 0xBDB280;
            var map = new THREE.TextureLoader().load( "static/js/textures/recording_device.png" );
        }

        this.makeDevice( device, col, map );
    }

    render()
    {
        requestAnimationFrame( this.render.bind(this) );

        renderer.clear();
        renderer.render( outlineScene, camera );
        renderer.render( scene, camera );

        if ( !layerNamesMade )
        {
            make_layer_names();
            layerNamesMade = true;
        }
    }
}

app = new App();
app.init();