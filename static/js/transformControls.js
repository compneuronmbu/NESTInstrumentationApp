/**
 *
 * TRANSFORM CONTROLS
 *
 * This file is a modified copy of TransformControls.js from the
 * three.js library.
 *
 */

var TransformerMaterial = function ( parameters )
{
    THREE.MeshBasicMaterial.call( this );

    this.depthTest = false;
    this.depthWrite = false;
    this.side = THREE.FrontSide;
    this.transparent = true;

    this.setValues( parameters );

    this.oldColor = this.color.clone();
    this.oldOpacity = this.opacity;

    this.highlight = function( highlighted )
    {
        if ( highlighted )
        {
            this.color.setRGB( 1, 1, 0 );
            this.opacity = 1;
        }
        else
        {
            this.color.copy( this.oldColor );
            this.opacity = this.oldOpacity;
        }
    };
};

TransformerMaterial.prototype = Object.create( THREE.MeshBasicMaterial.prototype );
TransformerMaterial.prototype.constructor = TransformerMaterial;


var TransformerLineMaterial = function ( parameters )
{
    THREE.LineBasicMaterial.call( this );

    this.depthTest = false;
    this.depthWrite = false;
    this.transparent = true;
    this.linewidth = 1;

    this.setValues( parameters );

    this.oldColor = this.color.clone();
    this.oldOpacity = this.opacity;

    this.highlight = function( highlighted )
    {
        if ( highlighted )
        {
            this.color.setRGB( 1, 1, 0 );
            this.opacity = 1;
        }
        else
        {
            this.color.copy( this.oldColor );
            this.opacity = this.oldOpacity;
        }
    };
};

TransformerLineMaterial.prototype = Object.create( THREE.LineBasicMaterial.prototype );
TransformerLineMaterial.prototype.constructor = TransformerLineMaterial;


var pickerMaterial = new TransformerMaterial( { visible: false, transparent: false } );


var Transformer = function ()
{
    var scope = this;

    this.init = function ()
    {
        THREE.Object3D.call( this );

        this.handles = new THREE.Object3D();
        this.pickers = new THREE.Object3D();
        this.planes = new THREE.Object3D();

        this.add( this.handles );
        this.add( this.pickers );
        this.add( this.planes );

        //// PLANES

        var planeGeometry = new THREE.PlaneBufferGeometry( 50, 50, 2, 2 );
        var planeMaterial = new THREE.MeshBasicMaterial( { visible: false, side: THREE.DoubleSide } );

        var planes = {
            "XY":   new THREE.Mesh( planeGeometry, planeMaterial ),
            "YZ":   new THREE.Mesh( planeGeometry, planeMaterial ),
            "XZ":   new THREE.Mesh( planeGeometry, planeMaterial ),
            "XYZE": new THREE.Mesh( planeGeometry, planeMaterial )
        };

        this.activePlane = planes[ "XYZE" ];

        planes[ "YZ" ].rotation.set( 0, Math.PI / 2, 0 );
        planes[ "XZ" ].rotation.set( - Math.PI / 2, 0, 0 );

        for ( var i in planes )
        {
            planes[ i ].name = i;
            this.planes.add( planes[ i ] );
            this.planes[ i ] = planes[ i ];
        }

        //// HANDLES AND PICKERS

        var setupTransformer = function( transformerMap, parent )
        {
            for ( var name in transformerMap )
            {
                for ( i = transformerMap[ name ].length; i --; )
                {
                    var object = transformerMap[ name ][ i ][ 0 ];
                    var position = transformerMap[ name ][ i ][ 1 ];
                    var rotation = transformerMap[ name ][ i ][ 2 ];

                    object.name = name;

                    if ( position ) object.position.set( position[ 0 ], position[ 1 ], position[ 2 ] );
                    if ( rotation ) object.rotation.set( rotation[ 0 ], rotation[ 1 ], rotation[ 2 ] );

                    parent.add( object );
                }
            }
        };

        setupTransformer( this.handleTransformer, this.handles );
        setupTransformer( this.pickerTransformer, this.pickers );

        // reset Transformations

        this.traverse( function ( child ) {

            if ( child instanceof THREE.Mesh )
            {
                child.updateMatrix();

                var tempGeometry = child.geometry.clone();
                tempGeometry.applyMatrix( child.matrix );
                child.geometry = tempGeometry;

                child.position.set( 0, 0, 0 );
                child.rotation.set( 0, 0, 0 );
                child.scale.set( 1, 1, 1 );
            }
        } );
    };

    this.highlight = function ( axis )
    {
        this.traverse( function( child ) {

            if ( child.material && child.material.highlight )
            {
                if ( child.name === axis )
                {
                    child.material.highlight( true );
                }
                else
                {
                    child.material.highlight( false );
                }
            }
        } );
    };
};

Transformer.prototype = Object.create( THREE.Object3D.prototype );
Transformer.prototype.constructor = Transformer;

Transformer.prototype.update = function ( rotation, eye )
{
    var vec1 = new THREE.Vector3( 0, 0, 0 );
    var vec2 = new THREE.Vector3( 0, 1, 0 );
    var lookAtMatrix = new THREE.Matrix4();
    this.parent.rotation.fromArray([0, 0, 0]);

    this.traverse( function( child )
    {
        if ( child.name.search( "E" ) !== - 1 )
        {
            child.quaternion.setFromRotationMatrix( lookAtMatrix.lookAt( eye, vec1, vec2 ) );
        }
        else if ( child.name.search( "X" ) !== - 1 || child.name.search( "Y" ) !== - 1 || child.name.search( "Z" ) !== - 1 )
        {
            child.quaternion.setFromEuler( rotation );
        }
    } );
};

var TransformTranslate = function ()
{
    Transformer.call( this );

    var arrowGeometry = new THREE.Geometry();
    var mesh = new THREE.Mesh( new THREE.CylinderGeometry( 0, 0.05, 0.2, 12, 1, false ) );
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    arrowGeometry.merge( mesh.geometry, mesh.matrix );

    var lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  1, 0, 0 ], 3 ) );

    var lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  0, 1, 0 ], 3 ) );

    var lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  0, 0, 1 ], 3 ) );

    this.handleTransformer = {

        X: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0xff0000 } ) ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
            [ new THREE.Line( lineXGeometry, new TransformerLineMaterial( { color: 0xff0000 } ) ) ]
        ],

        Y: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0x00ff00 } ) ), [ 0, 0.5, 0 ] ],
            [   new THREE.Line( lineYGeometry, new TransformerLineMaterial( { color: 0x00ff00 } ) ) ]
        ],

        Z: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0x0000ff } ) ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
            [ new THREE.Line( lineZGeometry, new TransformerLineMaterial( { color: 0x0000ff } ) ) ]
        ]

    };

    this.pickerTransformer = {

        X: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
        ],

        Y: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0.6, 0 ] ]
        ],

        Z: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
        ]

    };

    this.setActivePlane = function ( axis, eye )
    {
        var tempMatrix = new THREE.Matrix4();
        eye.applyMatrix4( tempMatrix.getInverse( tempMatrix.extractRotation( this.planes[ "XY" ].matrixWorld ) ) );

        if ( axis === "X" )
        {
            this.activePlane = this.planes[ "XY" ];
            if ( Math.abs( eye.y ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "XZ" ];
        }

        if ( axis === "Y" )
        {
            this.activePlane = this.planes[ "XY" ];
            if ( Math.abs( eye.x ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "YZ" ];
        }

        if ( axis === "Z" )
        {
            this.activePlane = this.planes[ "XZ" ];
            if ( Math.abs( eye.x ) > Math.abs( eye.y ) ) this.activePlane = this.planes[ "YZ" ];
        }

        if ( axis === "XYZ" ) this.activePlane = this.planes[ "XYZE" ];

        if ( axis === "XY" ) this.activePlane = this.planes[ "XY" ];

        if ( axis === "YZ" ) this.activePlane = this.planes[ "YZ" ];

        if ( axis === "XZ" ) this.activePlane = this.planes[ "XZ" ];
    };

    this.init();
};

TransformTranslate.prototype = Object.create( Transformer.prototype );
TransformTranslate.prototype.constructor = TransformTranslate;

var TransformRotate = function ()
{
    Transformer.call( this );

    var arrowGeometry = new THREE.Geometry();
    var mesh = new THREE.Mesh( new THREE.SphereGeometry( 0.08, 32, 32 ) );
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    arrowGeometry.merge( mesh.geometry, mesh.matrix );

    var lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  1, 0, 0 ], 3 ) );

    var lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  0, 1, 0 ], 3 ) );

    var lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  0, 0, 1 ], 3 ) );

    this.handleTransformer = {

        // X: [
        //     [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0xff0000 } ) ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
        //     [ new THREE.Line( lineXGeometry, new TransformerLineMaterial( { color: 0xff0000 } ) ) ]
        // ],

        Z: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0x00ff00 } ) ), [ 0, 0.5, 0 ] ],
            [ new THREE.Line( lineYGeometry, new TransformerLineMaterial( { color: 0x00ff00 } ) ) ]
        ],

        Y: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0x0000ff } ) ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
            [ new THREE.Line( lineZGeometry, new TransformerLineMaterial( { color: 0x0000ff } ) ) ]
        ]

    };

    this.pickerTransformer = {

        // X: [
        //     [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
        // ],

        Z: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0.6, 0 ] ]
        ],

        Y: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
        ]

    };

    this.setActivePlane = function ( axis )
    {
        if ( axis === "Y" ) this.activePlane = this.planes[ "XZ" ];

        if ( axis === "Z" ) this.activePlane = this.planes[ "XY" ];
    };

    this.update = function ( rotation, eye2 )
    {
        Transformer.prototype.update.apply( this, arguments );

        var group = {

            handles: this[ "handles" ],
            pickers: this[ "pickers" ]

        };

        var tempMatrix = new THREE.Matrix4();
        var worldRotation = new THREE.Euler( 0, 0, 1 );
        var tempQuaternion = new THREE.Quaternion();
        var unitX = new THREE.Vector3( 1, 0, 0 );
        var unitY = new THREE.Vector3( 0, 1, 0 );
        var unitZ = new THREE.Vector3( 0, 0, 1 );
        var quaternionX = new THREE.Quaternion();
        var quaternionY = new THREE.Quaternion();
        var quaternionZ = new THREE.Quaternion();
        var eye = eye2.clone();

        worldRotation.copy( this.planes[ "XY" ].rotation );
        tempQuaternion.setFromEuler( worldRotation );

        tempMatrix.makeRotationFromQuaternion( tempQuaternion ).getInverse( tempMatrix );
        eye.applyMatrix4( tempMatrix );
        this.parent.rotation.setFromRotationMatrix( tempMatrix.extractRotation( this.parent.object.matrixWorld ) )

        this.traverse( function( child ) {

            tempQuaternion.setFromEuler( worldRotation );

            if ( child.name === "Z" )
            {
                quaternionY.setFromAxisAngle( unitY, Math.atan2( eye.x, eye.z ) );
                tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionY );
                child.quaternion.copy( tempQuaternion );
            }

            if ( child.name === "Y" )
            {
                quaternionZ.setFromAxisAngle( unitZ, Math.atan2( eye.y, eye.x ) );
                tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionZ );
                child.quaternion.copy( tempQuaternion );
            }

            //console.log("child", child)
        } );
    };
    this.init();
};

TransformRotate.prototype = Object.create( Transformer.prototype );
TransformRotate.prototype.constructor = TransformRotate;

var TransformScale = function ()
{
    Transformer.call( this );

    var arrowGeometry = new THREE.Geometry();
    var mesh = new THREE.Mesh( new THREE.BoxGeometry( 0.125, 0.125, 0.125 ) );
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    arrowGeometry.merge( mesh.geometry, mesh.matrix );

    var lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  1, 0, 0 ], 3 ) );

    var lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  0, 1, 0 ], 3 ) );

    var lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0,  0, 0, 1 ], 3 ) );

    this.handleTransformer = {

        X: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0xff0000 } ) ), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
            [ new THREE.Line( lineXGeometry, new TransformerLineMaterial( { color: 0xff0000 } ) ) ]
        ],

        Y: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0x00ff00 } ) ), [ 0, 0.5, 0 ] ],
            [ new THREE.Line( lineYGeometry, new TransformerLineMaterial( { color: 0x00ff00 } ) ) ]
        ],

        Z: [
            [ new THREE.Mesh( arrowGeometry, new TransformerMaterial( { color: 0x0000ff } ) ), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
            [ new THREE.Line( lineZGeometry, new TransformerLineMaterial( { color: 0x0000ff } ) ) ]
        ]

    };

    this.pickerTransformer = {

        X: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
        ],

        Y: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0.6, 0 ] ]
        ],

        Z: [
            [ new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.2, 0, 1, 4, 1, false ), pickerMaterial ), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
        ]

    };

    this.setActivePlane = function ( axis, eye ) {

        var tempMatrix = new THREE.Matrix4();
        eye.applyMatrix4( tempMatrix.getInverse( tempMatrix.extractRotation( this.planes[ "XY" ].matrixWorld ) ) );

        if ( axis === "X" ) {

            this.activePlane = this.planes[ "XY" ];
            if ( Math.abs( eye.y ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "XZ" ];

        }

        if ( axis === "Y" ) {

            this.activePlane = this.planes[ "XY" ];
            if ( Math.abs( eye.x ) > Math.abs( eye.z ) ) this.activePlane = this.planes[ "YZ" ];

        }

        if ( axis === "Z" ) {

            this.activePlane = this.planes[ "XZ" ];
            if ( Math.abs( eye.x ) > Math.abs( eye.y ) ) this.activePlane = this.planes[ "YZ" ];

        }

        if ( axis === "XYZ" ) this.activePlane = this.planes[ "XYZE" ];

    };

    this.init();
};

TransformScale.prototype = Object.create( Transformer.prototype );
TransformScale.prototype.constructor = TransformScale;

var TransformControls = function ( camera, domElement )
{
    // TODO: Make non-uniform scale and rotate play nice in hierarchies
    // TODO: ADD RXYZ contol

    THREE.Object3D.call( this );

    domElement = ( domElement !== undefined ) ? domElement : document;

    this.object = undefined;
    this.visible = false;
    // Scaling sets the space to "local", translation and rotations must therefore handle both
    // "world" and "local".
    this.space = "world";
    this.size = 0.5;
    this.axis = null;

    var scope = this;

    var _mode = "translate";
    var _dragging = false;
    var _plane = "XY";
    var _transformer = {

        "translate": new TransformTranslate(),
        "rotate": new TransformRotate(),
        "scale": new TransformScale()
    };

    for ( var type in _transformer )
    {
        var transformerObj = _transformer[ type ];

        transformerObj.visible = ( type === _mode );
        this.add( transformerObj );
    }

    var changeEvent = { type: "change" };
    var mouseDownEvent = { type: "mouseDown" };
    var mouseUpEvent = { type: "mouseUp", mode: _mode };
    var objectChangeEvent = { type: "objectChange" };

    var ray = new THREE.Raycaster();
    var pointerVector = new THREE.Vector2();

    var point = new THREE.Vector3();
    var offset = new THREE.Vector3();

    var rotation = new THREE.Vector3();
    var offsetRotation = new THREE.Vector3();
    var scale = 1;

    var lookAtMatrix = new THREE.Matrix4();
    var eye = new THREE.Vector3();

    var tempMatrix = new THREE.Matrix4();
    var tempVector = new THREE.Vector3();
    var tempQuaternion = new THREE.Quaternion();
    var unitX = new THREE.Vector3( 1, 0, 0 );
    var unitY = new THREE.Vector3( 0, 1, 0 );
    var unitZ = new THREE.Vector3( 0, 0, 1 );

    var quaternionXYZ = new THREE.Quaternion();
    var quaternionX = new THREE.Quaternion();
    var quaternionY = new THREE.Quaternion();
    var quaternionZ = new THREE.Quaternion();
    var quaternionE = new THREE.Quaternion();

    var oldPosition = new THREE.Vector3();
    var oldScale = new THREE.Vector3();
    var oldRotationMatrix = new THREE.Matrix4();

    var parentRotationMatrix  = new THREE.Matrix4();
    var parentScale = new THREE.Vector3();

    var worldPosition = new THREE.Vector3();
    var worldRotation = new THREE.Euler();
    var worldRotationMatrix  = new THREE.Matrix4();
    var camPosition = new THREE.Vector3();
    var camRotation = new THREE.Euler();

    domElement.addEventListener( "mousedown", onPointerDown, false );
    domElement.addEventListener( "touchstart", onPointerDown, false );

    domElement.addEventListener( "mousemove", onPointerHover, false );
    domElement.addEventListener( "touchmove", onPointerHover, false );

    domElement.addEventListener( "mousemove", onPointerMove, false );
    domElement.addEventListener( "touchmove", onPointerMove, false );

    domElement.addEventListener( "mouseup", onPointerUp, false );
    domElement.addEventListener( "mouseout", onPointerUp, false );
    domElement.addEventListener( "touchend", onPointerUp, false );
    domElement.addEventListener( "touchcancel", onPointerUp, false );
    domElement.addEventListener( "touchleave", onPointerUp, false );

    this.dispose = function ()
    {
        domElement.removeEventListener( "mousedown", onPointerDown );
        domElement.removeEventListener( "touchstart", onPointerDown );

        domElement.removeEventListener( "mousemove", onPointerHover );
        domElement.removeEventListener( "touchmove", onPointerHover );

        domElement.removeEventListener( "mousemove", onPointerMove );
        domElement.removeEventListener( "touchmove", onPointerMove );

        domElement.removeEventListener( "mouseup", onPointerUp );
        domElement.removeEventListener( "mouseout", onPointerUp );
        domElement.removeEventListener( "touchend", onPointerUp );
        domElement.removeEventListener( "touchcancel", onPointerUp );
        domElement.removeEventListener( "touchleave", onPointerUp );
    };

    this.attach = function ( object )
    {
        this.object = object;
        this.visible = true;
        this.update();
    };

    this.detach = function ()
    {
        this.object = undefined;
        this.visible = false;
        this.axis = null;
    };

    this.getMode = function ()
    {
        return _mode;
    };

    this.setMode = function ( mode )
    {
        _mode = mode ? mode : _mode;

        if ( _mode === "scale" ) scope.space = "local";

        for ( var type in _transformer ) _transformer[ type ].visible = ( type === _mode );

        this.update();
        scope.dispatchEvent( changeEvent );
    };

    this.setSize = function ( size )
    {
        scope.size = size;
        this.update();
        scope.dispatchEvent( changeEvent );
    };

    this.setSpace = function ( space )
    {
        console.log( "space: ", space);
        scope.space = space;
        this.update();
        scope.dispatchEvent( changeEvent );
    };

    this.update = function ()
    {
        if ( scope.object === undefined ) return;

        scope.object.updateMatrixWorld();
        worldPosition.setFromMatrixPosition( scope.object.matrixWorld );
        worldRotation.setFromRotationMatrix( tempMatrix.extractRotation( scope.object.matrixWorld ) );

        camera.updateMatrixWorld();
        camPosition.setFromMatrixPosition( camera.matrixWorld );
        camRotation.setFromRotationMatrix( tempMatrix.extractRotation( camera.matrixWorld ) );

        scale = worldPosition.distanceTo( camPosition ) / 6 * scope.size;
        this.position.copy( worldPosition );
        this.scale.set( scale, scale, scale );

        if ( camera instanceof THREE.PerspectiveCamera )
        {
            eye.copy( camPosition ).sub( worldPosition ).normalize();
        }
        else if ( camera instanceof THREE.OrthographicCamera )
        {
            eye.copy( camPosition ).normalize();
        }

        if ( scope.space === "local" )
        {
            _transformer[ _mode ].update( worldRotation, eye );
        }
        else if ( scope.space === "world" )
        {
            _transformer[ _mode ].update( new THREE.Euler(), eye );
        }

        _transformer[ _mode ].highlight( scope.axis );
        requestAnimationFrame( app.render.bind(app) );
    };

    function onPointerHover( event )
    {
        if ( scope.object === undefined || _dragging === true || ( event.button !== undefined && event.button !== 0 ) ) return;

        var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;
        var intersect = intersectObjects( pointer, _transformer[ _mode ].pickers.children );
        var axis = null;

        if ( intersect )
        {
            axis = intersect.object.name;
            event.preventDefault();
        }

        if ( scope.axis !== axis )
        {
            scope.axis = axis;
            scope.update();
            scope.dispatchEvent( changeEvent );
        }
    }

    function onPointerDown( event )
    {
        if ( scope.object === undefined || _dragging === true || ( event.button !== undefined && event.button !== 0 ) ) return;

        var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;

        if ( pointer.button === 0 || pointer.button === undefined )
        {
            var intersect = intersectObjects( pointer, _transformer[ _mode ].pickers.children );

            if ( intersect )
            {
                event.preventDefault();
                event.stopPropagation();

                scope.dispatchEvent( mouseDownEvent );
                scope.axis = intersect.object.name;
                scope.update();

                eye.copy( camPosition ).sub( worldPosition ).normalize();

                _transformer[ _mode ].setActivePlane( scope.axis, eye );

                var planeIntersect = intersectObjects( pointer, [ _transformer[ _mode ].activePlane ] );

                if ( planeIntersect )
                {
                    oldPosition.copy( scope.object.position );
                    oldScale.copy( scope.object.scale );

                    oldRotationMatrix.extractRotation( scope.object.matrix );
                    worldRotationMatrix.extractRotation( scope.object.matrixWorld );

                    parentRotationMatrix.extractRotation( scope.object.parent.matrixWorld );
                    parentScale.setFromMatrixScale( tempMatrix.getInverse( scope.object.parent.matrixWorld ) );

                    offset.copy( planeIntersect.point );
                }
            }
        }
        _dragging = true;
    }

    function onPointerMove( event )
    {
        if ( scope.object === undefined || scope.axis === null || _dragging === false || ( event.button !== undefined && event.button !== 0 ) ) return;

        var pointer = event.changedTouches ? event.changedTouches[ 0 ] : event;
        var planeIntersect = intersectObjects( pointer, [ _transformer[ _mode ].activePlane ] );

        if ( planeIntersect === false ) return;

        event.preventDefault();
        event.stopPropagation();

        point.copy( planeIntersect.point );

        if ( _mode === "translate" )
        {
            point.sub( offset );
            point.multiply( parentScale );

            if ( scope.space === "local" )
            {
                point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

                if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
                if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
                if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

                point.applyMatrix4( oldRotationMatrix );

                scope.object.position.copy( oldPosition );
                scope.object.position.add( point );
            }

            if ( scope.space === "world" || scope.axis.search( "XYZ" ) !== - 1 )
            {
                if ( scope.axis.search( "X" ) === - 1 ) point.x = 0;
                if ( scope.axis.search( "Y" ) === - 1 ) point.y = 0;
                if ( scope.axis.search( "Z" ) === - 1 ) point.z = 0;

                point.applyMatrix4( tempMatrix.getInverse( parentRotationMatrix ) );

                scope.object.position.copy( oldPosition );
                scope.object.position.add( point );
            }

            // TranslationSnap was here
        }
        else if ( _mode === "scale" )
        {
            point.sub( offset );
            point.multiply( parentScale );

            // Scaling can only have local space
            if ( scope.space === "local" )
            {
                if ( scope.axis === "XYZ" )
                {
                    scale = 1 + ( ( point.y ) / Math.max( oldScale.x, oldScale.y, oldScale.z ) );

                    scope.object.scale.x = oldScale.x * scale;
                    scope.object.scale.y = oldScale.y * scale;
                    scope.object.scale.z = oldScale.z * scale;
                }
                else
                {
                    point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

                    if ( scope.axis === "X" ) scope.object.scale.x = oldScale.x * ( 1 + 10*point.x / oldScale.x );
                    if ( scope.axis === "Y" ) scope.object.scale.y = oldScale.y * ( 1 + 10*point.y / oldScale.y );
                    if ( scope.axis === "Z" ) scope.object.scale.z = oldScale.z * ( 1 + 10*point.z / oldScale.z );
                }
            }
        }
        else if ( _mode === "rotate" )
        {
            point.sub( worldPosition );
            point.multiply( parentScale );
            tempVector.copy( offset ).sub( worldPosition );
            tempVector.multiply( parentScale );

            if ( scope.space === "local" )
            {
                point.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );
                tempVector.applyMatrix4( tempMatrix.getInverse( worldRotationMatrix ) );

                rotation.set(
                    Math.atan2( point.z, point.y ),
                    Math.atan2( point.x, point.z ),
                    Math.atan2( point.y, point.x ) );
                offsetRotation.set(
                    Math.atan2( tempVector.z, tempVector.y ),
                    Math.atan2( tempVector.x, tempVector.z ),
                    Math.atan2( tempVector.y, tempVector.x ) );

                quaternionXYZ.setFromRotationMatrix( oldRotationMatrix );

                // RotationSnap was here

                quaternionX.setFromAxisAngle( unitX, rotation.x - offsetRotation.x );
                quaternionY.setFromAxisAngle( unitY, rotation.y - offsetRotation.y );
                quaternionZ.setFromAxisAngle( unitZ, rotation.z - offsetRotation.z );

                if ( scope.axis === "X" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionX );
                if ( scope.axis === "Y" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionY );
                if ( scope.axis === "Z" ) quaternionXYZ.multiplyQuaternions( quaternionXYZ, quaternionZ );

                scope.object.quaternion.copy( quaternionXYZ );
            }
            else if ( scope.space === "world" )
            {
                rotation.set(
                    Math.atan2( point.z, point.y ),
                    Math.atan2( point.x, point.z ),
                    Math.atan2( point.y, point.x ) );
                offsetRotation.set(
                    Math.atan2( tempVector.z, tempVector.y ),
                    Math.atan2( tempVector.x, tempVector.z ),
                    Math.atan2( tempVector.y, tempVector.x ) );

                tempQuaternion.setFromRotationMatrix( tempMatrix.getInverse( parentRotationMatrix ) );

                // RotationSnap was here

                quaternionX.setFromAxisAngle( unitX, rotation.x - offsetRotation.x );
                quaternionY.setFromAxisAngle( unitY, rotation.y - offsetRotation.y );
                quaternionZ.setFromAxisAngle( unitZ, rotation.z - offsetRotation.z );

                quaternionXYZ.setFromRotationMatrix( worldRotationMatrix );

                if ( scope.axis === "X" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionX );
                if ( scope.axis === "Y" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionY );
                if ( scope.axis === "Z" ) tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionZ );

                tempQuaternion.multiplyQuaternions( tempQuaternion, quaternionXYZ );

                scope.object.quaternion.copy( tempQuaternion );
            }
        }

        scope.update();
        scope.dispatchEvent( changeEvent );
        scope.dispatchEvent( objectChangeEvent );
    }

    function onPointerUp( event )
    {
        event.preventDefault(); // Prevent MouseEvent on mobile

        if ( event.button !== undefined && event.button !== 0 ) return;

        if ( _dragging && ( scope.axis !== null ) )
        {
            mouseUpEvent.mode = _mode;
            scope.dispatchEvent( mouseUpEvent );
        }

        _dragging = false;

        onPointerHover( event );
    }

    function intersectObjects( pointer, objects )
    {
        var rect = domElement.getBoundingClientRect();
        var x = ( pointer.clientX - rect.left ) / rect.width;
        var y = ( pointer.clientY - rect.top ) / rect.height;

        pointerVector.set( ( x * 2 ) - 1, - ( y * 2 ) + 1 );
        ray.setFromCamera( pointerVector, camera );

        var intersections = ray.intersectObjects( objects, true );
        return intersections[ 0 ] ? intersections[ 0 ] : false;
    }

};

TransformControls.prototype = Object.create( THREE.Object3D.prototype );
TransformControls.prototype.constructor = TransformControls;

