const App = require('../static/js/layerSelect.js');
console.log = jest.fn();  // suppress output

var JSONstring = '../static/examples/brunel_converted.json';
var MODELPARAMETERS = require(JSONstring)

beforeEach(() => {
    app = new App();
    app.is3DLayer = MODELPARAMETERS.is3DLayer;
});

test('Test initTHREEScene', () => {
    app.container = document.getElementById( 'main_body' );
    app.THREE = require('three');  // import THREE into the app
    app.$ = require('jquery');  // import jquery into the app
    var brain = require('../static/js/makeBrainRepresentation.js');
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.initTHREEScene();
    expect(app.camera).toBeInstanceOf(app.THREE.PerspectiveCamera);
    expect(app.scene).toBeInstanceOf(app.THREE.Scene);
    expect(app.outlineScene).toBeInstanceOf(app.THREE.Scene);
    expect(app.color).toBeInstanceOf(app.THREE.Color);
});

test('Test initTHREERenderer', () => {
    app.THREE = require('three');  // import THREE into the app
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    // make a mock WebGLRenderer
    var mockWebGLRenderer = function () {
        return {
            setPixelRatio: jest.fn(),
            setSize: jest.fn()
        };
    };
    app.THREE.WebGLRenderer = mockWebGLRenderer;
    app.initTHREERenderer();
});

test('Test initContainer', () => {
    document.body.innerHTML =
        '<div id="main_body">' +
        '        <div id="info">' +
        '            NEST Connection App' +
        '            <div id="infoselected"></div>' +
        '            <div id="infoconnected"></div>' +
        '        </div>' +
        '        <div id="select-square"></div>' +
        '        <div id="spikeTrain"></div>' +
        '        <div id="coordinateHelper"></div>' +
        '</div>' +
        '<div id="startButtons">' +
        '    Press one of the buttons below to choose layer! </br>' +
        '    <div class="button-group" id="modelButtons>' +
        '        <button class ="button" id="brunel">Brunel</button>' +
        '        <button class ="button" id="hillTononi">Hill-Tononi</button>' +
        '        <button class ="button" id="loadOwn">Load your own</button>' +
        '        <input id="loadLayer" type="file" value="Import" style="display: none;"/>' +
        '    </div>' +
        '</div>' +
        '<div id="gui_body">' +
        '    <!-- Contents will be filled by React. -->' +
        '</div>';
    console.error = jest.fn();  // suppress errors ("CanvasRenderer has been moved..")
    app.THREE = require('three');  // import THREE into the app
    app.renderer = new app.THREE.CanvasRenderer();
    app.container = document.getElementById( 'main_body' );
    app.initContainer();
});

test('Test initGUI', () => {
    makeGUI = jest.fn();
    app.initGUI();
    //expect(makeGUI.mock.calls.length).toBe(1);
});


test('Test main init', () => {
    console.error = jest.fn();  // suppress errors ("CanvasRenderer has been moved..")

    app.renderer = {
        domElement: "domElement"
    }
    $ = jest.fn();
    THREE = jest.fn();
    SelectionBox = jest.fn();
    SelectionBox3D = jest.fn();
    app.initTHREEScene = jest.fn();
    app.initTHREERenderer = jest.fn();
    app.initContainer = jest.fn();
    app.initParameters = jest.fn();
    app.initGUI = jest.fn();
    app.initSecondCamera = jest.fn();
    Controls = jest.fn();
    DevicePlots = jest.fn();
    EventSource = jest.fn();
    app.handleMessage = jest.fn();
    app.init();
});

test('Test makeBrainRepresentation', () => {
    app.THREE = require('three');  // import THREE into the app
    app.$ = require('jquery');  // import jquery into the app
    var brain = require('../static/js/makeBrainRepresentation.js');
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.renderer = {
        getSize: function()
        {
            return {height: 600,
                    width: 800}
        },
    }
    app.initTHREEScene();
    app.modelParameters = MODELPARAMETERS;
    app.brain = new brain(app.camera, app.scene);
    app.brain.make_layer_names();
    expect(app.scene.children.length).toBe(2);
});

test('Test handleMessage', () => {
    // make mock functions
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.colorFromSpike = jest.fn();
    app.colorFromVm = jest.fn();
    app.layer_points = {
        "layer1": {points: {geometry: {attributes: {customColor: {needsUpdate: false}}}}},
        "layer2": {points: {geometry: {attributes: {customColor: {needsUpdate: false}}}}}
    };
    app.devicePlots = {
        makeSpikeTrain: jest.fn(),
        makeVoltmeterPlot: jest.fn()
    }
    let e = {
        data: '{"plot_results":{"rec_dev":{"V_m":[[-70,-70,-70,-70],[-69.96517328370601,-69.97058344797023,-69.97411530833868,-69.96469057409006],[-69.73877348405927,-69.76270592265867,-69.79392409469823,-69.73867196291485],[-69.26640287104746,-69.31914920527167,-69.37309320711462,-69.28635861129042],[-68.54020218833176,-68.68615389078396,-68.73379468001576,-68.63662805565743],[-67.63383563570525,-67.92980437246618,-67.95385333973516,-67.82933377509188],[-66.67929187893259,-67.1040325153895,-67.08225155921052,-66.95964160447717],[-65.70305549046087,-66.23770870006803,-66.1863651933137,-66.07525044362609],[-64.72642634511188,-65.36638351257704,-65.29973570268487,-65.18145733388278]],"times":[1,2,3,4,5,6,7,8,9]},"spike_det":{"senders":[1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499],"times":[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9]},"time":10},"stream_results":{"voltmeter_2":{"1458":[9,-65],"1459":[9,-65],"1498":[9,-65],"1499":[9,-65]}}}'
    }
    let parsedData = JSON.parse(e.data);
    app.handleMessage( e );

    expect(app.colorFromSpike.mock.calls[0][0]).toMatchObject(parsedData['stream_results']);
    expect(app.colorFromVm.mock.calls[0][0]).toMatchObject(parsedData['stream_results']);
    expect(app.layer_points['layer1'].points.geometry.attributes.customColor.needsUpdate).toBe(true);
    expect(app.layer_points['layer2'].points.geometry.attributes.customColor.needsUpdate).toBe(true);
    expect(app.devicePlots.makeSpikeTrain.mock.calls[0]).toEqual([{
        senders: [1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499,1458,1459,1498,1499],
        times: [1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8,8,8,9,9,9,9]}, 10]);
    expect(app.devicePlots.makeVoltmeterPlot.mock.calls[0]).toEqual([{
        V_m: [[-70,-70,-70,-70],[-69.96517328370601,-69.97058344797023,-69.97411530833868,-69.96469057409006],[-69.73877348405927,-69.76270592265867,-69.79392409469823,-69.73867196291485],[-69.26640287104746,-69.31914920527167,-69.37309320711462,-69.28635861129042],[-68.54020218833176,-68.68615389078396,-68.73379468001576,-68.63662805565743],[-67.63383563570525,-67.92980437246618,-67.95385333973516,-67.82933377509188],[-66.67929187893259,-67.1040325153895,-67.08225155921052,-66.95964160447717],[-65.70305549046087,-66.23770870006803,-66.1863651933137,-66.07525044362609],[-64.72642634511188,-65.36638351257704,-65.29973570268487,-65.18145733388278]],
        times: [1,2,3,4,5,6,7,8,9]}, 10]);
});

test('Test toScreenXY', () => {
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.THREE = require('three');  // import THREE into the app
    app.initTHREEScene();
    app.camera.position.set( 0, 0, 2.5 );

    app.renderer = {
        getSize: function()
        {
            return {height: 600,
                    width: 800}
        },
    }
    app.camera.aspect = app.renderer.getSize().width / app.renderer.getSize().height;
    app.camera.updateProjectionMatrix();

    expect(app.camera.aspect).toBe(4/3);
    expect(app.renderer.getSize().width).toBe(800);
    expect(app.renderer.getSize().height).toBe(600);

    // mock the matrixWorldInverse as it is only updated at render
    var matrixWorldInverse = new app.THREE.Matrix4();
    matrixWorldInverse.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -2.5, 0, 0, 0, 1)
    app.camera.matrixWorldInverse = matrixWorldInverse;

    point_pos = {x: 0, y: 0, z: 0};
    expect(app.toScreenXY(point_pos)).toMatchObject({x: 400, y: 300});
});

test('Test toObjectCoordinates', () => {
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.THREE = require('three');  // import THREE into the app
    app.initTHREEScene();
    app.camera.position.set( 0, 0, 2.5 );
    app.camera.aspect = app.container.clientWidth / app.container.clientHeight;
    app.camera.updateProjectionMatrix();
    expect(app.camera.aspect).toBe(4/3);

    screenPos = {x: 400, y: 300};
    expect(app.toObjectCoordinates(screenPos)).toMatchObject({x: 0, y: 0, z: 0});
});

test('Test findBounds', () => {

    expect(app.findBounds({x: 0, y: 0}, {x: 1, y: 1})).toMatchObject({ll: {x: 0, y: 0},
                                                                      ur: {x: 1, y: 1}});
    expect(app.findBounds({x: 1, y: 0}, {x: 0, y: 1})).toMatchObject({ll: {x: 0, y: 0},
                                                                      ur: {x: 1, y: 1}});
    expect(app.findBounds({x: 0, y: 1}, {x: 1, y: 0})).toMatchObject({ll: {x: 0, y: 0},
                                                                      ur: {x: 1, y: 1}});
    expect(app.findBounds({x: 1, y: 1}, {x: 0, y: 0})).toMatchObject({ll: {x: 0, y: 0},
                                                                      ur: {x: 1, y: 1}});
});

test('Test makeRectangularShape', () => {
    app.$ = require('jquery');  // import jquery into the app
    
    app.makeRectangularShape();
    expect(app.selectedShape).toBe('rectangular');
});

test('Test makeEllipticalShape', () => {
    app.$ = require('jquery');  // import jquery into the app
    
    app.makeEllipticalShape();
    expect(app.selectedShape).toBe('elliptical');
});

test('Test getSelectedDropDown', () => {
    let _getElementById = document.getElementById;
    document.getElementById = function( id )
    {
        return {
            options: {"1": {value: "Correct"}},
            selectedIndex: 1
        }
    };
    let value = app.getSelectedDropDown( 0 );
    expect(value).toBe("Correct")
    document.getElementById = _getElementById;
});

test('Test getGIDPoint', () => {
    app.THREE = require('three');  // import THREE into the app
    app.$ = require('jquery');  // import jquery into the app
    var brain = require('../static/js/makeBrainRepresentation.js');
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.initTHREEScene();
    app.modelParameters = MODELPARAMETERS
    app.brain = new brain(app.camera, app.scene);
    expect(app.getGIDPoint( 2 )).toMatchObject({layer: "Excitatory", pointIndex: 0});
    expect(app.getGIDPoint( 1601 )).toMatchObject({layer: "Excitatory", pointIndex: 4797});
    expect(app.getGIDPoint( 1603 )).toMatchObject({layer: "Inhibitory", pointIndex: 0});
    expect(app.getGIDPoint( 2002 )).toMatchObject({layer: "Inhibitory", pointIndex: 1197});
});

test('Test colorFromVm and colorFromSpike', () => {
    app.THREE = require('three');  // import THREE into the app
    app.$ = require('jquery');  // import jquery into the app
    var brain = require('../static/js/makeBrainRepresentation.js');
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.initTHREEScene();
    app.modelParameters = MODELPARAMETERS
    app.brain = new brain(app.camera, app.scene);

    var points = app.layer_points[ "Excitatory" ].points;
    var colorRef = points.geometry.getAttribute( "customColor" ).array;
    var colors = points.geometry.getAttribute( "customColor" ).array;

    var node2Color = app.mapVmToColor(-63, -70., -50.);
    var node3Color = app.mapVmToColor(-55, -70., -50.);

    var response = {"spike_detector_3":{"2":[40.4]},"voltmeter_2":{"2":[49,-63],"3":[49,-55]}}
    var spiked = [];

    // Test that colouring from Vm works
    colorRef[0] = node2Color[0];
    colorRef[1] = node2Color[1];
    colorRef[2] = node2Color[2];
    colorRef[3] = node3Color[0];
    colorRef[4] = node3Color[1];
    colorRef[5] = node3Color[2];
    app.colorFromVm(response, spiked);
    expect(colors).toEqual(colorRef);

    // Test that colouring from spiking works
    colorRef[0] = 0.9;
    colorRef[1] = 0.0;
    colorRef[2] = 0.0;
    spiked = app.colorFromSpike(response);
    expect(colors).toEqual(colorRef);

    // Test that colouring from Vm skips spiked nodes
    app.colorFromVm(response, spiked);
    expect(colors).toEqual(colorRef);
});

test('Test mapVmToColor', () => {
    expect(app.mapVmToColor(-70, -70, -50)).toEqual([0, 0, 1]);
    expect(app.mapVmToColor(-60, -70, -50)).toEqual([0.5, 0.5, 1]);
    expect(app.mapVmToColor(-55, -70, -50)).toEqual([0.75, 0.75, 1]);
    expect(app.mapVmToColor(-50, -70, -50)).toEqual([1, 1, 1]);

    // check clamping
    expect(app.mapVmToColor(-75, -70, -50)).toEqual([0, 0, 1]);
    expect(app.mapVmToColor(-40, -70, -50)).toEqual([1, 1, 1]);
});

test('Test resetBoxColors', () => {
    app.deviceBoxMap = {
        device1: {connectees: {
            box1: {updateColors: jest.fn()},
            box2: {updateColors: jest.fn()}}},
        device2: {connectees: {
            box1: {updateColors: jest.fn()},
            box2: {updateColors: jest.fn()}}}
    }
    app.resetBoxColors();
    for (var device in app.deviceBoxMap)
    {
        for (var i in app.deviceBoxMap[device].connectees)
        {
            expect(app.deviceBoxMap[device].connectees[i].updateColors.mock.calls.length).toBe(1);
        }
    }
});

test('Test makeProjections', () => {
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.deviceBoxMap = {
        device1: {specs: {}, connectees: {
            box1: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()},
            box2: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()}}},
        device2: {specs: {}, connectees: {
            box1: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()},
            box2: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()}}}
    }
    let projections = app.makeProjections();
    expect(projections).toMatchObject({
        device1: {
            specs: {},
            connectees: [{info: "INFO"}, {info: "INFO"}]
        },
        device2: {
            specs: {},
            connectees: [{info: "INFO"}, {info: "INFO"}]
        }
    });
});

test('Test makeConnections', () => {
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.$.ajax = jest.fn();
    app.$.ajax.mockReturnValue({done: jest.fn()});
    app.getConnections = jest.fn();
    app.modelParameters = MODELPARAMETERS;
    app.deviceBoxMap = {
        device1: {specs: {}, connectees: {
            box1: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()},
            box2: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()}}},
        device2: {specs: {}, connectees: {
            box1: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()},
            box2: {getSelectionInfo: function(){return {info: "INFO"}}, updateColors: jest.fn()}}}
    }
    app.makeConnections();
    expect(app.$.ajax.mock.calls[0][0]).toMatchObject({
        type: "POST",
        contentType: expect.any(String),
        url: "/connect",
        data: JSON.stringify({
            network: MODELPARAMETERS,
            projections: app.makeProjections()
        }),
        dataType: "json"
    });
});

test('Test getConnections', () => {
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.$.getJSON = jest.fn(function(){
        return {done: function(f){
            var data = {connections: {toString: jest.fn()}}
            f(data);
        }}
    });
    app.getConnections();
    expect(app.$.getJSON.mock.calls[0]).toEqual(['/connections', {'input': expect.any(String)}])
});

test('Test runSimulation', () => {
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.$.ajax = jest.fn(function(){
        return {done: function(f){
            var data = {connections: {toString: jest.fn()}}
            f(data);
        }}
    });
    app.modelParameters = MODELPARAMETERS;
    app.runSimulation();
    expect(app.$.ajax.mock.calls[0][0]).toMatchObject({
        type: "POST",
        contentType: expect.any(String),
        url: "/simulate",
        data: JSON.stringify({
            network: MODELPARAMETERS,
            projections: app.makeProjections(),
            time: "1000"
        }),
        dataType: "json"
    });
});

test('Test streamSimulate', () => {
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.$.ajax = jest.fn(function(){
        return {done: function(f){
            var data = {connections: {toString: jest.fn()}}
            f(data);
        }}
    });
    app.devicePlots = {
        makeDevicePlot: jest.fn()
    }
    let _getElementById = document.getElementById;
    let _docElementSetProp = document.documentElement.style.setProperty;
    var abortSetProperty = jest.fn();
    document.getElementById = function(element) {
        if (element === "streamButton")
        {
            return {disabled: false}
        }
        else if (element === "abortButton")
        {
            return {style: {setProperty: abortSetProperty}}
        }
    }
    document.documentElement.style.setProperty = jest.fn();
    app.modelParameters = MODELPARAMETERS;
    app.streamSimulate();
    expect(app.$.ajax.mock.calls[0][0]).toMatchObject({
        type: "POST",
        contentType: expect.any(String),
        url: "/streamSimulate",
        data: JSON.stringify({
            network: MODELPARAMETERS,
            projections: app.makeProjections(),
            time: "10000"
        }),
        dataType: "json"
    });
    expect(abortSetProperty.mock.calls[0]).toEqual(['visibility', 'visible']);
    expect(document.documentElement.style.setProperty.mock.calls[0]).toEqual(['--stream_button_width', 'calc(0.5*var(--gui_width) - 14px)']);
    document.getElementById = _getElementById;
    document.documentElement.style.setProperty = _docElementSetProp;
});

test('Test abortSimulation', () => {
    app.$ = function(s)
    {
        return {html: jest.fn()}
    }
    app.$.ajax = jest.fn(function(){
        return {done: function(f){
            var data = {connections: {toString: jest.fn()}}
            f(data);
        }}
    });

    app.abortSimulation();
    expect(app.$.ajax.mock.calls[0][0]).toMatchObject({
        url: "/abortSimulation"
    });
});

test('Test saveSelection', () => {
    let _getElementById = document.getElementById;
    var setAnchorAttribute = jest.fn();
    var clickAnchorElement = jest.fn();
    document.getElementById = function( id )
    {
        return {
            setAttribute: setAnchorAttribute,
            click: clickAnchorElement
        }
    };
    prompt = jest.fn(function(){return "selection name"});
    app.deviceBoxMap = {
        device1: {specs: {model: "device_model"}, connectees: {
            box1: {getInfoForSaving: function(){return {info: "INFO"}}},
            box2: {getInfoForSaving: function(){return {info: "INFO"}}}}},
        device2: {specs: {model: "device_model"}, connectees: {
            box1: {getInfoForSaving: function(){return {info: "INFO"}}},
            box2: {getInfoForSaving: function(){return {info: "INFO"}}}}}
    }
    app.saveSelection();
    expect(setAnchorAttribute.mock.calls[0]).toEqual(['href', 'data:text/json;charset=utf-8,%7B%22projections%22%3A%7B%22device1%22%3A%7B%22specs%22%3A%7B%22model%22%3A%22device_model%22%7D%2C%22connectees%22%3A%5B%7B%22info%22%3A%22INFO%22%7D%2C%7B%22info%22%3A%22INFO%22%7D%5D%7D%2C%22device2%22%3A%7B%22specs%22%3A%7B%22model%22%3A%22device_model%22%7D%2C%22connectees%22%3A%5B%7B%22info%22%3A%22INFO%22%7D%2C%7B%22info%22%3A%22INFO%22%7D%5D%7D%7D%7D']);
    expect(clickAnchorElement.mock.calls.length).toBe(1);
    document.getElementById = _getElementById;
});

test('Test saveSelection cancelled', () => {
    prompt = jest.fn(function(){return null});
    app.saveSelection();
});

test('Test loadSelection', () => {
    var clickAnchorElement = jest.fn();
    document.getElementById = jest.fn(function( id )
    {
        return {
            click: clickAnchorElement
        }
    });
    app.loadSelection();
    expect(document.getElementById.mock.calls[0][0]).toBe('uploadAnchorElem');
    expect(clickAnchorElement.mock.calls.length).toBe(1);
});

test('Test loadFromJSON', () => {
    app.THREE = require('three');  // import THREE into the app
    app.$ = require('jquery');  // import jquery into the app
    app.controls = require('../static/js/selectionBox.js');
    app.controls.makeOutline = jest.fn();  // makeOutline is irrelevant here
    app.SelectionBox = require('../static/js/selectionBox.js');
    var brain = require('../static/js/makeBrainRepresentation.js');
    
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.renderer = {
        getSize: function()
        {
            return {height: 600,
                    width: 800}
        },
    }
    app.initTHREEScene();
    app.camera.position.set( 0, 0, 2.5 );
    app.camera.aspect = app.renderer.getSize().width / app.renderer.getSize().height;
    app.camera.updateProjectionMatrix();
    app.modelParameters = MODELPARAMETERS
    app.brain = new brain(app.camera, app.scene);
    
    var textJSON = '{"projections":{"poisson_generator_1":{"specs":{"model":"poisson_generator","params":{"rate":70000}},"connectees":[{"name":"Inhibitory","ll":{"x":425,"y":431},"ur":{"x":443,"y":447},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":4},{"name":"Inhibitory","ll":{"x":433,"y":153},"ur":{"x":475,"y":193},"neuronType":"All","synModel":"static_excitatory","maskShape":"elliptical","uniqueID":11},{"name":"Excitatory","ll":{"x":349,"y":154},"ur":{"x":371,"y":173},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":8},{"name":"Excitatory","ll":{"x":72,"y":437},"ur":{"x":83,"y":452},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":1}]},"voltmeter_2":{"specs":{"model":"voltmeter","params":{}},"connectees":[{"name":"Inhibitory","ll":{"x":425,"y":431},"ur":{"x":443,"y":447},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":4},{"name":"Inhibitory","ll":{"x":433,"y":153},"ur":{"x":475,"y":193},"neuronType":"All","synModel":"static_excitatory","maskShape":"elliptical","uniqueID":11},{"name":"Excitatory","ll":{"x":349,"y":154},"ur":{"x":371,"y":173},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":8},{"name":"Excitatory","ll":{"x":72,"y":437},"ur":{"x":83,"y":452},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":1}]},"spike_detector_3":{"specs":{"model":"spike_detector","params":{}},"connectees":[{"name":"Inhibitory","ll":{"x":425,"y":431},"ur":{"x":443,"y":447},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":4},{"name":"Inhibitory","ll":{"x":433,"y":153},"ur":{"x":475,"y":193},"neuronType":"All","synModel":"static_excitatory","maskShape":"elliptical","uniqueID":11},{"name":"Excitatory","ll":{"x":349,"y":154},"ur":{"x":371,"y":173},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":8},{"name":"Excitatory","ll":{"x":72,"y":437},"ur":{"x":83,"y":452},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":1}]}}}'
    app.loadFromJSON(textJSON);

    expect(app.deviceBoxMap).toMatchObject({
        poisson_generator_1: {connectees: expect.any(Array),
                              specs: {model: "poisson_generator", params: expect.anything()}
                             },
        voltmeter_2: {connectees: expect.any(Array),
                      specs: {model: "voltmeter", params: expect.anything()}
                     },
        spike_detector_3: {connectees: expect.any(Array),
                           specs: {model: "spike_detector", params: expect.anything()}
                          }
    });
    expect(app.deviceBoxMap.poisson_generator_1.connectees.length).toBe(4);
    expect(app.deviceBoxMap.voltmeter_2.connectees.length).toBe(4);
    expect(app.deviceBoxMap.spike_detector_3.connectees.length).toBe(4);
});

test('Test handleFileUpload', () => {
    app.loadFromJSON = jest.fn();
    var _FileReader = FileReader;
    var mockFileReader = function(){
        return {
            readAsText: jest.fn(function(file){
                this.result = file;
                this.onload()
            }),
        }
    }
    FileReader = mockFileReader;
    var textJSON = '{"projections":{"poisson_generator_1":{"specs":{"model":"poisson_generator","params":{"rate":70000}},"connectees":[{"name":"Inhibitory","ll":{"x":425,"y":431},"ur":{"x":443,"y":447},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":4},{"name":"Inhibitory","ll":{"x":433,"y":153},"ur":{"x":475,"y":193},"neuronType":"All","synModel":"static_excitatory","maskShape":"elliptical","uniqueID":11},{"name":"Excitatory","ll":{"x":349,"y":154},"ur":{"x":371,"y":173},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":8},{"name":"Excitatory","ll":{"x":72,"y":437},"ur":{"x":83,"y":452},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":1}]},"voltmeter_2":{"specs":{"model":"voltmeter","params":{}},"connectees":[{"name":"Inhibitory","ll":{"x":425,"y":431},"ur":{"x":443,"y":447},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":4},{"name":"Inhibitory","ll":{"x":433,"y":153},"ur":{"x":475,"y":193},"neuronType":"All","synModel":"static_excitatory","maskShape":"elliptical","uniqueID":11},{"name":"Excitatory","ll":{"x":349,"y":154},"ur":{"x":371,"y":173},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":8},{"name":"Excitatory","ll":{"x":72,"y":437},"ur":{"x":83,"y":452},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":1}]},"spike_detector_3":{"specs":{"model":"spike_detector","params":{}},"connectees":[{"name":"Inhibitory","ll":{"x":425,"y":431},"ur":{"x":443,"y":447},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":4},{"name":"Inhibitory","ll":{"x":433,"y":153},"ur":{"x":475,"y":193},"neuronType":"All","synModel":"static_excitatory","maskShape":"elliptical","uniqueID":11},{"name":"Excitatory","ll":{"x":349,"y":154},"ur":{"x":371,"y":173},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":8},{"name":"Excitatory","ll":{"x":72,"y":437},"ur":{"x":83,"y":452},"neuronType":"All","synModel":"static_excitatory","maskShape":"rectangular","uniqueID":1}]}}}'
    var event = {target: {files: [textJSON]}}
    app.handleFileUpload(event);
    expect(app.loadFromJSON.mock.calls[0]).toEqual([textJSON]);
    FileReader = _FileReader;
});

test('Test makeStimulationDevice and makeRecordingDevice', () => {
    app.THREE = require('three');  // import THREE into the app
    app.controls = require('../static/js/controls.js');
    app.controls.makeOutline = jest.fn();  // makeOutline is irrelevant here

    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.initTHREEScene();
    //app.camera.position.set( 0, 0, 2.5 );
    //app.camera.aspect = app.renderer.getSize().width / app.renderer.getSize().height;
    //app.camera.updateProjectionMatrix();
    app.makeStimulationDevice( "poisson_generator" );
    expect(app.deviceBoxMap).toMatchObject({
        poisson_generator_1: {connectees: [],
            specs: {model: "poisson_generator", params: expect.anything()}
        }
    });

    app.makeRecordingDevice( "voltmeter" );
    expect(app.deviceBoxMap).toMatchObject({
        poisson_generator_1: {connectees: [],
            specs: {model: "poisson_generator", params: expect.anything()}
        },
        voltmeter_2: {connectees: [],
            specs: {model: "voltmeter", params: expect.anything()}
        }
    });

    app.makeRecordingDevice( "spike_detector" );
    expect(app.deviceBoxMap).toMatchObject({
        poisson_generator_1: {connectees: [],
            specs: {model: "poisson_generator", params: expect.anything()}
        },
        voltmeter_2: {connectees: [],
            specs: {model: "voltmeter", params: expect.anything()}
        },
        spike_detector_3: {connectees: [],
            specs: {model: "spike_detector", params: expect.anything()}
        }
    });
});

test('Test render', () => {
    // Only checks that nothing crashes
    app.THREE = require('three');  // import THREE into the app
    app.brain = function()
    {
        return {html: jest.fn()}
    }
    app.brain.make_layer_names = jest.fn();
    app.camera = new app.THREE.PerspectiveCamera( 45, 1, 0.5, 1000 );
    app.camera2 = new app.THREE.PerspectiveCamera( 45, 1, 0.5, 1000 );
    app.scene2 = new app.THREE.Scene();
    app.renderer = new app.THREE.CanvasRenderer();
    app.renderer2 = new app.THREE.CanvasRenderer();
    app.render();
});