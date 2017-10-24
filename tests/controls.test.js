const App = require( '../static/js/layerSelect.js' );
const Controls = require( '../static/js/controls.js' );
console.log = jest.fn(); // suppress output

var JSONstring = '../static/examples/brunel_converted.json';
var MODELPARAMETERS = require(JSONstring)

// Test setup
beforeEach( () => {
    app = new App();
    app.$ = require( 'jquery' ); // import jquery into the app
    app.THREE = require( 'three' ); // import three into the app
    app.SelectionBox = require( '../static/js/selectionBox.js' );
    brain = require( '../static/js/makeBrainRepresentation.js' );
    app.container = {
        clientWidth: 800,
        clientHeight: 600
    }
    app.renderer = {
        getSize: function() {
            return {
                height: 600,
                width: 800
            }
        },
        domElement: {
            addEventListener: jest.fn(),
            getBoundingClientRect: function(){
                return {left: 0, top: 0, width: 1200, height: 800}
            },
            style: {}
        }
    }
    app.controls = new Controls( undefined, app.renderer.domElement );
    app.initTHREEScene();
    app.modelParameters = MODELPARAMETERS;
    app.is3DLayer = MODELPARAMETERS.is3DLayer;
    app.brain = new brain( app.camera, app.scene );

    app.camera.position.set( 0, 0, 2.5 );
    app.camera.aspect = app.renderer.getSize().width / app.renderer.getSize().height;
    app.camera.updateProjectionMatrix();

    // mock the matrixWorldInverse as it is only updated at render
    var matrixWorldInverse = new app.THREE.Matrix4();
    matrixWorldInverse.set( 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -2.5, 0, 0, 0, 1 )
    app.camera.matrixWorldInverse = matrixWorldInverse;
} );

test( 'Test resetButtons', () => {
    var refControls = app.$.extend( {}, app.controls );

    app.controls.mouseDown = true;
    app.controls.shiftDown = true;
    app.controls.make_selection_box = true;
    app.controls.make_connection = true;
    app.controls.marquee.css( {
        width: 100,
        height: 200,
        borderRadius: 10
    } );
    app.mouseDownCoords = {
        x: 10,
        y: 20
    };
    app.mRelPos = {
        x: 10,
        y: 20
    };
    app.layerSelected = "Excitatory";

    app.controls.resetButtons();

    expect( app.controls ).toMatchObject( refControls );
    expect( app.mouseDownCoords ).toMatchObject( {
        x: 0,
        y: 0
    } );
    expect( app.mRelPos ).toMatchObject( {
        x: 0,
        y: 0
    } );
    expect( app.layerSelected ).toBe( "" );
} );

test( 'Test makeOutline and removeOutline', () => {
    app.makeStimulationDevice( "poisson_generator" );
    app.controls.makeOutline( app.circle_objects[ 0 ] );
    expect( app.outlineScene.children.length ).toBe( 1 );
    expect( app.outlineScene.children[ 0 ] ).toBeInstanceOf( app.THREE.Mesh );

    // Test remove outline
    app.controls.removeOutline();
    expect( app.outlineScene.children.length ).toBe( 0 );
} );

test( 'Test selectBox', () => {
    app.getSelectedDropDown = jest.fn();
    app.controls.selectBox();
    expect( app.controls.make_selection_box ).toBe( true );

    app.controls.make_selection_box = false;
    var box = new app.SelectionBox( {
        x: 50,
        y: 50
    }, {
        x: 100,
        y: 100
    }, "rectangular" );
    app.selectionBoxArray.push( box );
    app.mouseDownCoords.x = 75;
    app.mouseDownCoords.y = 525;

    app.controls.selectBox();
    expect( app.controls.make_selection_box ).toBe( false );
    expect( app.controls.boxInFocus ).toBe( box );
} );

test( 'Test resizeBox', () => {
    app.getSelectedDropDown = jest.fn();
    app.controls.make_selection_box = false;
    var box = new app.SelectionBox( {
        x: 50,
        y: 50
    }, {
        x: 100,
        y: 100
    }, "rectangular" );
    box.layerName = "Excitatory";
    box.makeBox();
    app.controls.boxInFocus = box;

    var checkResize = ( side, mX, mY, llX, llY, urX, urY ) => {
        app.controls.resizeSideInFocus = side;
        app.controls.resizeBox( mX, mY );
        expect( box.ll ).toMatchObject( {
            x: llX,
            y: llY
        } );
        expect( box.ur ).toMatchObject( {
            x: urX,
            y: urY
        } );
        box.ll = {
            x: 50,
            y: 50
        };
        box.ur = {
            x: 100,
            y: 100
        };
    }

    checkResize( "lowerLeft", 75, 525, 75, 75, 100, 100 );
    checkResize( "lowerMiddle", 75, 525, 50, 75, 100, 100 );
    checkResize( "lowerRight", 75, 525, 50, 75, 75, 100 );
    checkResize( "middleRight", 75, 525, 50, 50, 75, 100 );
    checkResize( "upperRight", 75, 525, 50, 50, 75, 75 );
    checkResize( "upperMiddle", 75, 525, 50, 50, 100, 75 );
    checkResize( "upperLeft", 75, 525, 75, 50, 100, 75 );
    checkResize( "middleLeft", 75, 525, 75, 50, 100, 100 );
} );

test( 'Test updateLine', () => {
    app.getSelectedDropDown = jest.fn();
    app.controls.make_selection_box = false;
    var box = new app.SelectionBox( {
        x: 50,
        y: 50
    }, {
        x: 100,
        y: 100
    }, "rectangular" );
    box.layerName = "Excitatory";
    box.makeBox();
    app.controls.boxInFocus = box;
    box.makeLine();

    app.controls.updateLine( 200, 200 );
    expect( box.lines.length ).toBe( 1 );
    expect( box.lines[ 0 ].curve.points[ 3 ] ).toMatchObject( app.toObjectCoordinates( {
        x: 200,
        y: 200
    } ) );
} );


test( 'Test updateDevicePosition', () => {
    app.makeStimulationDevice( "poisson_generator" );
    expect( app.circle_objects.length ).toBe( 1 );
    expect( app.controls.deviceInFocus ).toBeInstanceOf( app.THREE.Mesh );

    app.controls.plane = new app.THREE.Plane();
    app.controls.updateDevicePosition( 200, 200 );
    expect( app.controls.deviceInFocus.position ).toMatchObject( app.toObjectCoordinates( {
        x: 200,
        y: 200
    } ) );
} );

test( 'Test makeSelectionBox', () => {
    app.mouseDownCoords = {
        x: 20,
        y: 50
    };
    app.mouseUpCoords = {
        x: 300,
        y: 300
    };
    app.mRelPos.x = app.mouseUpCoords.x - app.mouseDownCoords.x;
    app.mRelPos.y = app.mouseUpCoords.y - app.mouseDownCoords.y;
    var mouseDownCorrected = {
        x: app.mouseDownCoords.x,
        y: app.renderer.getSize().height - app.mouseDownCoords.y
    };

    app.getSelectedDropDown = jest.fn(); // mocking because no react here
    app.controls.makeSelectionBox();

    expect( app.controls.boxInFocus ).toMatchObject( {
        uniqueID: 1,
        layerName: "Excitatory",
        ll: {
            x: 20,
            y: 300
        },
        ur: {
            x: 300,
            y: 550
        },
        selectedShape: "rectangular",
        resizePoints: expect.anything(),
        lines: [],
        selectedPointIDs: expect.anything(),
        nSelected: 600,
        box: expect.any( app.THREE.Mesh ),
        selectedNeuronType: undefined,
        selectedSynModel: undefined
    } );
    expect( app.controls.boxInFocus.selectedPointIDs.length ).toBe( 600 );
} );


test( 'Test box checkFlip', () => {
    app.mouseDownCoords = {
        x: 20,
        y: 50
    };
    app.mouseUpCoords = {
        x: 300,
        y: 300
    };
    app.mRelPos.x = app.mouseUpCoords.x - app.mouseDownCoords.x;
    app.mRelPos.y = app.mouseUpCoords.y - app.mouseDownCoords.y;
    var mouseDownCorrected = {
        x: app.mouseDownCoords.x,
        y: app.renderer.getSize().height - app.mouseDownCoords.y
    };

    app.getSelectedDropDown = jest.fn(); // mocking because no react here
    app.controls.makeSelectionBox();

    app.controls.boxInFocus.ll.x = 350;
    app.controls.boxInFocus.checkFlip()
    expect( app.controls.boxInFocus.ll ).toMatchObject( {
        x: 300,
        y: 300
    } );
    expect( app.controls.boxInFocus.ur ).toMatchObject( {
        x: 350,
        y: 550
    } );

    app.controls.boxInFocus.ur.y = 250;
    app.controls.boxInFocus.checkFlip()
    expect( app.controls.boxInFocus.ll ).toMatchObject( {
        x: 300,
        y: 250
    } );
    expect( app.controls.boxInFocus.ur ).toMatchObject( {
        x: 350,
        y: 300
    } );
} );

test( 'Test makeConnection', () => {
    app.mouseDownCoords = {
        x: 20,
        y: 50
    };
    app.mouseUpCoords = {
        x: 300,
        y: 300
    };
    app.mRelPos.x = app.mouseUpCoords.x - app.mouseDownCoords.x;
    app.mRelPos.y = app.mouseUpCoords.y - app.mouseDownCoords.y;
    var mouseDownCorrected = {
        x: app.mouseDownCoords.x,
        y: app.renderer.getSize().height - app.mouseDownCoords.y
    };

    app.getSelectedDropDown = jest.fn(); // mocking because no react here
    app.controls.makeSelectionBox();

    app.makeStimulationDevice( "poisson_generator" );

    app.controls.getMouseIntersecting = ( cX, cY, objects ) => {
        return [ {
            object: objects[ 0 ]
        } ]
    };
    app.controls.drag_objects = app.circle_objects;
    app.controls.boxInFocus.makeLine();
    app.controls.makeConnection( 0, 0 ); // mouse coordinates are irrelevant
    expect( app.deviceBoxMap[ 'poisson_generator_1' ].connectees ).toEqual( [ app.controls.boxInFocus ] );
} );

test( 'Test deleteBox', () => {
    app.mouseDownCoords = {
        x: 20,
        y: 50
    };
    app.mouseUpCoords = {
        x: 300,
        y: 300
    };
    app.mRelPos.x = app.mouseUpCoords.x - app.mouseDownCoords.x;
    app.mRelPos.y = app.mouseUpCoords.y - app.mouseDownCoords.y;
    var mouseDownCorrected = {
        x: app.mouseDownCoords.x,
        y: app.renderer.getSize().height - app.mouseDownCoords.y
    };

    app.getSelectedDropDown = jest.fn(); // mocking because no react here
    app.controls.makeSelectionBox();

    app.makeStimulationDevice( "poisson_generator" );
    var target = app.circle_objects[ 0 ];
    var radius = target.geometry.boundingSphere.radius;
    app.controls.boxInFocus.makeLine();
    app.controls.boxInFocus.setLineTarget( target.name );
    app.controls.boxInFocus.lineToDevice( target.position, radius, target.name );
    app.deviceBoxMap[ "poisson_generator_1" ].connectees.push( app.controls.boxInFocus );

    app.controls.deleteBox();
    expect( app.scene.children.length ).toBe( 3 ); // two points objects, one device
    expect( app.controls.boxInFocus ).toBe( undefined );
} );

test( 'Test deleteDevice', () => {
    app.mouseDownCoords = {
        x: 20,
        y: 50
    };
    app.mouseUpCoords = {
        x: 300,
        y: 300
    };
    app.mRelPos.x = app.mouseUpCoords.x - app.mouseDownCoords.x;
    app.mRelPos.y = app.mouseUpCoords.y - app.mouseDownCoords.y;
    var mouseDownCorrected = {
        x: app.mouseDownCoords.x,
        y: app.renderer.getSize().height - app.mouseDownCoords.y
    };

    app.getSelectedDropDown = jest.fn(); // mocking because no react here
    app.controls.makeSelectionBox();

    app.makeStimulationDevice( "poisson_generator" );
    var target = app.circle_objects[ 0 ];
    var radius = target.geometry.boundingSphere.radius;
    app.controls.boxInFocus.makeLine();
    app.controls.boxInFocus.setLineTarget( target.name );
    app.controls.boxInFocus.lineToDevice( target.position, radius, target.name );
    app.controls.boxInFocus.removePoints();
    app.deviceBoxMap[ "poisson_generator_1" ].connectees.push( app.controls.boxInFocus );

    app.controls.deleteDevice();
    expect( app.scene.children.length ).toBe( 4 ); // two points objects, one box, one box handle
    expect( app.outlineScene.children.length ).toBe( 0 ); // no outline
} );

test( 'Test onMouseDown', () => {
    app.getSelectedDropDown = jest.fn();
    app.controls.getMouseIntersecting = ( cX, cY, objects ) => {
        return [ {
            object: objects[ 0 ]
        } ]
    };

    var makeMouseEvent = () => {
        return {
            preventDefault: jest.fn(),
            target: {
                localName: "canvas"
            },
            shiftKey: false,
            clientX: 100,
            clientY: 500
        }
    };

    // with boxInFocus
    app.controls.boxInFocus = new app.SelectionBox( {
        x: 50,
        y: 50
    }, {
        x: 200,
        y: 200
    }, "rectangular" );
    app.controls.boxInFocus.layerName = "Excitatory";
    app.controls.boxInFocus.makeSelectionPoints();
    app.selectionBoxArray.push( app.controls.boxInFocus );

    var event = makeMouseEvent();
    app.controls.onMouseDown( event );
    expect( app.controls.resizeSideInFocus ).toBe( "lowerLeft" );

    // with shift key
    app.controls.boxInFocus = undefined;
    app.makeStimulationDevice( "poisson_generator" );
    var event = makeMouseEvent();
    event.shiftKey = true;
    app.controls.drag_objects = app.circle_objects;
    app.controls.onMouseDown( event );
    expect( app.controls.deviceInFocus ).toBe( app.circle_objects[ 0 ] );

    // selecting box
    app.controls.boxInFocus = undefined;
    var event = makeMouseEvent();
    app.controls.onMouseDown( event );
    expect( app.controls.boxInFocus ).toBeInstanceOf( app.SelectionBox );
} );

test( 'Test onMouseMove', () => {
    var makeMouseEvent = () => {
        return {
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
            target: {
                localName: "canvas"
            },
            shiftKey: false,
            clientX: 100,
            clientY: 500
        }
    };

    // make mock functions of target functions
    app.controls.updateMarquee = jest.fn();
    app.controls.resizeBox = jest.fn();
    app.controls.updateLine = jest.fn();
    app.controls.updateDevicePosition = jest.fn();

    var resetMocks = () => {
        app.controls.updateMarquee.mockReset();
        app.controls.resizeBox.mockReset();
        app.controls.updateLine.mockReset();
        app.controls.updateDevicePosition.mockReset();
    };

    // with make_selection_box
    app.controls.make_selection_box = true;
    var event = makeMouseEvent();
    app.controls.onMouseMove( event );
    expect( app.controls.updateMarquee.mock.calls[ 0 ] ).toEqual( [ 100, 500 ] );
    expect( app.controls.resizeBox.mock.calls.length ).toBe( 0 );
    expect( app.controls.updateLine.mock.calls.length ).toBe( 0 );
    expect( app.controls.updateDevicePosition.mock.calls.length ).toBe( 0 );
    resetMocks();

    // with resizeSideInFocus
    app.controls.make_selection_box = false;
    app.controls.resizeSideInFocus = "lowerLeft";
    var event = makeMouseEvent();
    app.controls.onMouseMove( event );
    expect( app.controls.updateMarquee.mock.calls.length ).toBe( 0 );
    expect( app.controls.resizeBox.mock.calls[ 0 ] ).toEqual( [ 100, 500 ] );
    expect( app.controls.updateLine.mock.calls.length ).toBe( 0 );
    expect( app.controls.updateDevicePosition.mock.calls.length ).toBe( 0 );
    resetMocks();

    // with make_connection
    app.controls.resizeSideInFocus = undefined;
    app.controls.make_connection = true;
    var event = makeMouseEvent();
    app.controls.onMouseMove( event );
    expect( app.controls.updateMarquee.mock.calls.length ).toBe( 0 );
    expect( app.controls.resizeBox.mock.calls.length ).toBe( 0 );
    expect( app.controls.updateLine.mock.calls[ 0 ] ).toEqual( [ 100, 500 ] );
    expect( app.controls.updateDevicePosition.mock.calls.length ).toBe( 0 );
    resetMocks();

    // with deviceInFocus
    app.controls.make_connection = false;
    app.controls.deviceInFocus = true;
    app.controls.mouseDown = true;
    var event = makeMouseEvent();
    app.controls.onMouseMove( event );
    expect( app.controls.updateMarquee.mock.calls.length ).toBe( 0 );
    expect( app.controls.resizeBox.mock.calls.length ).toBe( 0 );
    expect( app.controls.updateLine.mock.calls.length ).toBe( 0 );
    expect( app.controls.updateDevicePosition.mock.calls[ 0 ] ).toEqual( [ 100, 500 ] );
} );

test( 'Test onMouseUp', () => {
    var makeMouseEvent = () => {
        return {
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
            target: {
                localName: "canvas"
            },
            shiftKey: false,
            clientX: 100,
            clientY: 500
        }
    };

    // make mock functions of target functions
    app.controls.makeSelectionBox = jest.fn();
    app.controls.serverPrintGids = jest.fn();
    app.getSelectedDropDown = jest.fn();
    app.controls.boxInFocus = {
        checkFlip: jest.fn(),
        updateColors: jest.fn()
    };
    // app.controls.checkFlipBox = jest.fn();
    app.controls.makeConnection = jest.fn();
    app.controls.updateDevicePosition = jest.fn();

    var resetMocks = () => {
        app.controls.boxInFocus.checkFlip.mockReset();
        app.controls.boxInFocus.updateColors.mockReset();
        app.controls.makeConnection.mockReset();
    };

    // with make_selection_box
    app.controls.make_selection_box = true;
    var event = makeMouseEvent();
    app.controls.onMouseUp( event );
    expect( app.controls.boxInFocus.checkFlip.mock.calls.length ).toBe( 0 );
    expect( app.controls.boxInFocus.updateColors.mock.calls.length ).toBe( 0 );
    expect( app.controls.makeConnection.mock.calls.length ).toBe( 0 );
    resetMocks();

    // with resizeSideInFocus
    app.controls.make_selection_box = false;
    app.controls.resizeSideInFocus = "lowerLeft";
    var event = makeMouseEvent();
    app.controls.onMouseUp( event );
    expect( app.controls.boxInFocus.checkFlip.mock.calls.length ).toBe( 1 );
    expect( app.controls.boxInFocus.updateColors.mock.calls.length ).toBe( 1 );
    expect( app.controls.makeConnection.mock.calls.length ).toBe( 0 );
    resetMocks();

    // with make_connection
    app.controls.resizeSideInFocus = undefined;
    app.controls.make_connection = true;
    var event = makeMouseEvent();
    app.controls.onMouseUp( event );
    expect( app.controls.boxInFocus.checkFlip.mock.calls.length ).toBe( 0 );
    expect( app.controls.boxInFocus.updateColors.mock.calls.length ).toBe( 0 );
    expect( app.controls.makeConnection.mock.calls[ 0 ] ).toEqual( [ 100, 500 ] );
    resetMocks();
} );

test( 'Test onKeyUp', () => {

    // make mock functions of target functions
    app.controls.deleteBox = jest.fn();
    app.controls.deleteDevice = jest.fn();

    var resetMocks = () => {
        app.controls.deleteBox.mockReset();
        app.controls.deleteDevice.mockReset();
    };

    // with boxInFocus
    app.controls.boxInFocus = true;
    app.controls.onKeyUp( {
        keyCode: 46
    } );
    expect( app.controls.deleteBox.mock.calls.length ).toBe( 1 );
    expect( app.controls.deleteDevice.mock.calls.length ).toBe( 0 );
    resetMocks();

    // with deviceInFocus
    app.controls.boxInFocus = undefined;
    app.controls.deviceInFocus = true;
    app.controls.onKeyUp( {
        keyCode: 46
    } );
    expect( app.controls.deleteBox.mock.calls.length ).toBe( 0 );
    expect( app.controls.deleteDevice.mock.calls.length ).toBe( 1 );
    resetMocks();

} );

test( 'Test onWindowResize', () => {
    app.container.clientWidth = 1000;
    app.renderer.setSize = jest.fn();
    app.controls.onWindowResize();
    expect( app.camera.aspect ).toBe( 5 / 3 );
    expect( app.renderer.setSize.mock.calls[ 0 ] ).toEqual( [ 1000, 600 ] )

} );
