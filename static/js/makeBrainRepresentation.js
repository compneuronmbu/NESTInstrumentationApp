/**
 * Makes neuron layers
 */
var Brain = function( camera, scene )
{
    /**
     * Creates the layers.
     */
    function initLayers()
    {
        var layers = app.modelParameters.layers;
        var number_of_layers = 0;

        for ( var layer in layers )
        {
            if ( layers.hasOwnProperty( layer ) )
            {
                if ( layers[ layer ].name.toLowerCase().indexOf( "generator" ) === -1 &&
                    layers[ layer ].name.toLowerCase().indexOf( "detector" ) === -1 &&
                    layers[ layer ].name.toLowerCase().indexOf( "meter" ) === -1 )
                {
                    number_of_layers++;
                }
            }
        }

        if ( number_of_layers > 12 )
        {
            window.alert( "Please reconsider the number of layers. The app is constructed to properly display at most 12 layers." );
        }

        var offsett_x;
        var offsett_y;
        if ( app.is3DLayer )
        {
            offsett_x = 0.0;
            offsett_y = 0.0;
            var no_rows = 1;
        }
        else
        {
            var no_rows = Math.round( Math.sqrt( number_of_layers ) );
            var no_cols = Math.ceil( Math.sqrt( number_of_layers ) );

            offsett_x = ( number_of_layers > 1 ) ? -0.6 * ( no_cols - 1 ) : 0.0;
            offsett_y = ( no_rows > 1 ) ? 0.6 * ( no_rows - 1 ) : 0.0;
            var i = 1;
        }

        for ( var layer in layers )
        {
            if ( layers.hasOwnProperty( layer ) )
            {
                if ( layers[ layer ].name.toLowerCase().indexOf( "generator" ) === -1 &&
                    layers[ layer ].name.toLowerCase().indexOf( "detector" ) === -1 &&
                    layers[ layer ].name.toLowerCase().indexOf( "meter" ) === -1 )
                {
                    // Not sure if this is the best way. Could also do
                    // points: new initPoints( layers[layer].neurons, offsett_x, offsett_y ),
                    // but then I think we would have to rewrite some of the code below.
                    app.layer_points[ layers[ layer ].name ] = {
                        points: initPoints( layers[ layer ].neurons, offsett_x, offsett_y, layers[layer].extent, layers[layer].center, layers[layer].neuronType ),
                        offsets:
                            {
                                x: offsett_x,
                                y: offsett_y
                            },
                        extent: layers[layer].extent, 
                        center: layers[layer].center,
                        noElements: getNumberOfElements(layers[layer].elements)
                    };

                    if ( !app.is3DLayer )
                    {
                        if ( i % no_cols == 0 )
                        {
                            offsett_x = -0.6 * ( no_cols - 1 );
                            offsett_y += -1.2;
                        }
                        else
                        {
                            offsett_x += 0.6 * 2;
                        }
                        ++i;
                    }
                }
            }
        }

        app.outlineMaterial = new app.THREE.ShaderMaterial(
        {
            uniforms:
            {},
            vertexShader: [
                "void main() {",
                "vec4 pos = modelViewMatrix * vec4( position, 1.0 );",
                "gl_Position = projectionMatrix * pos;",
                "}"
            ].join( "\n" ),
            fragmentShader: [
                "void main(){",
                "gl_FragColor = vec4( 0.80, 0.80, 0.80, 1.0 );",
                "}"
            ].join( "\n" )
        } );

        camera.position.set(  0, 0, no_rows + 1.5  );

        makeModelNameLists();
        app.is3DLayer && makeBorderLines();

        // if undefined, make a requestAnimationFrame function (mostly for testsuite)
        if (window.requestAnimationFrame === undefined) {
          let targetTime = 0
          requestAnimationFrame = function (callbackFun) {
            const currentTime = +new Date()
            const timeoutCb = function () { callbackFun(+new Date()) }
            return window.setTimeout(timeoutCb, Math.max(targetTime + 16, currentTime) - currentTime)
          }
        }

        requestAnimationFrame( app.render.bind(app) );
    }

    /**
     * Creates the points representing nodes.
     */
    function initPoints( neurons, offsett_x, offsett_y, extent, center, neuronType )
    {
        var geometry = new app.THREE.BufferGeometry();

        var positions = new Float32Array( neurons.length * 3 );
        var colors = new Float32Array( neurons.length * 3 );
        var visible = new Float32Array( neurons.length );

        var i = 0;
        for ( var neuron in neurons )
        {
            positions[ i ] = ( neurons[ neuron ].x - center[0] ) / extent[0] + offsett_x;
            positions[ i + 1 ] = ( neurons[ neuron ].y - center[1] ) / extent[1] + offsett_y;
            positions[ i + 2 ] = ( neurons[ neuron ].z - center[2] ) / extent[2];

            if ( neuronType === 'excitatory' )
            {
                colors[ i ] = app.colorEx.r;
                colors[ i + 1 ] = app.colorEx.g;
                colors[ i + 2 ] = app.colorEx.b;
            }
            else if ( neuronType === "inhibitory" )
            {
                colors[ i ] = app.colorIn.r;
                colors[ i + 1 ] = app.colorIn.g;
                colors[ i + 2 ] = app.colorIn.b;
            }
            else
            {
                colors[ i ] = app.color.r;
                colors[ i + 1 ] = app.color.g;
                colors[ i + 2 ] = app.color.b;
            }

            i += 3;
        }

        for (var i = 0; i < visible.length; ++i) {
            visible[i] = 1.0;
        }

        geometry.addAttribute( 'position', new app.THREE.BufferAttribute( positions, 3 ) );
        geometry.addAttribute( 'customColor', new app.THREE.BufferAttribute( colors, 3 ) );
        geometry.addAttribute( 'visible', new app.THREE.BufferAttribute( visible, 1 ) );

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        var texture = new app.THREE.TextureLoader().load( "static/js/textures/sharp_circle_white.png" );
        var material = new app.THREE.ShaderMaterial(
        {
            uniforms:
            {
                color:
                {
                    value: new app.THREE.Color( 0xffffff )
                },
                texture:
                {
                    value: texture
                }
            },
            vertexShader: [
                "attribute float size;",
                "attribute float visible;",
                "attribute vec3 customColor;",
                "varying vec3 vColor;",
                "varying float vVisible;",
                "void main() {",
                "vColor = customColor;",
                "vVisible = visible;",
                "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
                "gl_Position = projectionMatrix * mvPosition;",
                "gl_PointSize = 0.04 * ( 300.0 / -mvPosition.z );",
                "}"
            ].join( "\n" ),
            fragmentShader: [
                "uniform vec3 color;",
                "uniform sampler2D texture;",
                "varying vec3 vColor;",
                "varying float vVisible;",
                "void main() {",
                "vec4 loadedTexture = texture2D( texture, gl_PointCoord );",
                "if (loadedTexture.a < 0.5) discard;",
                "if (vVisible < 0.5) discard;",
                "gl_FragColor = vec4( color * vColor, 1.0 );",
                "gl_FragColor = gl_FragColor * loadedTexture;",
                "}"
            ].join( "\n" )
        } );

        points = new app.THREE.Points( geometry, material );

        scene.add( points );

        return points;
    }

    /**
     * Creates legends for the layers.
     */
    make_layer_names = function()
    {
        console.log( "Making layer names" );

        var center;
        var bounding_radius;
        var name_pos;
        var screenCenter;

        for ( var layer_name in app.layer_points )
        {
            if ( app.layer_points.hasOwnProperty( layer_name ) )
            {
                center = app.layer_points[ layer_name ].points.geometry.boundingSphere.center;
                bounding_radius = app.layer_points[ layer_name ].points.geometry.boundingSphere.radius;

                name_pos = {
                    x: center.x,
                    y: center.y + bounding_radius - 0.1,
                    z: center.z
                };

                screenCenter = app.toScreenXY( name_pos );
                screenCenter.y = app.container.clientHeight - screenCenter.y;

                var text = document.createElement( 'div' );
                text.className = 'unselectable';
                text.id = layer_name + '_label';
                text.style.position = 'absolute';
                text.style.width = 100;
                text.style.height = 100;
                text.style.color = "white";
                text.style.fontSize = 18 + 'px'
                text.innerHTML = layer_name;
                text.style.top = screenCenter.y + 'px';
                document.body.appendChild( text );
                // adjust the position to align the center with the center of the layer
                text.style.left = screenCenter.x - parseFloat( app.$( '#' + text.id ).width() ) / 2.0 + 'px';
            }
        }
    }

    /**
    * Finds the number of elements in a layer.
    * 
    * elements is an array or string. If it is a string, number of elements equals 1. If we have
    * an array, it can consist of strings and numbers.
    */
    function getNumberOfElements(elements)
    {
        if ( typeof elements === "string" )
        {
            return 1;
        }

        var noElem = 0;

        for ( var elem in elements )
        {
            if ( typeof elements[elem] === "string" )
            {
                // If we have a string, we have the type of element, and we add it to noElem
                noElem += 1
            }
            else if ( typeof elements[elem] === "number" )
            {
                // If we have a number, it tells us that we have more than one of the
                // previous element in the element array. We therefore have to add the number, and 
                // subtract 1, as the previous value in the elements array is the
                // type of element, which we have added to number of elements above.
                noElem += elements[elem] - 1
            }
        }
        return noElem;
    }

    /**
     * Fills a list with names of models and synapse models.
     */
    function makeModelNameLists()
    {
        var nModels = app.modelParameters.models;
        app.synModels = app.modelParameters.syn_models;
        for ( var model in nModels )
        {
            if ( nModels[ model ].toLowerCase().indexOf( "generator" ) === -1 &&
                nModels[ model ].toLowerCase().indexOf( "detector" ) === -1 &&
                nModels[ model ].toLowerCase().indexOf( "meter" ) === -1 )
            {
                app.neuronModels.push( model );
            }
        }

        console.log("makeModelNameLists")
        app.synapseNeuronModelCallback([app.neuronModels, app.synModels]);
    }

    function makeBorderLines()
    {
        for ( var layer in app.layer_points )
        {
            var borderBox = new app.THREE.BoxHelper( );
            borderBox.material.depthTest = false;
            borderBox.material.transparent = true;

            app.scene.add( borderBox );

            borderBox.setFromObject( app.layer_points[ layer ].points );
            for (var i = 0; i < borderBox.geometry.attributes.position.array; ++i )
            {
                borderBox.geometry.attributes.position.array[ i ] *= 1.5;
            }
            borderBox.geometry.attributes.position.needsUpdate = true;
            var borderColor = new app.THREE.Color();
            borderColor.setRGB( 0.5, 0.5, 0.5 );
            borderBox.material.color = borderColor;
        }
    }

    initLayers();
};

// Try exporting Brain for testing
try
{
    module.exports = Brain;
}
catch(err)
{
}
