const App = require( '../static/js/layerSelect.js' );
const Controls = require( '../static/js/controls.js' );
const React = require( 'react' );
const renderer = require( 'react-test-renderer' );
const GUI = require( '../static/js/GUI.jsx' );
console.log = jest.fn();  // suppress output

var JSONstring = '../static/examples/brunel_converted.json';
var MODELPARAMETERS = require(JSONstring)

beforeEach( () => {
    app = new App();
    app.$ = require( 'jquery' ); // import jquery into the app
    app.THREE = require( 'three' ); // import three into the app
    app.is3DLayer = MODELPARAMETERS.is3DLayer;
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
    }
    app.controls = new Controls( undefined, {
        addEventListener: jest.fn(),
        style: {}
    } );


    // Set up document body
    document.body.innerHTML =
        '<div id="main_body">' +
        '        <div id="info">' +
        '            NEST Connection App' +
        '            <div id="infoselected"></div>' +
        '            <div id="infoconnected"></div>' +
        '        </div>' +
        '        <div id="select-square"></div>' +
        '        <div id="spikeTrain"></div>' +
        '    </div>' +
        '    <div id="gui_body">' +
        '        <!-- Contents will be filled by React. -->' +
        '    </div>';
} );


test( 'Test GUI init', () => {
    app.initTHREEScene();
    app.modelParameters = MODELPARAMETERS;
    app.brain = new brain( app.camera, app.scene );
    GUI.makeGUI();
} );

test('Test GUI callbacks', () => {
    app.initTHREEScene();
    app.modelParameters = MODELPARAMETERS;
    GUI.makeGUI();
    app.brain = new brain(app.camera, app.scene);

    expect(document.getElementById('reactroot').style.display).toBe("none");
    app.setShowGUI(true);
    expect(document.getElementById('reactroot').style.display).toBe("block");

    expect(document.getElementById('neuronType').options.length).toBe(3);
    expect(document.getElementById('neuronType').options[0].value).toBe('All');
    expect(document.getElementById('neuronType').options[1].value).toBe('excitatory');
    expect(document.getElementById('neuronType').options[2].value).toBe('inhibitory');

    expect(document.getElementById('synapseModel').options.length).toBe(1);
    expect(document.getElementById('synapseModel').options[0].value).toBe('static_excitatory');
} );

test( 'Test GUIButtons', () => {
    app.neuronModels = [];
    app.synModels = [];
    const topComponent = renderer.create( < GUI.GuiButtons / > );
    let tree = topComponent.toJSON();
} );


test( 'Test DropDown single', () => {
    app.neuronModels = [ 'model1' ];

    const dropDownComponent = renderer.create( < GUI.DropDown items = {
            app.neuronModels.map( function( model ) {
                return ( {
                    value: model,
                    text: model
                } );
            } )
        }
        id = 'neuronType' / > );
    let tree = dropDownComponent.toJSON();

    let changeEvent = {
        target: {
            value: 'model1'
        }
    };
    tree.props.onChange( changeEvent );
} );


test( 'Test DropDown multiple', () => {
    app.neuronModels = [ 'model1', 'model2', 'model3' ];

    const dropDownComponent = renderer.create( < GUI.DropDown items = {
            app.neuronModels.map( function( model ) {
                return ( {
                    value: model,
                    text: model
                } );
            } )
        }
        id = 'neuronType' / > );
    let tree = dropDownComponent.toJSON();

    let changeEvent = {
        target: {
            value: 'model2'
        }
    };
    tree.props.onChange( changeEvent );
} );

test( 'Test SelectionsButton', () => {
            const buttonComponent = renderer.create( < GUI.SelectionsButton button_class = 'selectionsButton'
                button_id = 'rectangleButton'
                text = "&#x25FC;"
                function = {
                    function() {
                        app.makeRectangularShape();
                    }
                }
                />);
                let tree = buttonComponent.toJSON(); tree.props.onClick();
            } );

        /*
        test('Test GUI add dropdown item', () => {
            app.initTHREEScene();
            app.modelParameters = MODELPARAMETERS;
            brain(app.camera, app.scene);
            makeGUI = require('../static/js/GUI.jsx');

            app.neuronModels = [];
            makeGUI();

        });
        */
