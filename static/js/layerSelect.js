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

        this.modelName = "";

        // 3D layer is default.
        this.is3DLayer = true;

        this.isLFP = false;

        // Callback functions to GUI, function definitions in GUI.jsx
        this.synapseNeuronModelCallback = function() {};
        this.setGuiState = function() {};

        this.deviceCounter = 1;

        this.uniqueID = 1;
        this.newDevicePos = [ 0.0, 0.15, -0.15, 0.3, -0.3 ];
        this.newDeviceIndex = 0;

        this.circle_objects = [];

        this.deviceBoxMap = {};

        this.nSelected = 0;

        this.prevStates = [];
        this.redoStates = [];
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

        // HBP Authentication"ID, must be defined before we initiate anything.
        this.userID = userID;
        console.log("layerSelect userID:", this.userID);
        this.storage = hbpStorage();

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
        this.serverUpdateEvent = new EventSource( "/simulationData/" + this.userID);
        this.serverUpdateEvent.onmessage = this.handleSimulationData.bind(this);

        // Sockets
        let host = `https://${window.location.host}/message/${this.userID}`;
        console.log('Connecting socket to ' + host);
        this.statusSocket = io(host);
        this.statusSocket.on('connect', function(){
            console.log('Socket connected');
        });
        this.statusSocket.on('disconnect', function(){
            console.log('Socket disconnected');
        });
        this.statusSocket.on('message', function(data){
            this.showModalMessage(`The server encountered the following error: ${data.message}`);
        }.bind(this));

        this.stateCheckpoint();

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
        container2.appendChild( this.axisRenderer.domElement );

        // Scene
        this.axisScene = new this.THREE.Scene();

        // Camera
        this.axisCamera = new this.THREE.OrthographicCamera(-1, 1, 1, -1, 0.0, 1000);
        this.axisCamera.up = this.camera.up; // Important!

        // Axes
        var axes = new this.THREE.AxisHelper( 0.9 );
        axes.material.linewidth = 2;
        this.axisScene.add(axes);

        // Axis labels
        var loader = new THREE.FontLoader();
        var labelSpecs = {x: {text: 'y', color: 0xff0000, position: {x: 0.82, y: 0.05, z: 0}},
                          y: {text: 'z', color: 0x00ff00, position: {x: 0.05, y: 0.82, z: -0.05}},
                          z: {text: 'x', color: 0x3333ff, position: {x: 0, y: 0.05, z: 0.82}},
                         };
        this.labelMeshes = [];
        loader.load( 'static/js/lib/three/examples/fonts/helvetiker_regular.typeface.json', ( font ) => {
            for (var label in labelSpecs)
            {
                let specs = labelSpecs[ label ];
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
                mesh.position.x = specs.position.x;
                mesh.position.y = specs.position.y;
                mesh.position.z = specs.position.z;
                this.labelMeshes.push( mesh );
                this.axisScene.add(mesh);
            }

        });
    }

    /**
    * Finds out which of the model buttons we chose, and sends information to Brain, which
    * then displays the chosen model. Can choose Brunel model, Hill-Tononi or load your own.
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
        else if ( target.id === 'loadStorage' )
        {
            console.log("Storage model!");
            this.showLoadingOverlay( '' );
            this.setGuiState( { modalSelection: true, modalHead: 'Load model',
                                handleSubmit: this.handleModelFileFromStorage.bind( this ) } );
            this.storage.getFilesInFolder( ( data ) => {
                // Display files.
                for (let key in data)
                {
                    if ( !key.endsWith( ".json" ) )
                    {
                        delete data[ key ];
                    }
                }
                if (Object.keys(data).length === 0)
                {
                    this.setGuiState({selectionDisabledText: "No files found"});
                }
                else
                {
                    this.setGuiState( { loadContents: data } );
                }
            }, (message) => {
                this.setGuiState({selectionDisabledText: message});
            });
        }
        else if ( target.id === "LFP" )
        {
            console.log("LFP!");
            this.isLFP = true;
            JSONstring = "/static/examples/Potjans_Diesmann_converted.json";
            this.loadModelIntoApp( JSONstring, this.initLFP.bind( this ) );
            this.deviceBoxMap.LFP = {
                specs:
                {
                    model: "LFP",
                    params: {}
                },
                connectees: []
            };
        }
        else
        {
            return;
        }
    }

    /**
    * Creates a model name.
    *
    * @param {String} path or name of model to be used
    */
    makeModelName(name)
    {
        var startIndx = name.lastIndexOf('/');
        var endIndx = name.search('.json');
        if (endIndx == -1)  // If the file name doesn't end with '.json'.
        {
            endIndx = name.length;
        }
        this.modelName = this.isLFP ? `${name.slice(startIndx + 1,endIndx)}_LFP` : name.slice(startIndx + 1,endIndx);
    }

    /**
    * Creates a file name to be used when saving. Uses the name of the model and
    * the current data and time.
    *
    * @returns {String} File name consisting of model name and current date and time.
    */
    getFileName()
    {
        var currentDate = new Date();
        var sec = currentDate.getSeconds();
        var min = currentDate.getMinutes();
        var hour = currentDate.getHours();
        var day = currentDate.getDate();
        var month = currentDate.getMonth() + 1;
        var year = currentDate.getFullYear();
        var dateTime = day + '-' + month + '-' + year + '--' + hour + '-' + min + '-' + sec;

        return this.modelName + '--' + dateTime;
    }

    /**
    * Loads the selected model into the app.
    *
    * @param {String} modelFileName Name or path of the model file
    * @param {Function=} postBrain Function to call when the model is loaded
    */
    loadModelIntoApp(modelFileName, postBrain=Function)
    {
        console.log(modelFileName);
        var guiWidth = window.getComputedStyle( document.body ).getPropertyValue( '--gui_target_width' );
        document.documentElement.style.setProperty('--gui_width', guiWidth);
        this.controls.onWindowResize();
        this.showLoadingOverlay( 'Setting up NEST...' );

        // If the modelParameters aren't loaded already, load them from the file
        if (this.modelParameters === undefined){
            this.$.getJSON( modelFileName, function( data )
            {
                this.modelParameters = data;
                this.brain = new Brain();
                try {
                    this.makeModelName(this.modelParameters.modelName);
                } catch(err) {
                    this.makeModelName(modelFileName);
                }
                postBrain();
            }.bind(this) );
        } else {
            try {
                this.makeModelName(this.modelParameters.modelName);
            } catch(err) {
                this.makeModelName(modelFileName);
            }
        }
        
        // Define orbit controls system here, because we need to know if we have
        // a 2D or 3D model before defining the controls
        // as we do not want to define them if we have a 2D model.
        var coordinateHelper;
        if ( this.is3DLayer )
        {
            this.orbitControls = new this.THREE.OrbitControls( this.camera, this.renderer.domElement );
            coordinateHelper = document.getElementById('coordinateHelper');
            coordinateHelper.style.display = "block";
        }
        else
        {
            // remove the axis window
            coordinateHelper = document.getElementById('coordinateHelper');
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
    * Loads a model from JSON.
    *
    * @param {Object} modelJson Model to load
    */
    loadModelJson (modelJson, name) {
        if ( !modelJson.hasOwnProperty('layers') ||
             !modelJson.hasOwnProperty('models') ||
             !modelJson.hasOwnProperty('syn_models') ||
             !modelJson.hasOwnProperty('modelName') ||
             !modelJson.hasOwnProperty('projections') )
        {
            this.showModalMessage("Please choose a model in correct JSON format.");
            return;
        }
        this.modelParameters = modelJson;
        this.is3DLayer = this.modelParameters.is3DLayer;
        this.brain = new Brain();
        this.loadModelIntoApp(name);
    }

    /**
    * Loads a model file.
    *
    * @param {Object} file File to load
    */
    loadModelFile (file) {
        var fr = new FileReader();
        fr.onload = function(e) {
            try{
                var result = JSON.parse(e.target.result);
                this.loadModelJson(result, file.name);
            } catch(err) {
                console.log(err.message);
                this.showModalMessage("Please upload a correct JSON file");
            }
        }.bind(this);
        fr.readAsText(file);
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
        this.loadModelFile(file.item(0));
    }

    /**
    * Function to handle model loading from storage.
    */
    handleModelFileFromStorage () {
        this.closeModal();
        this.showLoadingOverlay('Loading model...');
        let dd = document.getElementById( 'loadFiles' );
        let selectedUuid = dd.options[ dd.selectedIndex ].value;
        let fileName = dd.options[ dd.selectedIndex ].innerText;
        this.storage.loadFromFile(selectedUuid, (data)=>{
            this.loadModelJson(data, fileName);
        });
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
        var helpPoints;
        if ( this.is3DLayer )
        {
            helpPoints = [ [ 'R:', 'rotate box' ],
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
            helpPoints = [ [ 'Click + drag:', 'make box' ],
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
            console.log(collapsed.checked);
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
    * Sets up visuals and selection for LFP.
    */
    initLFP()
    {
        // Shifting the top into L1
        var rodTop = 0.1 + Math.max(...Array.from(Object.keys(this.layer_points), key => this.layer_points[key].points.geometry.boundingBox.max.y));
        var rodBottom = Math.min(...Array.from(Object.keys(this.layer_points), key => this.layer_points[key].points.geometry.boundingBox.min.y));
        console.log(rodTop);
        console.log(rodBottom);
        var lfpRodMaterial = new this.THREE.LineBasicMaterial({color: 0x00ff00});
        var lfpRodGeometry = new this.THREE.Geometry();
        lfpRodGeometry.vertices.push(
            new this.THREE.Vector3( 0, rodTop, 0 ),
            new this.THREE.Vector3( 0, rodBottom, 0 )
        );
        var lfpRod = new this.THREE.Line( lfpRodGeometry, lfpRodMaterial );
        this.scene.add( lfpRod );

        var texture = new app.THREE.TextureLoader().load( "static/js/textures/disc.png" );
        var lfpPointMaterial = new this.THREE.PointsMaterial( { size: 0.1, map: texture, alphaTest: 0.5, transparent: true, color: 0x00ff00 } );
        var lfpPointGeometry = new this.THREE.Geometry();
        var delta = Math.abs( rodTop - rodBottom ) / 15.0;
        for ( let i=0; i<16; i++ )
        {
            let vertex = new this.THREE.Vector3();
            vertex.y = rodBottom + i*delta;
            lfpPointGeometry.vertices.push( vertex );
        }
        var lfpPoints = new this.THREE.Points( lfpPointGeometry, lfpPointMaterial );
        this.scene.add( lfpPoints );
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
    * Shows loading overlay.
    *
    * @param {String} message Message to display in the overlay
    */
    showLoadingOverlay( message )
    {
        document.getElementById("loadingText").innerHTML = message;
        document.getElementById("loadingOverlay").style.display = "block";
    }

    /**
    * Hides loading overlay.
    */
    hideLoadingOverlay()
    {
        document.getElementById("loadingOverlay").style.display = "none";
    }

    /**
     * Handles response from Server-Sent Events.
     *
     * @event
     */
    handleSimulationData( e )
    {
        var data;
        var recordedData;
        var deviceData;
        var time;
        try 
        {
            data = JSON.parse(e.data);
            recordedData = data.stream_results;
            deviceData = data.plot_results;
            time = deviceData.time;
        }
        catch ( err )
        {
            if (data.simulation_end)
            {
                this.onSimulationEnd();
                return;
            }
            throw err;
        }

        this.hideLoadingOverlay();
        this.$("#infoconnected").html( "Simulating | " + time.toString() + " ms" );

        // Colour results:
        var spiked = this.colorFromSpike(recordedData);
        this.colorFromVm(recordedData, spiked);

        for ( var layer in this.layer_points )
        {
            this.layer_points[ layer ].points.geometry.attributes.customColor.needsUpdate = true;
        }

        // Plot results:
        if ( deviceData.spike_det.senders.length >= 1 )
        {
            this.devicePlots.makeSpikeTrain(deviceData.spike_det, time);
        }
        if ( deviceData.rec_dev.times.length >= 1 )
        {
            this.devicePlots.makeVoltmeterPlot(deviceData.rec_dev, time);
        }
        if ( this.isLFP )
        {
            this.devicePlots.makeLFPPlot(deviceData.lfp_det);
        }
    }

    /**
     * Converts coordinates of a point in space to coordinates on screen.
     *
     * @param {Object} point_pos xyz values for position
     * @returns {Object} Object containing xy values.
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
     * @returns {Object} Object containing xyz values.
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

        return pos;
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
     * @returns {String} selected shape
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
                        var colorVm = this.mapVmToColor( V_m, -70.0, -50.0 );

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
     * Handles end of simulation. Resets buttons, text and makes it possible to 
     * modify the system again.
     */
    onSimulationEnd()
    {
        document.documentElement.style.setProperty('--stream_button_width', 'calc(var(--gui_width) - 28px)');
        let abortButton = document.getElementById( "abortButton" );
        let hideButton = function(event) {
            abortButton.style.setProperty('visibility', 'hidden');
            document.getElementById( "streamButton" ).disabled = false;
            abortButton.removeEventListener('transitionend', hideButton, false);
        };
        abortButton.addEventListener("transitionend", hideButton, false);
        this.$( "#infoconnected" ).html( "Simulation finished" );
        this.setModifiable( true );
    }

    /**
     * Creates an object with specs and connectees for each device.
     *
     * @returns {Object} Projections created.
     */
    makeProjections( convertToRoomCoordinates=false )
    {
        var projections = {};
        for ( var device in this.deviceBoxMap )
        {
            projections[ device ] = {
                specs: this.deviceBoxMap[ device ].specs,
                connectees: []
            };
            for ( var i in this.deviceBoxMap[ device ].connectees )
            {
                var data;
                if ( convertToRoomCoordinates && !this.is3DLayer )
                {
                    data = this.deviceBoxMap[ device ].connectees[ i ].getData( true );
                }
                else
                {
                    data = this.deviceBoxMap[ device ].connectees[ i ].getData();
                }
                projections[ device ].connectees.push( data );
            }
        }
        return projections;
    }

    /**
     * Creates an object with current devices, selections, and connections.
     *
     * @returns {Object} Current state.
     */
    getCurrentState()
    {
        var state = {devices: [], selections: []};
        for ( var device in this.deviceBoxMap )
        {
            let savingDevice = app.$.extend( {}, this.deviceBoxMap[ device ] );
            savingDevice.name = device;

            for ( var mesh of this.circle_objects )
            {
                if ( mesh.name === device )
                {
                    savingDevice.position = new this.THREE.Vector3().copy( mesh.position );
                    break;
                }
            }

            savingDevice.connectees = [];
            for ( var connectee of this.deviceBoxMap[ device ].connectees )
            {
                savingDevice.connectees.push( connectee.uniqueID );
            }
            state.devices.push( savingDevice );
        }
        for ( var box of this.selectionBoxArray )
        {
            state.selections.push( box.getData() );
        }
        return state;
    }

    /**
     * Sends data to the server, creating the connections.
     */
    makeConnections()
    {
        // create object to be sent
        var projections = this.makeProjections( true );
        console.log( projections );

        this.$( "#infoconnected" ).html( "Connecting..." );
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

    /**
     * Runs a streaming simulation. Results from recording devices are returned
     * to the client.
     */
    streamSimulate()
    {
        document.getElementById( "streamButton" ).disabled = true;

        var devices = {};
        var model;
        for ( var devName in this.deviceBoxMap)
        {
            model = this.deviceBoxMap[devName].specs.model;
            if (model === 'LFP' && this.deviceBoxMap[devName].connectees.length === 0)
            {
                continue;
            }
            if (!devices.hasOwnProperty(model))
            {
                devices[model] = true;
            }
        }
        this.devicePlots.makeDevicePlot(devices);

        var noResults = true;
        for ( var device in this.deviceBoxMap )
        {
            model = this.deviceBoxMap[ device ].specs.model;
            if ( ( model === "voltmeter" || model === "spike_detector" ) &&
                 this.deviceBoxMap[ device ].connectees.length > 0 )
            {
                noResults = false;
                this.showLoadingOverlay("Connecting...");
                break;
            }
        }
        noResults && this.$("#infoconnected").html( "Simulating..." );
        this.setModifiable( false );

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
                time: "20000"
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
     * Aborts the current streaming simulation.
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
     * Saves selections to a file in HBP colaboratory storage.
     */
    saveSelection()
    {
        this.showLoadingOverlay('Saving projections...');
        this.setGuiState({saving: true});
        let state = this.getCurrentState();
        state.metadata = {type: 'selection',
                          model: this.modelName};
        console.log( "state", state );

        var filename = this.getFileName();
        this.storage.saveToFile(filename, state, ()=>{
            this.setGuiState({saving: false});
            this.showModalMessage(`Saved to "${filename}.json".`);
        });
    }

    /**
     * Load selections from a file in HBP colaboratory storage. This function 
     * gets files from storage and displays them in a modal.
     */
    loadSelection()
    {
        this.setGuiState({modalSelection: true, modalHead: 'Load projections',
                          handleSubmit: this.loadSelected.bind(this)});
        this.showLoadingOverlay('');
        this.storage.getFilesInFolder( ( data ) => {
            // Display files.
            for (let key in data)
            {
                if ( !key.endsWith( ".json" ) )
                {
                    delete data[ key ];
                }
            }
            if (Object.keys(data).length === 0)
            {
                this.setGuiState({selectionDisabledText: "No files found"});
            }
            else
            {
                this.setGuiState( { loadContents: data } );
            }
        }, (message) => {
            this.setGuiState({selectionDisabledText: message});
        });
    }

    /**
     * Loads the selected file from HBP colaboratory storage.
     */
    loadSelected()
    {
        console.log('Load selected');
        this.closeModal();
        this.showLoadingOverlay('Loading projections...');
        let selectedFile = this.getSelectedDropDown('loadFiles');
        console.log('Selected: ', selectedFile);
        this.storage.loadFromFile(selectedFile, (data)=>{
            if ( data.metadata )
            {
                if ( data.metadata.type !== 'selection' )
                {
                    this.showModalMessage(`Cannot load! File contains ${data.metadata.type}, not selection.`);
                }
                else if (data.metadata.model === this.modelName)
                {
                    this.loadState(data);
                    this.hideLoadingOverlay();
                }
                else
                {
                    this.showModalMessage(`Cannot load! Wrong model of selection: ${data.metadata.model} not ${this.modelName}`);
                }
            }
            else
            {
                this.showModalMessage('Cannot load! File has no metadata.');
            }
        });
    }

    /**
     * Shows a message in a modal.
     */
    showModalMessage( message )
    {
        // TODO: Add message subheading inside the message modal body
        this.showLoadingOverlay('');
        this.setGuiState({modalMessage: message, modalHead: 'Message'});
    }

    /**
     * Close the modal.
     */
    closeModal()
    {
        this.setGuiState({modalSelection: false, loadContents: {},
                          modalMessage: '', modalHead: '',
                          selectionDisabledText: 'Loading...'});
        this.hideLoadingOverlay();
    }


    /**
     * Set modifiable system. If true, the app operates as normal. If false,
     * restricts to non-modifying actions, e.g. moving the camera or 
     * aborting the simulation.
     */
    setModifiable( mod )
    {
        // Make it possible/impossible to select something
        if ( !mod )
        {
            // Unselect device and line
            this.controls.deviceInFocus = undefined;
            this.controls.removeOutline();
            this.controls.lineInFocus && this.controls.lineInFocus.setInactive();
            // Unselect box
            if ( this.controls.boxInFocus )
            {
                this.controls.boxInFocus.setInactive();
                this.controls.boxInFocus = undefined;
            }
            this.resetVisibility();
        }
        this.controls.selectable = mod;
        // Enable/disable relevant GUI buttons
        this.setGuiState({mod: mod});
    }

    /**
     * Creates devices, selections, and connections from a state.
     */
    loadState( state )
    {
        if ( !state.hasOwnProperty('devices') ||
             !state.hasOwnProperty('selections') )
        {
            this.showModalMessage("Could not load state: State object does not contain the necessary properties.");
            return;
        }

        // TODO: Only load if there are no selections and no devices (except LFP).
        // Load selection boxes
        var box;
        var target;
        for ( var boxSpecs of state.selections )
        {
            if ( this.is3DLayer )
            {
                box = new this.SelectionBox3D( boxSpecs.width,
                                                   boxSpecs.height,
                                                   boxSpecs.depth,
                                                   boxSpecs.center,
                                                   boxSpecs.maskShape,
                                                   boxSpecs.scale,
                                                   boxSpecs.lfp );
            }
            else
            {
                box = new this.SelectionBox( boxSpecs.ll,
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
            if ( this.is3DLayer )
            {
                box.box.setRotationFromEuler(new this.THREE.Euler(boxSpecs.rotationEuler.x,
                                                              boxSpecs.rotationEuler.y,
                                                              boxSpecs.rotationEuler.z,
                                                              boxSpecs.rotationEuler.order));
                box.updateAzimuthAndPolarAngle();
                box.updateBorderLines();
            }
            box.updateColors();
            box.setInactive();

            this.selectionBoxArray.push( box );
        }
        // Load devices and connections.
        for ( var currentDevice of state.devices )
        {
            var deviceModel = currentDevice.specs.model;
            // LFP device is created as part of the model.
            if ( deviceModel != 'LFP' )
            {
                if ( deviceModel === "poisson_generator" || deviceModel === "ac_generator" )
                {
                    this.makeStimulationDevice( deviceModel, currentDevice.name, true );
                }
                else
                {
                    this.makeRecordingDevice( deviceModel, currentDevice.name, true );
                }
                // Set target to this device's mesh
                target = this.circle_objects[ this.circle_objects.length - 1 ];
                target.position.x = currentDevice.position.x;
                target.position.y = currentDevice.position.y;
                target.position.z = currentDevice.position.z;
                this.controls.makeOutline( target );
            }
            // Create connections to this device.
            for (var id of currentDevice.connectees )
            {
                // Find box from id.
                for ( box of this.selectionBoxArray )
                {
                    if ( box.uniqueID == id )
                    {
                        break;
                    }
                }
                if ( deviceModel != 'LFP' )
                {
                    box.makeLine();
                    var radius = target.geometry.boundingSphere.radius;
                    box.setLineTarget( target.name );
                    box.lineToDevice( target.position, radius, target.name );
                }
                this.deviceBoxMap[ currentDevice.name ].connectees.push( box );
            }
        }
        this.controls.deviceInFocus = undefined;
        this.controls.removeOutline();

        this.is3DLayer && this.enableOrbitControls( true );
        this.is3DLayer && this.resetVisibility();
    }

    /**
     * Event handler for file upload when loading a JSON file.
     *
     * @event
     */
    handleFileUpload( event )
    {
        // TODO: This function may be obsolete.

        console.log( "file uploaded" );
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
     * @param {string} device Model of the device
     * @param {Object} col Colour of the device
     * @param {Object} map Texture of the device
     * @param {Object=} params Optional parameters of the device
     * @param {String} name Device name
     */
    makeDevice( device, col, map, params, name )
    {
        var geometry;
        var deviceName;
        if ( this.is3DLayer )
        {
            geometry = new this.THREE.SphereGeometry( 0.05, 32, 32 );
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
            geometry = new this.THREE.CircleBufferGeometry( 0.05, 32 );
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
            deviceName = name;
        }
        else
        {
            deviceName = device + "_" + String( this.deviceCounter++ );
        }
        circle.name = deviceName;

        // Alternate positions of created devices.
        circle.position.y = this.newDevicePos[ this.newDeviceIndex ];
        if ( this.is3DLayer )
        {
            // Shift position out of the layers.
            circle.position.x = 0.75;
        }
        this.newDeviceIndex = ( this.newDeviceIndex + 1 === this.newDevicePos.length ) ? 0 : ++this.newDeviceIndex;

        this.scene.add( circle );
        this.circle_objects.push( circle );

        if ( this.controls.boxInFocus !== undefined )
        {
            this.controls.boxInFocus.setInactive();
            this.controls.boxInFocus = undefined;
        }
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
    makeStimulationDevice( device, name, noCheckpoint=false )
    {
        console.log( "making stimulation device of type", device );

        var col;
        var mapPath;
        var params;
        if ( device === "poisson_generator" )
        {
            col = 0xB28080;
            mapPath = "static/js/textures/poisson.png";
            params = {
                rate: 210000.0
            };
        }
        else if ( device === "ac_generator" )
        {
            col = 0xc9725e;
            mapPath = "static/js/textures/sinus.png";
            params = {'amplitude': 50.0, 'frequency': 35.0};
        }
        var map = new this.THREE.TextureLoader().load(
            mapPath,
            function( texture )  // function called when texture is loaded
            {
                requestAnimationFrame( this.render.bind(this) );
            }.bind(this)
        );
        this.makeDevice( device, col, map, params, name );
        !noCheckpoint && app.stateCheckpoint();
    }

    /**
     * Creates a recording device.
     *
     * @param {string} device Name of the device
     */
    makeRecordingDevice( device, name, noCheckpoint=false )
    {
        console.log( "making recording device of type", device );

        var col;
        var mapPath;
        var params = {};
        if ( device === "voltmeter" )
        {
            col = 0xBDB280;
            mapPath = "static/js/textures/voltmeter.png";
        }
        else if ( device === "spike_detector" )
        {
            col = 0x809980;
            mapPath = "static/js/textures/spike_detector.png";
        }
        else
        {
            col = 0xBDB280;
            mapPath = "static/js/textures/recording_device.png";
        }
        var map = new this.THREE.TextureLoader().load(
            mapPath,
            function( texture )  // function called when texture is loaded
            {
                requestAnimationFrame( this.render.bind(this) );
            }.bind(this)
        );
        this.makeDevice( device, col, map, params, name );
        !noCheckpoint && app.stateCheckpoint();
    }

    /**
     * Creates a selection box.
     */
    makeMaskBox(lfp=false)
    {
        var dim = 0.2;
        var pos = {x: 0, y: 0, z: 0};
        var shape = this.getSelectedShape();

        var box = new this.SelectionBox3D( dim, dim, dim, pos, shape, undefined, lfp);
        
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

        if ( lfp )
        {
            this.deviceBoxMap.LFP.connectees.push( this.controls.boxInFocus );
        }

        console.log( "Selection box: ", box );

        this.controls.serverPrintGids();
        requestAnimationFrame( this.render.bind(this) );
        this.stateCheckpoint();
    }

    /**
     * Gets the boxes of all the SelectionBox3D objects in selectionBoxArray.
     *
     * @returns {Array} SelectionBox objects.
     */
    getMaskBoxes()
    {
        var boxes = [];
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
     * Saves current state to an array containing previous states.
     */
    stateCheckpoint()
    {
        this.prevStates.push( this.getCurrentState() );
        this.redoStates = [];
        this.setGuiState({undoDisabled: this.prevStates.length === 1});
        this.setGuiState({redoDisabled: this.redoStates.length === 0});
    }

    /**
     * Undoes previous action.
     */
    undo()
    {
        // Make sure the initial state is always in the array.
        if ( this.prevStates.length === 1 )
        {
            return;
        }
        this.deleteEverything();
        this.redoStates.push( this.prevStates.pop() );
        this.setGuiState({undoDisabled: this.prevStates.length === 1,
                          redoDisabled: false});
        this.loadState( this.prevStates[ this.prevStates.length - 1 ] );
    }

    /**
     * Undoes previous undo.
     */
    redo()
    {
        // Make sure there is a state to redo.
        if ( this.redoStates.length === 0 )
        {
            return;
        }
        this.deleteEverything();
        this.prevStates.push( this.redoStates.pop() );
        this.setGuiState({undoDisabled: false,
                          redoDisabled: this.redoStates.length === 0});
        this.loadState( this.prevStates[ this.prevStates.length - 1 ] );
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
        console.log('Rendering..');
        if ( this.orbitControls )
        {
            this.orbitControls.update();
        }

        this.renderer.clear();
        this.renderer.render( this.outlineScene, this.camera );
        this.renderer.render( this.scene, this.camera );

        var i;
        if ( this.axisRenderer !== undefined )
        {
            let normalizedCamera = this.camera.position.clone().normalize();
            this.axisCamera.position.copy( normalizedCamera.multiplyScalar(5) );
            this.axisCamera.lookAt( this.axisScene.position );
            for (i = 0; i < this.labelMeshes.length; ++i)
            {
                this.labelMeshes[ i ].lookAt(this.axisCamera.position);
            }
            this.axisRenderer.render( this.axisScene, this.axisCamera );
        }

        if ( this.is3DLayer )
        {
            for (i = 0; i < this.circle_objects.length; ++i)
            {
                this.circle_objects[ i ].lookAt(this.camera.position);
            }
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
