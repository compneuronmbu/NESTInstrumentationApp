/**
 * Script
 *
 *
 */

// TODO: rename App -> ???
class App
{
    constructor()
    {
        this.controls;
     
        this.outlineScene;
        this.outlineMaterial;

        this.layerSelected = "";
        this.layerNamesMade = false;

        this.selectionBoxArray = [];

        this.serverUpdateEvent;
        this.devicePlots;

        // this.material;

        this.mouseDownCoords = {
            x: 0,
            y: 0
        };
        this.mRelPos = {
            x: 0,
            y: 0
        };
        
        this.selectedShape = "rectangular";

        this.layer_points = {};
        this.modelParameters;
        this.neuronModels = [ 'All' ];
        this.synModels = [];

        this.deviceCounter = 1;

        this.uniqueID = 1;
        this.newDevicePos = [ 0.0, 0.15, -0.15, 0.3, -0.3 ];
        this.newDeviceIndex = 0;

        this.circle_objects = [];

        this.deviceBoxMap = {};

        this.nSelected = 0;
    }

    /*
     * Initializes the app.
     */
    init()
    {
        // Binding libraries to this so that they can be set by test scripts,
        // because Node.js is being difficult.
        this.$ = $;
        this.THREE = THREE;
        this.SelectionBox = SelectionBox;

        this.container = document.getElementById( 'main_body' );

        this.initTHREEScene();
        this.initTHREERenderer();
        this.initContainer();
        this.initParameters();

        this.controls = new Controls( this.circle_objects, this.camera, this.renderer.domElement );

        this.devicePlots = new DevicePlots();

        this.initGUI();

        // Server-Sent Events
        this.serverUpdateEvent = new EventSource( "/simulationData" );
        this.serverUpdateEvent.onmessage = this.handleMessage.bind(this);
    }

    initTHREEScene()
    {
        // CAMERA
        this.camera = new this.THREE.PerspectiveCamera( 45, this.container.clientWidth / this.container.clientHeight, 0.5, 10 );
        this.scene = new this.THREE.Scene();
        this.outlineScene = new this.THREE.Scene();

        // POINTS
        this.color = new this.THREE.Color();
        this.color.setRGB( 0.5, 0.5, 0.5 );
    }

    initTHREERenderer()
    {
        // RENDERER
        this.renderer = new this.THREE.WebGLRenderer(
        {
            antialias: true
        } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( this.container.clientWidth, this.container.clientHeight );
        this.renderer.autoClear = false;
    }

    initContainer()
    {
        document.body.appendChild( this.container );
        this.container.appendChild( this.renderer.domElement );
    }

    initParameters()
    {
        this.$.getJSON( "/static/examples/brunel_converted.json", function( data )
        {
            this.modelParameters = data;
            Brain( this.camera, this.scene );
        }.bind(this) );
    }

    initGUI()
    {
        // make GUI when finished compiling the jsx file (this should be changed when precompiling)
        var makeGuiInterval = setInterval(
            function(){
                try
                {
                    makeGUI();
                    clearInterval(makeGuiInterval);
                }
                catch(err)
                {}
            }, 100);
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
        this.$("#infoconnected").html( "Simulating | " + t.toString() + " ms" );

        // Color results:
        var spiked = this.colorFromSpike(recordedData);
        this.colorFromVm(recordedData, spiked);

        for ( var layer in this.layer_points )
        {
            this.layer_points[ layer ].points.geometry.attributes.customColor.needsUpdate = true;
        }

        // Plot results:
        if ( deviceData['spike_det']['senders'].length >= 1 )
        {
            this.devicePlots.makeSpikeTrain(deviceData['spike_det'], t);
        }
        if ( deviceData['rec_dev']['times'].length >= 1 )
        {
            this.devicePlots.makeVoltmeterPlot(deviceData['rec_dev'], t);
        }
    }

    /*
     * Converts coordinates of a point in space to coordinates on screen.
     */
    toScreenXY( point_pos )
    {

        var point_vector = new this.THREE.Vector3( point_pos.x, point_pos.y, point_pos.z );
        var projScreenMat = new this.THREE.Matrix4();
        projScreenMat.multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse );
        point_vector.applyMatrix4( projScreenMat );

        return {
            x: ( point_vector.x + 1 ) * this.renderer.getSize().width / 2,
            y: this.renderer.getSize().height - ( -point_vector.y + 1 ) * this.renderer.getSize().height / 2
        };
    }

    /*
     * Converts coordinates on the screen to coordinates in space.
     */
    toObjectCoordinates( screenPos )
    {
        var vector = new this.THREE.Vector3();

        vector.set(
            ( screenPos.x / this.container.clientWidth ) * 2 - 1, -( screenPos.y / this.container.clientHeight ) * 2 + 1,
            0.5 );

        vector.unproject( this.camera );

        var dir = vector.sub( this.camera.position ).normalize();

        var distance = -this.camera.position.z / dir.z;

        var pos = this.camera.position.clone().add( dir.multiplyScalar( distance ) );

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
        var rectangleButtoncss = this.$( "#rectangleButton" );
        rectangleButtoncss.css(
        {
            backgroundColor: selectedColor
        } );
        var ellipticalButtoncss = this.$( "#ellipticalButton" );
        ellipticalButtoncss.css(
        {
            backgroundColor: unselectedColor
        } );

        this.selectedShape = 'rectangular';
    }

    /*
     * Callback for the elliptical shape button.
     */
    makeEllipticalShape()
    {
        var selectedColor = window.getComputedStyle( document.body ).getPropertyValue( '--shape_selected_background' );
        var unselectedColor = window.getComputedStyle( document.body ).getPropertyValue( '--shape_not_selected_background' );
        var rectangleButtoncss = this.$( "#rectangleButton" );
        rectangleButtoncss.css(
        {
            backgroundColor: unselectedColor
        } );
        var ellipticalButtoncss = this.$( "#ellipticalButton" );
        ellipticalButtoncss.css(
        {
            backgroundColor: selectedColor
        } );

        this.selectedShape = 'elliptical';
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
        return this.selectedShape;
    }

    /*
     * Gets layer and point index for a specified GID.
     */
    getGIDPoint( gid )
    {
        var minGID = 0;
        for ( var l in this.layer_points )
        {
            minGID += 1; // from the GID of the layer
            var pos = this.layer_points[ l ].points.geometry.attributes.position;
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

                        var points = this.layer_points[ point.layer ].points;
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

                    var points = this.layer_points[ point.layer ].points;
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
        for ( var device in this.deviceBoxMap )
        {
            for ( var i in this.deviceBoxMap[ device ].connectees )
            {
                this.deviceBoxMap[ device ].connectees[ i ].updateColors();
            }
        }

    }

    /*
     * Creates an object with specs and connectees for each device.
     */
    makeProjections()
    {
        var projections = {};
        // projections['internal'] = this.modelParameters.projections;
        this.$( "#infoconnected" ).html( "Gathering selections to be connected ..." );
        for ( var device in this.deviceBoxMap )
        {
            projections[ device ] = {
                specs: this.deviceBoxMap[ device ].specs,
                connectees: []
            };
            for ( var i in this.deviceBoxMap[ device ].connectees )
            {
                projections[ device ].connectees.push( this.deviceBoxMap[ device ].connectees[ i ].getSelectionInfo() )
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

        this.$( "#infoconnected" ).html( "Connecting ..." );
        // send selected connections
        this.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/connect",
            data: JSON.stringify(
            {
                network: this.modelParameters,
                synapses: this.synModels,
                internalProjections: this.modelParameters.projections,
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
        this.$.getJSON( "/connections",
        {
            input: "dummyData"
        } ).done( function( data )
        {
            this.$( "#infoconnected" ).html( data.connections.toString() + " connection(s)" );
        }.bind(this) );
    }

    /*
     * Runs a simulation.
     */
    runSimulation()
    {
        var projections = this.makeProjections();

        this.$( "#infoconnected" ).html( "Simulating ..." );

        this.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/simulate",
            data: JSON.stringify(
            {
                network: this.modelParameters,
                synapses: this.synModels,
                internalProjections: this.modelParameters.projections,
                projections: projections,
                time: "1000"
            } ),
            dataType: "json"
        } ).done( function( data )
        {
            console.log( "Simulation finished" );
            console.log( data );
            this.$( "#infoconnected" ).html( "Simulation finished" );
        }.bind(this) );

    }

    /*
     * Runs a simulation.
     */
    streamSimulate()
    {
        this.devicePlots.makeDevicePlot();

        this.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/streamSimulate",
            data: JSON.stringify(
            {
                network: this.modelParameters,
                synapses: this.synModels,
                internalProjections: this.modelParameters.projections,
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
        this.$.ajax(
        {
            url: "/abortSimulation",
        } ).done( function( data )
        {
            console.log( data );
            this.resetBoxColors();
        }.bind(this) );
    }

    /*
     * Saves selections to file.
     */
    saveSelection()
    {
        console.log( "##################" );
        console.log( "    Selections" );
        console.log( "##################" );
        console.log( "deviceBoxMap", this.deviceBoxMap );
        console.log( "circle_objects", this.circle_objects );
        console.log( "selectionBoxArray", this.selectionBoxArray );
        console.log( "##################" );

        var filename = prompt( "Please enter a name for the file:", "Untitled selection" );
        if ( filename === null || filename === "" )
        {
            // User cancelled saving
            return;
        }
        // create object to be saved
        var projections = {};
        for ( var device in this.deviceBoxMap )
        {
            var deviceModel = this.deviceBoxMap[ device ].specs.model;
            projections[ device ] = {
                specs: this.deviceBoxMap[ device ].specs,
                connectees: []
            };
            for ( var i in this.deviceBoxMap[ device ].connectees )
            {
                projections[ device ].connectees.push( this.deviceBoxMap[ device ].connectees[ i ].getInfoForSaving() )
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

            var target = this.circle_objects[ this.circle_objects.length - 1 ];

            for ( var i in inputObj.projections[ device ].connectees )
            {
                var boxSpecs = inputObj.projections[ device ].connectees[ i ];

                // if not created yet, the box must be created
                if ( IDsCreated.indexOf( boxSpecs.uniqueID ) === -1 )
                {
                    IDsCreated.push( boxSpecs.uniqueID );
                    var box = new this.SelectionBox( boxSpecs.ll, boxSpecs.ur, boxSpecs.maskShape );
                    box.uniqueID = boxSpecs.uniqueID;

                    // update our uniqueID count only if box.uniqueID is greater
                    this.uniqueID = ( boxSpecs.uniqueID > this.uniqueID ) ? boxSpecs.uniqueID : this.uniqueID;

                    box.layerName = boxSpecs.name;
                    box.selectedNeuronType = boxSpecs.neuronType;
                    box.selectedSynModel = boxSpecs.synModel;

                    this.selectionBoxArray.push( box );
                    box.makeBox();
                }
                // if the box is already created, it must be found
                else
                {
                    for ( var i in this.selectionBoxArray )
                    {
                        if ( this.selectionBoxArray[ i ].uniqueID === boxSpecs.uniqueID )
                        {
                            var box = this.selectionBoxArray[ i ];
                            break;
                        }
                    }
                }

                box.makeLine();
                var radius = target.geometry.boundingSphere.radius;
                box.setLineTarget( target.name );
                box.lineToDevice( target.position, radius, target.name );

                box.updateColors();
                this.deviceBoxMap[ device ].connectees.push( box );
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
        var geometry = new this.THREE.CircleBufferGeometry( 0.05, 32 );
        geometry.computeBoundingSphere(); // needed for loading
        var material = new this.THREE.MeshBasicMaterial(
        {
            color: col,
            map: map
        } );
        var circle = new this.THREE.Mesh( geometry, material );
        var deviceName = device + "_" + String( this.deviceCounter++ );
        circle.name = deviceName;

        circle.position.y = this.newDevicePos[ this.newDeviceIndex ];
        this.newDeviceIndex = ( this.newDeviceIndex + 1 === this.newDevicePos.length ) ? 0 : ++this.newDeviceIndex;

        this.scene.add( circle );
        this.circle_objects.push( circle );

        this.controls.deviceInFocus = circle;
        this.controls.makeOutline( this.controls.deviceInFocus );

        this.deviceBoxMap[ deviceName ] = {
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
            //var map = new this.THREE.TextureLoader().load( "static/js/textures/current_source_white.png" );
        var map = new this.THREE.TextureLoader().load( "static/js/textures/poisson.png" );
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
            var map = new this.THREE.TextureLoader().load( "static/js/textures/voltmeter.png" );
        }
        else if ( device === "spike_detector" )
        {
            var col = 0x809980;
            var map = new this.THREE.TextureLoader().load( "static/js/textures/spike_detector.png" );
        }
        else
        {
            var col = 0xBDB280;
            var map = new this.THREE.TextureLoader().load( "static/js/textures/recording_device.png" );
        }

        this.makeDevice( device, col, map );
    }

    render()
    {
        requestAnimationFrame( this.render.bind(this) );

        this.renderer.clear();
        this.renderer.render( this.outlineScene, this.camera );
        this.renderer.render( this.scene, this.camera );

        if ( !this.layerNamesMade )
        {
            make_layer_names();
            this.layerNamesMade = true;
        }
    }
}

//  Try exporting App for testing
try
{
    module.exports = App;
}
catch(err)
{
}
