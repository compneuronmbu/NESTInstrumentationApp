/**
 * NESTInstrumentation app.
 */
class App
{
    constructor()
    {
        this.userID;

        this.controls;

        this.renderer;
        this.scene;
        this.camera;

        this.axisRenderer;
        this.axisScene;
        this.axisCamera;

        this.outlineScene;
        this.outlineMaterial;

        this.layerSelected = "";
        this.layerNamesMade = false;

        this.selectionBoxArray = [];

        this.serverUpdateEvent;
        this.devicePlots;

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

        // 3D layer is default.
        this.is3DLayer = true;

        // Callback functions to GUI, function definitions in GUI.jsx
        this.synapseNeuronModelCallback = function() {};
        this.setShowGUI = function() {};

        this.deviceCounter = 1;

        this.uniqueID = 1;
        this.newDevicePos = [ 0.0, 0.15, -0.15, 0.3, -0.3 ];
        this.newDeviceIndex = 0;

        this.circle_objects = [];

        this.deviceBoxMap = {};

        this.nSelected = 0;

    }

    /**
     * Initializes the app.
     */
    init(userID)
    {
        // Binding libraries to this so that they can be set by test scripts,
        // because Node.js is being difficult.
        this.$ = this.$ || $;
        this.THREE = this.THREE || THREE;
        this.SelectionBox = this.SelectionBox || SelectionBox;
        this.SelectionBox3D = this.SelectionBox3D || SelectionBox3D;
        this.io = this.io || io;

        this.container = document.getElementById( 'main_body' );

        // HBP Authentication, must happen before we initiate anything.
        this.userID = userID;
        console.log("layerSelect userID:", this.userID);

        this.initTHREEScene();
        this.initTHREERenderer();
        this.initContainer();

        // Button that decides which model we will use
        document.getElementById('startButtons').addEventListener('click', this.onLayerModelClicked.bind( this ), false);
        // If we load model
        document.getElementById('loadLayer').addEventListener('change', this.handleModelFileUpload.bind( this ), false);

        this.controls = new Controls( this.circle_objects, this.renderer.domElement );

        this.devicePlots = new DevicePlots();

        this.initGUI();
        this.initSecondCamera();

        // Server-Sent Events
        this.serverUpdateEvent = new EventSource( "/simulationData" );
        this.serverUpdateEvent.onmessage = this.handleSimulationData.bind(this);

        // Sockets
        let host = 'https://' + window.location.host;
        console.log('Connecting socket to ' + host);
        this.statusSocket = io(host);
        this.statusSocket.on('connect', function(){
            console.log('Socket connected');
        });
        this.statusSocket.on('disconnect', function(){
            console.log('Socket disconnected');
        });
        this.statusSocket.on('message', function(data){
            window.alert('The server encountered the following error:\n\n' + data.message)
        });

        this.render();
    }

    /**
     * Initializes the scene.
     */
    initTHREEScene()
    {
        // CAMERA
        this.camera = new this.THREE.PerspectiveCamera( 45, this.container.clientWidth / this.container.clientHeight, 0.5, 1000 );
        this.camera.position.x = 100;
        this.scene = new this.THREE.Scene();
        this.outlineScene = new this.THREE.Scene();

        // POINTS
        this.color = new this.THREE.Color();
        this.color.setRGB( 0.7, 0.7, 0.7 );
        this.colorEx = new this.THREE.Color();
        this.colorIn = new this.THREE.Color();
        this.colorEx.setRGB( 0.4, 0.4, 0.7 );
        this.colorIn.setRGB( 0.7, 0.4, 0.4 );
    }

    /**
     * Initializes the renderer.
     */
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

    /**
     * Inserts the renderer into the Document Object Model.
     */
    initContainer()
    {
        document.body.appendChild( this.container );
        this.container.appendChild( this.renderer.domElement );
    }

    /**
    * Sets up a second canvas that contains a coordinate system that mirrors the system of
    * the brain model. When we rotate the model, the coordinate systems rotates as well, so
    * that we always know which direction is x, y and z in the brain model.
    */
    initSecondCamera()
    {
        // Insert canvas
        var container2 = document.getElementById('coordinateHelper');

        // Renderer
        this.axisRenderer = new this.THREE.WebGLRenderer( { antialias: true, alpha: true } );
        this.axisRenderer.setSize( 100, 100 );
        this.axisRenderer.setClearColor( 0x000000, 0 );
        // this.axisRenderer.setClearAlpha(0);
        container2.appendChild( this.axisRenderer.domElement );

        // Scene
        this.axisScene = new this.THREE.Scene();
        // this.axisScene.background = new THREE.Color( 0xffffff );

        // Camera
        //this.axisCamera = new this.THREE.PerspectiveCamera( 45, 1, 0.5, 1000 );
        this.axisCamera = new this.THREE.OrthographicCamera(-1, 1, 1, -1, 0.0, 1000);
        this.axisCamera.up = this.camera.up; // Important!

        // Axes
        var axes = new this.THREE.AxisHelper( 0.9 );
        axes.material.linewidth = 2;
        this.axisScene.add(axes);

        // Axis labels
        var loader = new THREE.FontLoader();
        var labelSpecs = {x: {text: 'x', color: 0xff0000, position: {x: 0.82, y: 0.05, z: 0}},
                          y: {text: 'y', color: 0x00ff00, position: {x: 0.05, y: 0.82, z: -0.05}},
                          z: {text: 'z', color: 0x3333ff, position: {x: 0, y: 0.05, z: 0.82}},
                         };
        this.labelMeshes = [];
        loader.load( 'static/js/lib/three/examples/fonts/helvetiker_regular.typeface.json', ( font ) => {
            for (var label in labelSpecs)
            {
                let specs = labelSpecs[ label ]
                var geometry = new THREE.TextGeometry( specs.text, {
                        font: font,
                        size: 10,
                        height: 1,
                        curveSegments: 12,
                        bevelEnabled: true,
                        bevelThickness: 0.001,
                        bevelSize: 0.1,
                        bevelSegments: 5
                } );
                var material = new this.THREE.MeshBasicMaterial({color: specs.color} );
                var mesh = new THREE.Mesh(geometry, material);
                mesh.scale.setScalar(0.02);
                mesh.position.x = specs.position.x
                mesh.position.y = specs.position.y
                mesh.position.z = specs.position.z
                this.labelMeshes.push( mesh );
                this.axisScene.add(mesh);
            }

        });
    }

    /**
    * Finds out which of the model buttons we chose, and sends infomation to Brain, which
    * then displays the chosen model. Can chose Brunel model, Hill-Tononi or load your own.
    *
    * @event
    */
    onLayerModelClicked(evt)
    {
        var target = evt.target;
        var JSONstring;

        if ( target.id === 'brunel' )
        {
            console.log("Brunel!");
            JSONstring = "/static/examples/brunel_converted.json";
            this.is3DLayer = false;
            this.loadModelIntoApp(JSONstring);
        }
        else if ( target.id === 'hillTononi' )
        {
            console.log("Hill-Tononi!");
            JSONstring = "/static/examples/hill_tononi_converted.json";
            this.is3DLayer = false;
            this.loadModelIntoApp(JSONstring);
        }
        else if ( target.id === "brunel3Dqr" )
        {
            console.log("Brunel 3D quasi random!");
            JSONstring = "/static/examples/brunel_3D_converted_quasi_random.json";
            this.loadModelIntoApp(JSONstring);
        }
        else if ( target.id === "hillTononi3D" )
        {
            console.log("Hill-Tononi 3D!");
            JSONstring = "/static/examples/hill_tononi_3D_converted.json";
            this.loadModelIntoApp(JSONstring);
        }
        else if ( target.id === "potDies" )
        {
            console.log("Potjans-Diesmann!");
            JSONstring = "/static/examples/Potjans_Diesmann_converted.json";
            this.loadModelIntoApp(JSONstring);
        }
        else if ( target.id === 'loadOwn' )
        {
            console.log("Custom made model!");
            // Need to simulate click on hidden button ´loadLayer´, and then ´handleModelFileUpload´
            // handles the file upload and subsequent allocation to Brain, which displays the model.
            document.getElementById( 'loadLayer' ).click();
        }
        else
        {
            return;
        }
    }

    /**
    * Loads the selected model into the app.
    */
    loadModelIntoApp(JSONstring)
    {
        var guiWidth = window.getComputedStyle( document.body ).getPropertyValue( '--gui_target_width' );
        document.documentElement.style.setProperty('--gui_width', guiWidth);
        this.setShowGUI(true);
        this.controls.onWindowResize();
        document.getElementById("loadingOverlay").style.display = "block";
        this.$.getJSON( JSONstring, function( data )
        {
            this.modelParameters = data;
            this.brain = new Brain();
        }.bind(this) );

        // Define orbit controls system here, because we need to know if we have
        // a 2D or 3D model before defining the controls
        // as we do not want to define them if we have a 2D model.
        if ( this.is3DLayer )
        {
            this.orbitControls = new this.THREE.OrbitControls( this.camera, this.renderer.domElement );
            var coordinateHelper = document.getElementById('coordinateHelper');
            coordinateHelper.style.display = "block";
        }
        else
        {
            // remove the axis window
            var coordinateHelper = document.getElementById('coordinateHelper');
            coordinateHelper.parentElement.removeChild( coordinateHelper );
            this.axisRenderer = undefined;
        }

        $("#startButtons").html( "" );
        $("#startButtons").css( {width: "auto", top: "10px", left: "10px", "text-align": "left"} );

        // Back to menu button
        var element = document.getElementById( 'startButtons' );
        var fragment = document.createDocumentFragment();

        var returnToStart = document.createElement( 'div' );
        returnToStart.className = 'floatBox backToMenu unselectable';
        returnToStart.onclick = function()
        {
            location.reload();
        };
        var heading = document.createElement( 'label' );
        heading.innerHTML = '<b>&larr;</b> Back to menu';

        returnToStart.appendChild( heading );
        fragment.appendChild( returnToStart );
        element.appendChild( fragment );

        this.initHelp();
    }

    /**
    * Function to handle file upload if user has chosen its own model.
    *
    * @event
    * @returns {Bool} <code>false</code> if the file is empty.
    */
    handleModelFileUpload (event) {
        var file = event.target.files;
        if (file.length <= 0) {
            return false;
        }

        var fr = new FileReader();

        fr.onload = function(e) {
            try{
                var result = JSON.parse(e.target.result);
                this.modelParameters = result;
                console.log(result)
                this.is3DLayer = this.modelParameters.is3DLayer;
                this.brain = new Brain();
                this.loadModelIntoApp();
            } catch(e) {
                console.log(e.message)
                window.alert("Please upload a correct JSON file");
            }
        }.bind(this)

        fr.readAsText(file.item(0));
    }

    /**
     * Initializes the buttons.
     */
    initGUI()
    {
        // make GUI when finished compiling the jsx file (TODO: this should be changed when precompiling)
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

    /**
     * Initializes helpful text.
     */
     initHelp()
     {
        var element = document.getElementById( 'main_body' );
        var fragment = document.createDocumentFragment();
        if ( this.is3DLayer )
        {
            var helpPoints = [ [ 'R:', 'rotate box' ],
                               [ 'S:', 'scale box' ],
                               [ 'Delete:', 'delete selected box/device' ],
                               [ 'Left click + drag:', 'orbit camera' ],
                               [ 'Right click + drag:', 'pan camera' ],
                               [ 'Click box-handle + drag:', 'connect' ],
                               [ 'Shift + click:', 'select device' ],
                               [ 'Shift + drag:', 'move device' ],
                             ];
        }
        else
        {
            var helpPoints = [ [ 'Click + drag:', 'make box' ],
                               [ 'Click box-handle + drag:', 'connect' ],
                               [ 'Delete:', 'delete selected box/device' ],
                               [ 'Shift + click:', 'select device' ],
                               [ 'Shift + drag:', 'move device' ]
                             ];
        }
        
        var helpBox = document.createElement( 'div' );
        helpBox.className = "floatBox help";
        helpBox.onclick = function() {
            var collapsed = document.getElementById('collapse-1');
            collapsed.checked = !collapsed.checked;
            console.log(collapsed.checked)
        };

        var checkbox = document.createElement( 'input' );
        checkbox.className = "collapse-open";
        checkbox.type = "checkbox";
        checkbox.id = "collapse-1";

        var heading = document.createElement( 'label' );
        heading.className = "collapse-btn";
        heading.htmlFor = "collapse-1";
        heading.innerText = 'Help';
        var list = document.createElement( 'ul' );
        list.className = "helpList";
        var linebreak = document.createElement( 'br' );
        list.appendChild( linebreak );
        helpPoints.forEach(function( point ) {
            var li = document.createElement( 'li' );
            li.innerHTML = '<strong>' + point[0] + '</strong> ' + point[1];
            list.appendChild( li );
        });

        helpBox.appendChild( checkbox );
        helpBox.appendChild( heading );
        helpBox.appendChild( list );
        fragment.appendChild( helpBox );
        element.appendChild( fragment );

     }

    /**
    * Enables or disables the orbit controls.
    *
    * @param {Bool} booleanValue OrbitControls enabled
    */
    enableOrbitControls( booleanValue )
    {
        this.orbitControls.enabled = booleanValue;
    }


    /**
     * Handles response from Server-Sent Events.
     *
     * @event
     */
    handleSimulationData( e )
    {
        try 
        {
            var data = JSON.parse(e.data);
            var recordedData = data['stream_results'];
            var deviceData = data['plot_results'];
            var t = deviceData['time'];
        }
        catch ( err )
        {
            if (data['simulation_end'])
            {
                this.onSimulationEnd();
                return;
            }
            throw err;
        }

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

    /**
     * Converts coordinates of a point in space to coordinates on screen.
     *
     * @param {Object} point_pos xyz values for position
     * @returns {Object} Object conaining xy values.
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

    /**
     * Converts coordinates on the screen to coordinates in space.
     *
     * @param {Object} screenPos xy values for position
     * @returns {Object} Object conaining xyz values.
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

    /**
     * Finds the lower left and upper right coordinates of the selected square.
     *
     * @param {Object} pos1 xy values for the first coordinates
     * @param {Object} pos2 xy values for the second coordinates
     * @returns {Object} Object containing ll (lower left) and ur (upper right)
     * coordinates.
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

    /**
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

    /**
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

    /**
     * Gets the selected value of a drop-down menu.
     *
     * @param {String} id DOM id of the drop-down menu
     * @returns {String} Currently selected value.
     */
    getSelectedDropDown( id )
    {
        var dd = document.getElementById( id );
        return dd.options[ dd.selectedIndex ].value;
    }

    /**
     * Returns the currently selected selection shape.
     */
    getSelectedShape()
    {
        if ( this.is3DLayer )
        {
            // rename shape to the 3D equivalent
            if ( this.selectedShape === "rectangular" )
            {
                return "box";
            }
            else if ( this.selectedShape === "elliptical" )
            {
                return "ellipsoidal";
            }
        }
        else
        {
            return this.selectedShape;
        }
    }

    /**
     * Gets layer and point index for a specified GID.
     *
     * @param {Number} gid GID to be found.
     * @returns {Object} Object containing indices of the layer and point of the GID.
     */
    getGIDPoint( gid )
    {
        var minGID = 0;
        for ( var l in this.layer_points )
        {
            minGID += 1; // from the GID of the layer
            var pos = this.layer_points[ l ].points.geometry.attributes.position;
            // Check to see if the GID is less than or equal to the maximum GID in the layer.
            // If so, the GID is in the layer, and we need the position and layer.
            if ( gid <= minGID + ( pos.count * this.layer_points[ l ].noElements ) )
            {
                // point is in this layer
                var pointIndex = 3 * ( gid - minGID - 1 );
                return {
                    layer: l,
                    pointIndex: pointIndex
                };
            }
            minGID += pos.count * this.layer_points[ l ].noElements;
        }
    }

    /**
     * Colours node points given their membrane potential, skipping nodes that
     * just spiked.
     *
     * @param {Object} response Containing device data from the server
     * @param {Object} spiked Array of GIDs that have spiked
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

    /**
     * Colours spiking node points.
     *
     * @param {Object} response Containing device data from the server.
     * @returns {Array} The GIDs that spiked.
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

    /**
     * Maps the membrane potential to a colour.
     *
     * @param {Number} Vm Membrane potential
     * @param {Number} minVm Minimum membrane potential of the neuron
     * @param {Number} maxVm Maximum membrane potential of the neuron
     * @returns {Array} RGB values.
     */
    mapVmToColor( Vm, minVm, maxVm )
    {
        var clampedVm = Vm;
        if ( Vm < minVm )
        {
            clampedVm = minVm;
        }
        else if ( Vm > maxVm )
        {
            clampedVm = maxVm;
        }
        var colorRG = ( clampedVm - minVm ) / ( maxVm - minVm );
        return [ colorRG, colorRG, 1.0 ];
    }

    /**
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
        requestAnimationFrame( this.render.bind(this) );
    }

    /**
     * Resets buttons at the end of the simulation.
     */
    onSimulationEnd()
    {
        document.documentElement.style.setProperty('--stream_button_width', 'calc(var(--gui_width) - 28px)');
        let abortButton = document.getElementById( "abortButton" );
        let hideButton = function(event) {
            abortButton.style.setProperty('visibility', 'hidden');
            document.getElementById( "streamButton" ).disabled = false;
            abortButton.removeEventListener('transitionend', hideButton, false);
        }
        abortButton.addEventListener("transitionend", hideButton, false);
    }

    /**
     * Creates an object with specs and connectees for each device.
     *
     * @returns {Object} Projections created.
     */
    makeProjections( convertToRoomCoordinates=false )
    {
        var projections = {};
        // projections['internal'] = this.modelParameters.projections;
        // this.$( "#infoconnected" ).html( "Gathering selections to be connected ..." );
        for ( var device in this.deviceBoxMap )
        {
            projections[ device ] = {
                specs: this.deviceBoxMap[ device ].specs,
                connectees: []
            };
            for ( var i in this.deviceBoxMap[ device ].connectees )
            {
                if ( convertToRoomCoordinates && !this.is3DLayer )
                {
                    var data = this.deviceBoxMap[ device ].connectees[ i ].getData( true );
                }
                else
                {
                    var data = this.deviceBoxMap[ device ].connectees[ i ].getData();
                }
                projections[ device ].connectees.push( data )
            }
        }
        return projections;
    }

    /**
     * Sends data to the server, creating the connections.
     */
    makeConnections()
    {
        // create object to be sent
        var projections = this.makeProjections( true );
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
                userID: this.userID,
                network: this.modelParameters,
                projections: projections
            } ),
            dataType: "json"
        } ).done( function()
        {
            this.getConnections();
        }.bind(this));
    }

    /**
     * Gets the number of connections from the server.
     */
    getConnections()
    {
        this.$.getJSON( "/connections",
        {
            userID: this.userID,
            input: "dummyData"
        } ).done( function( data )
        {
            this.$( "#infoconnected" ).html( data.connections.toString() + " connection(s)" );
        }.bind(this) );
    }

    /**
     * Runs a simulation.
     */
    runSimulation()
    {
        var projections = this.makeProjections( true );

        this.$( "#infoconnected" ).html( "Simulating ..." );

        this.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/simulate",
            data: JSON.stringify(
            {
                userID: this.userID,
                network: this.modelParameters,
                projections: projections,
                time: "100000"
            } ),
            dataType: "json"
        } ).done( function( data )
        {
            console.log( "Simulation finished" );
            console.log( data );
            this.$( "#infoconnected" ).html( "Simulation finished" );
        }.bind(this) );

    }

    /**
     * Runs a simulation.
     */
    streamSimulate()
    {
        document.getElementById( "streamButton" ).disabled = true;

        this.devicePlots.makeDevicePlot();

        this.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/streamSimulate",
            data: JSON.stringify(
            {
                userID: this.userID,
                network: this.modelParameters,
                projections: this.makeProjections( true ),
                time: "10000"
            } ),
            dataType: "json"
        } ).done( function( data )
        {
            console.log( "Simulation started successfully" );
        } );
        document.getElementById( 'abortButton' ).style.setProperty('visibility', 'visible');
        document.documentElement.style.setProperty('--stream_button_width', 'calc(0.5*var(--gui_width) - 14px)');
    }

    /**
     * Aborts the current simulation.
     */
    abortSimulation()
    {
        this.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/abortSimulation",
            data: JSON.stringify(
            {
                userID: this.userID
            } ),
            dataType: "json"
        } ).done( function( data )
        {
            console.log( data );
            this.resetBoxColors();
        }.bind(this) );
    }

    /**
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
        var projections = this.makeProjections();
        console.log( "projections", projections );

        // abort if there is nothing to save
        if ( Object.keys(projections).length === 0 )
        {
            alert("Warning: The saved file is empty. Try making some connections.");
        }

        var dlObject = {
            projections: projections
        };
        var jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent( JSON.stringify( dlObject, null, '  ' ) );
        var dlAnchorElem = document.getElementById( 'downloadAnchorElem' );
        dlAnchorElem.setAttribute( "href", jsonStr );
        dlAnchorElem.setAttribute( "download", filename + ".json" );
        dlAnchorElem.click();
    }

    /**
     * Loads selections from a file.
     */
    loadSelection()
    {
        document.getElementById( 'uploadAnchorElem' ).click();
    }

    /**
     * Creates the devices, selections, and connections, given a JSON with
     * connection data.
     */
    loadFromJSON( inputObj )
    {
        console.log(inputObj)
        var IDsCreated = [];
        for ( var device in inputObj.projections )
        {
            var deviceModel = inputObj.projections[ device ].specs.model;
            if ( deviceModel === "poisson_generator" | deviceModel === "ac_generator" )
            {
                this.makeStimulationDevice( deviceModel, device );
            }
            else
            {
                this.makeRecordingDevice( deviceModel, device );
            }

            var target = this.circle_objects[ this.circle_objects.length - 1 ];

            for ( var i in inputObj.projections[ device ].connectees )
            {
                var boxSpecs = inputObj.projections[ device ].connectees[ i ];

                // if not created yet, the box must be created
                if ( IDsCreated.indexOf( boxSpecs.uniqueID ) === -1 )
                {
                    console.log("Creating ", boxSpecs.maskShape);
                    IDsCreated.push( boxSpecs.uniqueID );
                    if ( this.is3DLayer )
                    {
                        var box = new this.SelectionBox3D( boxSpecs.width,
                                                           boxSpecs.height,
                                                           boxSpecs.depth,
                                                           boxSpecs.center,
                                                           boxSpecs.maskShape,
                                                           boxSpecs.scale );
                    }
                    else
                    {
                        var box = new this.SelectionBox( boxSpecs.ll,
                                                         boxSpecs.ur,
                                                         boxSpecs.maskShape,
                                                         boxSpecs.name );
                    }
                    box.uniqueID = boxSpecs.uniqueID;

                    // update our uniqueID count only if box.uniqueID is greater
                    this.uniqueID = ( boxSpecs.uniqueID > this.uniqueID ) ? boxSpecs.uniqueID : this.uniqueID;

                    box.layerName = boxSpecs.name;
                    box.selectedNeuronType = boxSpecs.neuronType;
                    box.selectedSynModel = boxSpecs.synModel;

                    this.selectionBoxArray.push( box );
                    //box.makeBox();
                }
                // if the box is already created, it must be found
                else
                {
                    for ( var j in this.selectionBoxArray )
                    {
                        if ( this.selectionBoxArray[ j ].uniqueID === boxSpecs.uniqueID )
                        {
                            var box = this.selectionBoxArray[ j ];
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
                this.controls.boxInFocus = box;
            }
            this.is3DLayer && this.controls.boxInFocus.setActive();
            this.is3DLayer && this.enableOrbitControls( true );
        }
        requestAnimationFrame( this.render.bind(this) );
    }

    /**
     * Event handler for file upload when loading a JSON file.
     *
     * @event
     */
    handleFileUpload( event )
    {
        console.log( "file uploaded" )
        // TODO: need some checks here
        var fr = new FileReader();
        var result;
        fr.onload = function( e )
        {
            var inputObj = JSON.parse( fr.result );
            this.loadFromJSON( inputObj );
        }.bind(this);
        fr.readAsText( event.target.files[ 0 ] );
    }

    /**
     * Creates a device, with given colour, texture map, and optional parameters.
     *
     * @param {string} device Name of the device
     * @param {Object} col Colour of the device
     * @param {Object} map Texture of the device
     * @param {Object=} params Optional parameters of the device
     */
    makeDevice( device, col, map, params = {}, name )
    {
        if ( this.is3DLayer )
        {
            var geometry = new this.THREE.SphereGeometry( 0.05, 32, 32 );
            // Need to properly map the 2D image onto the 3D sphere.
            var faceVertexUvs = geometry.faceVertexUvs[ 0 ];
            for ( var i = 0; i < faceVertexUvs.length; ++i )
            {
                var uvs = faceVertexUvs[ i ];
                var face = geometry.faces[ i ];

                for ( var j = 0; j < 3; j ++ )
                {
                    uvs[ j ].x = face.vertexNormals[ j ].x * 0.5 + 0.5;
                    uvs[ j ].y = face.vertexNormals[ j ].y * 0.5 + 0.5;
                }
            }
        }
        else
        {
            var geometry = new this.THREE.CircleBufferGeometry( 0.05, 32 );
        }

        geometry.computeBoundingSphere(); // needed for loading
        var material = new this.THREE.MeshBasicMaterial(
        {
            color: col,
            map: map
        } );

        var circle = new this.THREE.Mesh( geometry, material );
        if ( name !== undefined )
        {
            var deviceName = name;
        }
        else
        {
            var deviceName = device + "_" + String( this.deviceCounter++ );
        }
        circle.name = deviceName;

        if ( this.is3DLayer )
        {
            circle.position.x = this.newDevicePos[ this.newDeviceIndex ];
            circle.position.y = 0.75;
        }
        else
        {
            circle.position.y = this.newDevicePos[ this.newDeviceIndex ];
        }
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
        requestAnimationFrame( this.render.bind(this) );
    }

    /**
     * Creates a stimulation device.
     *
     * @param {string} device Name of the device
     */
    makeStimulationDevice( device, name )
    {
        console.log( "making stimulation device of type", device )

        if ( device === "poisson_generator" )
        {
            var col = 0xB28080
            var mapPath = "static/js/textures/poisson.png";
            var params = {
                rate: 70000.0
            }
        }
        else if ( device === "ac_generator" )
        {
            var col = 0xc9725e
            var mapPath = "static/js/textures/sinus.png";
            var params = {'amplitude': 50., 'frequency': 35.}
        }
        var map = new this.THREE.TextureLoader().load(
            mapPath,
            function( texture )  // function called when texture is loaded
            {
                requestAnimationFrame( this.render.bind(this) );
            }.bind(this)
        );
        this.makeDevice( device, col, map, params, name );
    }

    /**
     * Creates a recording device.
     *
     * @param {string} device Name of the device
     */
    makeRecordingDevice( device, name )
    {
        console.log( "making recording device of type", device )
        if ( device === "voltmeter" )
        {
            var col = 0xBDB280;
            var mapPath = "static/js/textures/voltmeter.png";
        }
        else if ( device === "spike_detector" )
        {
            var col = 0x809980;
            var mapPath = "static/js/textures/spike_detector.png";
        }
        else
        {
            var col = 0xBDB280;
            var mapPath = "static/js/textures/recording_device.png";
        }
        var map = new this.THREE.TextureLoader().load(
            mapPath,
            function( texture )  // function called when texture is loaded
            {
                requestAnimationFrame( this.render.bind(this) );
            }.bind(this)
        );
        this.makeDevice( device, col, map, {}, name );
    }

    /**
     * Creates a selection box.
     */
    makeMaskBox()
    {
        var dim = 0.2;
        var pos = {x: 0, y: 0, z: 0};
        var shape = this.getSelectedShape();

        var box = new this.SelectionBox3D( dim, dim, dim, pos, shape );
        box.uniqueID = app.uniqueID++;

        if ( this.controls.boxInFocus !== undefined )
        {
            // If we have made a box, but we have another one in focus, we need
            // to deactivate the old box.
            this.controls.boxInFocus.setInactive();
        }

        this.controls.boxInFocus = box;
        this.selectionBoxArray.push( box );
        this.controls.boxInFocus.setActive();

        console.log( "Selection box: ", box )

        this.controls.serverPrintGids();
        requestAnimationFrame( this.render.bind(this) );
    }

    /**
     * Gets the boxes of all the SelectionBox3D objects in selectionBoxArray.
     *
     * @returns {Array} SelectionBox objects.
     */
    getMaskBoxes()
    {
        var boxes = []
        for ( var i in this.selectionBoxArray )
        {
            boxes.push( this.selectionBoxArray[ i ].box );
        }
        return boxes;
    }

    /**
     * Gets all connection lines.
     *
     * @returns {Array} ConnectionLine objects.
     */
    getConnectionLines()
    {
        var lineObjects = [];
        for ( var i in this.selectionBoxArray )
        {
            for (var j = 0; j < this.selectionBoxArray[ i ].lines.length; ++j)
            {
                var line = this.selectionBoxArray[ i ].lines[ j ].curveObject;
                // Make sure boundingBox and boundingSphere are updated
                line.parentObject.curveGeometry.boundingSphere = null;
                line.parentObject.curveGeometry.boundingBox = null;
                lineObjects.push( line );
            }
        }
        return lineObjects;
    }

    /**
     * Makes all points visible.
     */
    resetVisibility()
    {
        for ( var layer in app.layer_points )
        {
            var points = this.layer_points[ layer ].points;
            var visibility = points.geometry.getAttribute( "visible" ).array;

            for ( var i = 0; i < visibility.length; ++i )
            {
                visibility[ i ] = 1.0;
            }
            points.geometry.attributes.visible.needsUpdate = true;
        }
        requestAnimationFrame( this.render.bind(this) );
    }

    /**
     * Deletes all selections and devices.
     */
    deleteEverything()
    {
        // Delete all boxes
        while ( this.selectionBoxArray.length > 0 )
        {
            this.controls.boxInFocus = this.selectionBoxArray[ 0 ];
            this.controls.deleteBox();
        }

        // Delete all devices
        while ( this.circle_objects.length > 0 )
        {
            this.controls.deviceInFocus = this.circle_objects[0];
            this.controls.deleteDevice();
        }

        requestAnimationFrame( this.render.bind(this) );
    }

    /**
     * Renders the scene.
     */
    render()
    {
        console.log('Rendering..')
        if ( this.orbitControls )
        {
            this.orbitControls.update();
        }

        this.renderer.clear();
        this.renderer.render( this.outlineScene, this.camera );
        this.renderer.render( this.scene, this.camera );

        if ( this.axisRenderer !== undefined )
        {
            let normalizedCamera = this.camera.position.clone().normalize();
            this.axisCamera.position.copy( normalizedCamera.multiplyScalar(5) );
            this.axisCamera.lookAt( this.axisScene.position );
            for (var i = 0; i < this.labelMeshes.length; ++i)
            {
                this.labelMeshes[ i ].lookAt(this.axisCamera.position)
            }
            this.axisRenderer.render( this.axisScene, this.axisCamera );
        }

        if ( !this.layerNamesMade && !this.is3DLayer && this.brain )
        {
            this.brain.make_layer_names();
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
