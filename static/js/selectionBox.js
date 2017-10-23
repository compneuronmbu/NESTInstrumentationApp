/**
 * Represents a connection line between a selection and a device.
 *
 * @param {Object} ll Lower left coordinates.
 * @param {Object} ur Upper right coordinates.
 * @param {Bool} is3D If we are in the 2D or 3D version of the app.
 */
class ConnectionLine
{
    constructor( ll, ur, is3D, parent )
    {
        this.CURVE_SEGMENTS = 100;
        this.LINECOLOUR = 0xffca28;
        this.ACTIVECOLOUR = 0x28FFCC;
        this.ll = ll;
        this.ur = ur;
        this.is3D = is3D;
        this.target = "";
        this.parent = parent;
    }

    /**
     * Creates a line representing a connection, that is to be connected to a
     * device.
     */
    makeLine()
    {
        var curveZPos = this.is3D ? ( this.ll.z + this.ur.z ) / 2.0 : 0;
        this.curve = new app.THREE.CatmullRomCurve3( [
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, curveZPos ),
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, curveZPos ),
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, curveZPos ),
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, curveZPos )
        ] );
        this.curve.type = 'chordal';
        this.curveGeometry = new app.THREE.Geometry();
        this.curveGeometry.vertices = this.curve.getPoints( this.CURVE_SEGMENTS );
        this.curveMaterial = new app.THREE.LineBasicMaterial(
        {
            color: this.LINECOLOUR,
            linewidth: 3
        } );
        this.curveObject = new app.THREE.Line( this.curveGeometry, this.curveMaterial );
        this.curveObject.parentObject = this;
    }

    /**
     * Given the mouse position and current box dimensions, 
     * updates the connection line.
     */
    updateLine(newEndPos, radius)
    {
        var centreX = ( this.ll.x + this.ur.x ) / 2;
        var direction = 1;
        var endLength = 0.015;

        var endPos = ( newEndPos === undefined ) ? this.curve.points[ 3 ] : newEndPos;
        if ( endPos.x < centreX )
        {
            this.curve.points[ 0 ].x = ( this.ll.x < this.ur.x ) ? this.ll.x : this.ur.x;
        }
        else
        {
            this.curve.points[ 0 ].x = ( this.ll.x < this.ur.x ) ? this.ur.x : this.ll.x;
            direction = -1;
        }

        this.curve.points[ 0 ].y = ( this.ll.y + this.ur.y ) / 2;
        this.curve.points[ 1 ].x = this.curve.points[ 0 ].x + direction * -endLength;
        this.curve.points[ 1 ].y = this.curve.points[ 0 ].y;
        if (this.is3D)
        {
            this.curve.points[ 0 ].z = ( this.ll.z + this.ur.z ) / 2.0;
            this.curve.points[ 1 ].z = this.curve.points[ 0 ].z;
        }

        if ( newEndPos !== undefined )
        {
            this.curve.points[ 3 ].x = newEndPos.x + direction * radius;
            this.curve.points[ 3 ].y = newEndPos.y;
            this.curve.points[ 2 ].x = this.curve.points[ 3 ].x + direction * endLength;
            this.curve.points[ 2 ].y = this.curve.points[ 3 ].y;
            if (this.is3D)
            {
                this.curve.points[ 3 ].z = newEndPos.z;
                this.curve.points[ 2 ].z = this.curve.points[ 3 ].z;
            }
        }

        for ( var i = 0; i <= this.CURVE_SEGMENTS; ++i )
        {
            // console.log(this.curve.getPoint( i / ( this.CURVE_SEGMENTS ) ));
            this.curveObject.geometry.vertices[ i ].copy( this.curve.getPoint( i / ( this.CURVE_SEGMENTS ) ) );
        }
        this.curveObject.geometry.verticesNeedUpdate = true;
    }

    /**
     * Updates the start position of all lines of this selection box.
     */
    updateLineStart(ll, ur)
    {
        this.ll = ll;
        this.ur = ur;
        this.updateLine( undefined, 0 );
    }

    /**
     * Updates the end positions of lines connecting to a specific target device.
     */
    updateLineEnd( newPos, target, radius = 0 )
    {
        if ( this.target === target )
        {
            this.updateLine( newPos, radius );
        }
    }

    /**
     * Marks the connection line as active by changing the colour.
     */
    setActive()
    {
        this.curveMaterial.color.set( this.ACTIVECOLOUR );
    }

    /**
     * Marks the connection line as inactive by resetting the colour.
     */
    setInactive()
    {
        this.curveMaterial.color.set( this.LINECOLOUR );
    }

    /**
     * Removes the registered connection and removes the connection line.
     */
    remove()
    {
        var index = app.deviceBoxMap[ this.target ].connectees.indexOf( this.parent );
        app.deviceBoxMap[ this.target ].connectees.splice( index, 1 );
        this.parent.removeLines( this.target );
    }
}


/**
 * Represents a selection of neurons in 2D space.
 *
 * @param {Object} ll Lower left coordinates.
 * @param {Object} ur Upper right coordinates.
 * @param {String} shape Shape of the selection.
 */
class SelectionBox
{
    constructor( ll, ur, shape, layerName = "" )
    {
        this.uniqueID = -1;
        this.layerName = layerName;
        // ll and ur use screen coordinates
        this.ll = ll;
        this.ur = ur;

        this.majorAxis = Math.max( ( ur.x - ll.x ) / 2, ( ur.y - ll.y ) / 2 );
        this.minorAxis = Math.min( ( ur.x - ll.x ) / 2, ( ur.y - ll.y ) / 2 );
        this.angle = ( this.majorAxis == ( ur.x - ll.x )  / 2 ) ? 0.0: Math.PI / 2;

        this.selectedNeuronType = app.getSelectedDropDown( "neuronType" );
        this.selectedSynModel = app.getSelectedDropDown( "synapseModel" );
        this.selectedShape = shape;

        this.box;
        this.resizePoints = [];
        this.rotationPoints = [];

        // SelectedFirstTime is used to turn the elliptical masks. If we press on an
        // elliptical mask two times, we should get point that let us turn the mask the
        // second time.
        this.selectedFirstTime = false;

        this.currentCurve;
        this.currentCurveObject;
        this.lines = [];

        this.selectedPointIDs = [];
        this.nSelected = 0;

        this.makeBox();
        this.getLayerName();
        if ( this.layerName === "" )
        {
            // If there is no layerName, the selection is invalid
            return;
        }
        this.updateColors();
        if (this.nSelected === 0)  // nothing selected
        {
            this.layerName = "";
        }
    }

    /**
     * Finds the name of the layer in which the selection box is located.
     */
    getLayerName()
    {
        if ( this.layerName !== "" ) // If layer name is already set
        {
            return;
        }
        var roomMouseDown = app.toObjectCoordinates( app.mouseDownCoords );
        var mouseUpCoords = {
            x: app.mRelPos.x + app.mouseDownCoords.x,
            y: app.mRelPos.y + app.mouseDownCoords.y
        };
        var roomMouseUp = app.toObjectCoordinates( mouseUpCoords );

        for ( var name in app.layer_points )
        {
            if ( app.layer_points.hasOwnProperty( name ) )
            {
                var bbox = app.layer_points[ name ].points.geometry.boundingBox;

                var shiftX = Math.abs( 0.1 * ( bbox.max.x - bbox.min.x ) );
                var shiftY = Math.abs( 0.1 * ( bbox.max.y - bbox.min.y ) );
                if ( ( roomMouseDown.x >= bbox.min.x - shiftX ) && ( roomMouseDown.y >= bbox.min.y - shiftY ) && ( roomMouseDown.x <= bbox.max.x + shiftX ) && ( roomMouseDown.y <= bbox.max.y + shiftY ) )
                {
                    this.layerName = name;
                    break;
                }
                else if ( ( this.layerName === "" ) && ( roomMouseUp.x >= bbox.min.x - shiftX ) && ( roomMouseUp.y >= bbox.min.y - shiftY ) && ( roomMouseUp.x <= bbox.max.x + shiftX ) && ( roomMouseUp.y <= bbox.max.y + shiftY ) )
                {
                    this.layerName = name;
                }
            }
        }
        console.log(this.layerName)
    }

    /**
     * Updates the colors of the points within the box.
     */
    updateColors()
    {
        var points = app.layer_points[ this.layerName ].points;
        var colors = points.geometry.getAttribute( "customColor" ).array;
        var positions = points.geometry.getAttribute( "position" ).array;

        var nSelectedOld = this.nSelected;

        var oldPointIDs = this.selectedPointIDs;
        var newPoints = [];

        var colorID;

        var xypos;

        for ( var i = 0; i < oldPointIDs.length; ++i )
        {
            colorID = oldPointIDs[ i ];

            colors[ colorID ] = app.color.r;
            colors[ colorID + 1 ] = app.color.g;
            colors[ colorID + 2 ] = app.color.b;

            this.nSelected -= 1
        }

        for ( var i = 0; i < positions.length; i += 3 )
        {
            var p = {
                x: positions[ i ],
                y: positions[ i + 1 ],
                z: positions[ i + 2 ]
            };
            xypos = app.toScreenXY( p );

            if ( this.withinBounds( xypos ) )
            {
                newPoints.push( i );
                colors[ i ] = 1.;
                colors[ i + 1 ] = 0.96;
                colors[ i + 2 ] = 0.00;

                this.nSelected += 1;
            }

        }
        points.geometry.attributes.customColor.needsUpdate = true;

        if ( this.nSelected != nSelectedOld )
        {
            app.$( "#infoselected" ).html( this.nSelected.toString() + " selected" );
        }

        this.selectedPointIDs = newPoints;
    }

    /**
     * Makes a box in space and adds it to the scene.
     */
    makeBox()
    {
        console.log(this.ll)
        console.log(this.ur)
        var objectBoundsLL = app.toObjectCoordinates( this.ll );
        var objectBoundsUR = app.toObjectCoordinates( this.ur );
        var xLength = objectBoundsUR.x - objectBoundsLL.x;
        var yLength = objectBoundsUR.y - objectBoundsLL.y;

        if ( this.selectedShape == "rectangular" )
        {
            var geometry = new app.THREE.BoxBufferGeometry( xLength, yLength, 0.0 );
        }
        else if ( this.selectedShape == "elliptical" )
        {
            var ellipseShape = new app.THREE.Shape();
            var major = Math.max( Math.abs(xLength), Math.abs(yLength) );
            var minor = Math.min( Math.abs(xLength), Math.abs(yLength) );
            ellipseShape.ellipse( 0, 0, major / 2, minor / 2, 0, 2 * Math.PI, 0, this.angle );
            var geometry = new app.THREE.ShapeBufferGeometry( ellipseShape, 200 );
        }

        var material = new app.THREE.MeshBasicMaterial(
        {
            color: 0xFFEA00,
            transparent: true,
            opacity: 0.2
        } );

        this.box = new app.THREE.Mesh( geometry, material );

        // Center of box
        var boxPosition = {
            x: ( objectBoundsUR.x + objectBoundsLL.x ) / 2,
            y: -( objectBoundsUR.y + objectBoundsLL.y ) / 2,
            z: 0.0
        }

        this.box.position.copy( boxPosition );
        app.scene.add( this.box );
        this.makeConnectionHandle();
    }

    /**
     * Updates the dimensions of the box.
     */
    updateBox()
    {
        var objectBoundsLL = app.toObjectCoordinates( this.ll );
        var objectBoundsUR = app.toObjectCoordinates( this.ur );
        var xLength = objectBoundsUR.x - objectBoundsLL.x;
        var yLength = objectBoundsUR.y - objectBoundsLL.y;

        if ( this.selectedShape == "rectangular" )
        {
            var geometry = new app.THREE.BoxBufferGeometry( xLength, yLength, 0.0 );
        }
        else if ( this.selectedShape == "elliptical" )
        {
            var ellipseShape = new app.THREE.Shape();
            var major = Math.max( Math.abs(xLength), Math.abs(yLength) );
            var minor = Math.min( Math.abs(xLength), Math.abs(yLength) );
            ellipseShape.ellipse( 0, 0, major / 2, minor / 2, 0, 2 * Math.PI, 0, this.angle );
            var geometry = new app.THREE.ShapeBufferGeometry( ellipseShape, 200 );
        }
        this.box.geometry = geometry;

        var boxPosition = {
            x: ( objectBoundsUR.x + objectBoundsLL.x ) / 2,
            y: -( objectBoundsUR.y + objectBoundsLL.y ) / 2,
            z: 0.0
        }

        this.box.position.copy( boxPosition );
    }

    /**
     * Removes the box from the scene and resets the colours of the points.
     */
    removeBox()
    {
        app.scene.remove( this.box );

        if ( this.layerName )
        {
            var points = app.layer_points[ this.layerName ].points;
            var colors = points.geometry.getAttribute( "customColor" ).array;

            var nSelectedOld = this.nSelected;

            var oldPointIDs = this.selectedPointIDs;

            var colorID;

            for ( var i = 0; i < oldPointIDs.length; ++i )
            {
                colorID = oldPointIDs[ i ];

                colors[ colorID ] = app.color.r;
                colors[ colorID + 1 ] = app.color.g;
                colors[ colorID + 2 ] = app.color.b;

                this.nSelected -= 1
            }
            points.geometry.attributes.customColor.needsUpdate = true;

            if ( this.nSelected != nSelectedOld )
            {
                app.$( "#infoselected" ).html( this.nSelected.toString() + " selected" );
            }
        }
        this.removeConnectionHandle();
    }

    /**
     * Makes a handle which we can use to create a connection to a device.
     */
    makeConnectionHandle()
    {
        var handleGeometry = new app.THREE.SphereGeometry( 0.025, 32, 32 );
        var handleMaterial = new app.THREE.MeshBasicMaterial( { color: 0x28FFCC } );
        handleMaterial.transparent = true;
        handleMaterial.opacity = 0.5;
        this.connectionHandle = new app.THREE.Mesh( handleGeometry, handleMaterial );
        this.connectionHandle.rotation.set(0, 0, -1.55);
        this.updateConnectionHandle();  // To set the position
        app.scene.add( this.connectionHandle );
        document.addEventListener( "mousemove", this.onMouseMove.bind( this ), false );
    }

    /**
     * Updates the position of the connection handle.
     */
    updateConnectionHandle()
    {
        this.connectionHandle.position.copy( this.box.position );
    }

    /**
     * Shows the connection handle.
     */
    enableConnectionHandle()
    {
        if ( !this.connectionHandle.visible )
        {
            this.connectionHandle.visible = true;
            document.addEventListener( "mousemove", this.onMouseMove.bind( this ), false );
        }
    }

    /**
     * Hides the connection handle.
     */
    disableConnectionHandle()
    {
        this.connectionHandle.visible = false;
        document.removeEventListener( "mousemove", this.onMouseMove );
    }

    /**
     * Removes the connection handle.
     */
    removeConnectionHandle()
    {
        app.scene.remove( this.connectionHandle );
        document.removeEventListener( "mousemove", this.onMouseMove );
    }

    /**
     * Event handler for mouse movement.
     *
     * @event
     */
    onMouseMove(event)
    {
        var intersect = app.controls.getMouseIntersecting( event.clientX, event.clientY, [this.connectionHandle] );
        if ( intersect.length > 0 )
        {
            if ( this.connectionHandle.material.opacity !== 1 )
            {
                this.connectionHandle.material.opacity = 1;
                requestAnimationFrame( app.render.bind(app) );
            }
        }
        else
        {
            if ( this.connectionHandle.material.opacity !== 0.5 )
            {
                this.connectionHandle.material.opacity = 0.5;
                requestAnimationFrame( app.render.bind(app) );
            }
        }
    }

    /**
     * Creates a line representing a connection, that is to be connected to a
     * device.
     */
    makeLine()
    {
        var selectionBounds = this.getSelectionBounds();

        var line = new ConnectionLine(selectionBounds.ll, selectionBounds.ur, false, this);
        line.makeLine();
        this.currentCurveObject = line.curveObject;
        this.currentCurve = line.curve;
        app.scene.add( this.currentCurveObject );

        this.lines.push(line);
    }

    /**
     * Sets a target for the line that was created last.
     */
    setLineTarget( device )
    {
        this.lines[ this.lines.length - 1 ].target = device;
    }

    /**
     * Updates the start position of all lines of this selection box.
     */
    updateLineStart()
    {
        var selectionBounds = this.getSelectionBounds();
        for (var i = 0; i < this.lines.length; ++i)
        {
            this.lines[i].updateLineStart(selectionBounds.ll, selectionBounds.ur);
        }
    }

    /**
     * Updates the end positions of lines connecting to a specific target device.
     */
    updateLineEnd( newPos, target, radius = 0 )
    {
        for (var i = 0; i < this.lines.length; ++i)
        {
            this.lines[i].updateLineEnd(newPos, target, radius);
        }
    }

    /**
     * Connects a line to a target device.
     */
    lineToDevice( targetPos, radius, target )
    {
        var selectionBounds = this.getSelectionBounds();
        var centreX = ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2;
        if ( ( targetPos.x - radius ) < centreX )
        {
            this.updateLineEnd(
            {
                x: targetPos.x + radius,
                y: targetPos.y
            }, target );
        }
        else
        {
            this.updateLineEnd(
            {
                x: targetPos.x - radius,
                y: targetPos.y
            }, target );
        }
    }

    /**
     * Removes the line that was created last.
     */
    removeLine()
    {
        app.scene.remove( this.currentCurveObject );
        this.lines.pop();
    }

    /**
     * Removes all lines, or optionally a line connected to a specific target
     * device.
     *
     * @param {String} target Optional target device.
     */
    removeLines( target = "" )
    {
        for ( var i = 0; i < this.lines.length; ++i )
        {
            if ( target === "" )
            {
                app.scene.remove( this.lines[ i ].curveObject );
            }
            else if ( target === this.lines[ i ].target )
            {
                app.scene.remove( this.lines[ i ].curveObject );
                this.lines.splice( i, 1 );
                break;
            }
        }
        if ( target === "" )
        {
            this.lines = [];
        }
    }

    /**
     * Gets lower left and upper right coordinates in scene coordinates.
     */
    getSelectionBounds()
    {
        var roomLL = app.toObjectCoordinates( this.ll );
        var roomUR = app.toObjectCoordinates( this.ur );
        return {
            ll:
            {
                x: roomLL.x,
                y: -roomLL.y
            },
            ur:
            {
                x: roomUR.x,
                y: -roomUR.y
            }
        };
    }

    /**
     * Gets data of this selection box to be saved or sent to the server for
     * connecting.
     *
     * @returns {Object} Data of this selection box.
     */
    getData( convertToRoomCoordinates=false )
    {
        var noNeurons = { [this.layerName]: app.layer_points[this.layerName]['noElements'] };
        var data = {
            name: this.layerName,
            ll: this.ll,
            ur: this.ur,
            azimuthAngle: this.angle,
            noOfNeuronTypesInLayer: noNeurons,
            neuronType: this.selectedNeuronType,
            synModel: this.selectedSynModel,
            maskShape: this.selectedShape,
            uniqueID: this.uniqueID
        };
        if ( convertToRoomCoordinates )
        {
            // Convert ll and ur to points in space for NEST
            var selectedBBoxXYZ = {
                "ll": app.toObjectCoordinates( data.ll ),
                "ur": app.toObjectCoordinates( data.ur )
            };
            var selectionBox = {
                "ll":
                {
                    x: ( selectedBBoxXYZ.ll.x - app.layer_points[ data.name ].offsets.x ) * app.layer_points[ data.name ].extent[0] + app.layer_points[ data.name ].center[0] ,
                    y: ( -( selectedBBoxXYZ.ll.y + app.layer_points[ data.name ].offsets.y ) ) * app.layer_points[ data.name ].extent[1] + app.layer_points[ data.name ].center[1],
                    z: 0
                },
                "ur":
                {
                    x: ( selectedBBoxXYZ.ur.x - app.layer_points[ data.name ].offsets.x ) * app.layer_points[ data.name ].extent[0] + app.layer_points[ data.name ].center[0],
                    y: ( -( selectedBBoxXYZ.ur.y + app.layer_points[ data.name ].offsets.y ) ) * app.layer_points[ data.name ].extent[1] + app.layer_points[ data.name ].center[1],
                    z: 0
                }
            };
            data.selection = selectionBox;
            data.name = [data.name];
        }
        return data;
    }

    /**
     * Checks if the selection box is flipped, and updates accordingly.
     */
    checkFlip()
    {
        // We need to exchange coordinates if the selection is being flipped
        if( this.ll.x < this.ur.x && this.ll.y < this.ur.y )
        {
            return;
        }
        var nameArray;
        if (this.ll.x > this.ur.x && this.ll.y > this.ur.y)
        {
            nameArray = [
                'upperRight',
                'upperMiddle',
                'upperLeft',
                'middleLeft',
                'lowerLeft',
                'lowerMiddle',
                'lowerRight',
                'middleRight'
            ];
        }
        if ( this.ll.x > this.ur.x )
        {
            var tmpX = this.ur.x;
            this.ur.x = this.ll.x;
            this.ll.x = tmpX;
            if ( nameArray === undefined)
            {
                nameArray = [
                    'lowerRight',
                    'lowerMiddle',
                    'lowerLeft',
                    'middleLeft',
                    'upperLeft',
                    'upperMiddle',
                    'upperRight',
                    'middleRight'
                ];
            }
            
        }
        if ( this.ll.y > this.ur.y )
        {
            var tmpY = this.ur.y;
            this.ur.y = this.ll.y;
            this.ll.y = tmpY;
            if ( nameArray === undefined)
            {
                nameArray = [
                    'upperLeft',
                    'upperMiddle',
                    'upperRight',
                    'middleRight',
                    'lowerRight',
                    'lowerMiddle',
                    'lowerLeft',
                    'middleLeft'
                ];
            }
        }

        // Need to update the resize point names
        for (var i = 0; i < this.resizePoints.length; ++i)
        {
            this.resizePoints[i].name = nameArray[ i ];
        }
    }

    /**
     * Create points that can be used to resize the box.
     */
    makeSelectionPoints()
    {
        var selectionBounds = this.getSelectionBounds();

        if ( this.majorAxis == Math.abs( ( this.ur.x - this.ll.x ) / 2 ) )
        {
            var angle = this.angle;
        }
        else
        {
            var angle = this.angle + Math.PI / 2;
        }

        // We have to move the points a tiny bit towards the camera to make it 
        // appear over everything else.
        // We need to apply a rotation matrix in case we have a tilted ellipse.
        var center = this.box.position;
        var posArray = [
        {
            x: ( selectionBounds.ll.x - center.x ) * Math.cos( angle ) - ( selectionBounds.ll.y - center.y ) * Math.sin( angle ) + center.x,
            y: ( selectionBounds.ll.x - center.x ) * Math.sin( angle ) + ( selectionBounds.ll.y - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2 - center.x ) * Math.cos( angle ) - ( selectionBounds.ll.y - center.y ) * Math.sin( angle ) + center.x,
            y: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2 - center.x ) * Math.sin( angle ) + ( selectionBounds.ll.y - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( selectionBounds.ur.x - center.x ) * Math.cos( angle ) - ( selectionBounds.ll.y - center.y ) * Math.sin( angle ) + center.x,
            y: ( selectionBounds.ur.x - center.x ) * Math.sin( angle ) + ( selectionBounds.ll.y - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( selectionBounds.ur.x - center.x ) * Math.cos( angle ) - ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.sin( angle ) + center.x,
            y: ( selectionBounds.ur.x - center.x ) * Math.sin( angle ) + ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( selectionBounds.ur.x - center.x ) * Math.cos( angle ) - ( selectionBounds.ur.y - center.y ) * Math.sin( angle ) + center.x,
            y: ( selectionBounds.ur.x - center.x ) * Math.sin( angle ) + ( selectionBounds.ur.y - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2 - center.x ) * Math.cos( angle ) - ( selectionBounds.ur.y - center.y ) * Math.sin( angle ) + center.x,
            y: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2 - center.x ) * Math.sin( angle ) + ( selectionBounds.ur.y - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( selectionBounds.ll.x - center.x ) * Math.cos( angle ) - ( selectionBounds.ur.y - center.y ) * Math.sin( angle ) + center.x,
            y: ( selectionBounds.ll.x - center.x ) * Math.sin( angle ) + ( selectionBounds.ur.y - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        },
        {
            x: ( selectionBounds.ll.x - center.x ) * Math.cos( angle ) - ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.sin( angle ) + center.x,
            y: ( selectionBounds.ll.x - center.x ) * Math.sin( angle ) + ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.cos( angle ) + center.y,
            z: 0.0001
        } ];    
        
        var nameArray = [
            'lowerLeft',   //0
            'lowerMiddle', //1
            'lowerRight',  //2
            'middleRight', //3
            'upperRight',  //4
            'upperMiddle', //5
            'upperLeft',   //6
            'middleLeft',  //7
            'lowerLeft',   //8
            'lowerMiddle', //9
            'lowerRight',  //10
            'middleRight', //11
            'upperRight',  //12
            'upperMiddle', //13
            'upperLeft'    //14
        ];

        // Rotate the nameArray
        var rotater;
        if ( 0 <= angle && angle <= Math.PI / 6 )
        {
            rotater = 0;
        }
        else if ( Math.PI / 6 <= angle && angle <= Math.PI / 3 )
        {
            rotater = 1;
        }
        else if ( Math.PI / 3 <= angle && angle <= ( 2 * Math.PI ) / 3 )
        {
            rotater = 2;
        }
        else if ( ( 2 * Math.PI ) / 3 <= angle && angle <= ( 5 * Math.PI ) / 6 )
        {
            rotater = 3;
        }
        else if ( ( 5 * Math.PI ) / 6 <= angle && angle <= ( 7 * Math.PI ) / 6 )
        {
            rotater = 4;
        }
        else if ( ( 7 * Math.PI ) / 6 <= angle && angle <= ( 4 * Math.PI ) / 3 )
        {
            rotater = 5;
        }
        else if ( ( 4 * Math.PI ) / 3 <= angle && angle <= ( 5 * Math.PI ) / 3 )
        {
            rotater = 6;
        }
        else if ( ( 5 * Math.PI ) / 3 <= angle && angle <= ( 11 * Math.PI ) / 6 )
        {
            rotater = 7;
        }
        else if ( ( 11 * Math.PI ) / 6 <= angle && angle <= ( 2 * Math.PI ) )
        {
            rotater = 0;
        }

        for ( var i = 0; i < posArray.length; ++i )
        {
            this.resizePoints.push( this.makePoint( posArray[ i ], nameArray[ i + rotater ] , 0xcccccc ) );
        }
    }

    /**
     * Make a single resize or rotation point and add it to the scene.
     *
     * @param {Object} pos Coordinates of the new point.
     * @param {String} name Name of the new point.
     * @param {Object} col Colour of the new point.
     * @returns {THREE.Mesh} THREE representation of the point.
     */
    makePoint( pos, name, col )
    {
        var geometry = new app.THREE.CircleBufferGeometry( 0.009, 32 );
        var material = new app.THREE.MeshBasicMaterial(
        {
            color: col
        } );
        var point = new app.THREE.Mesh( geometry, material );
        point.name = name;
        point.position.copy( pos );

        app.scene.add( point );

        return point;
    }

    /**
     * Remove all resize and rotation points.
     */
    removePoints()
    {
        for ( var i = 0; i < this.resizePoints.length; ++i )
        {
            app.scene.remove( this.resizePoints[ i ] );
        }
        this.resizePoints = [];

        for ( var i = 0; i < this.rotationPoints.length; ++i )
        {
            app.scene.remove( this.rotationPoints[ i ] );
        }
        this.rotationPoints = [];
    }

    /**
     * Create points that can be used to rotate the elliptical box.
     */
    makeRotationPoints()
    {
        if( this.selectedShape == 'rectangular' )
        {
            this.makeSelectionPoints();
            // We currently only allow elliptical masks to be rotated.
            return;
        }

        this.box.geometry.computeBoundingBox();
        var bbox = this.box.geometry.boundingBox;
        var pos = this.box.position;

        // We have to move the points a tiny bit towards the camera to make it 
        // appear over everything else.
        // Rotation point in every corner.
        var posArray = [
        {
            x: bbox.min.x + pos.x,
            y: bbox.min.y + pos.y,
            z: 0.0001
        },
        {
            x: bbox.max.x + pos.x,
            y: bbox.min.y + pos.y,
            z: 0.0001
        },
        {
            x: bbox.max.x + pos.x,
            y: bbox.max.y + pos.y,
            z: 0.0001
        },
        {
            x: bbox.min.x + pos.x,
            y: bbox.max.y + pos.y,
            z: 0.0001
        } ];

        for ( var i = 0; i < posArray.length; ++i )
        {
            // 0xffa726 is an orange color.
            this.rotationPoints.push( this.makePoint( posArray[ i ], "rotationPoint" , 0xffa726 ) );
        }
    }

    /**
     * Update the major and minor axis of an ellipse mask.
     */
    updateMajorAndMinorAxis()
    {
        this.majorAxis = Math.max( Math.abs( ( this.ur.x - this.ll.x ) / 2 ),
                                   Math.abs( ( this.ur.y - this.ll.y ) / 2 ) );
        this.minorAxis = Math.min( Math.abs( ( this.ur.x - this.ll.x ) / 2 ),
                                   Math.abs( ( this.ur.y - this.ll.y ) / 2 ) );

        if ( Math.abs( this.angle - 0.0 ) <= 0.1 || Math.abs( this.angle - Math.PI / 2 ) <= 0.1 )
        {
            this.angle = ( this.majorAxis ===
                Math.abs( ( this.ur.x - this.ll.x ) / 2 ) ) ? 0.0: Math.PI / 2;
        }
    }

    /**
     * Takes a position and detects if it is within the boundary box.
     *
     * @param {Object} pos Position to be checked.
     * @returns {Bool} True if the position is inside the mask, else false.
     */
    withinBounds( pos )
    {
        if ( this.selectedShape == 'rectangular' )
        {
            return this.withinRectangleBounds( pos );
        }
        else if ( this.selectedShape == 'elliptical' )
        {
            return this.withinEllipticalBounds( pos );
        }
    }

    /**
     * Checks if a position is within the selection box. Rectangle version.
     *
     * @param {Object} pos Position to be checked.
     * @returns {Bool} True if the position is inside the box, else false.
     */
    withinRectangleBounds( pos )
    {
        return ( ( pos.x >= this.ll.x ) && ( pos.x <= this.ur.x ) && ( pos.y >= this.ll.y ) && ( pos.y <= this.ur.y ) );
    }

    /**
     * Checks if a position is within the selection box. Ellipse version.
     *
     * @param {Object} pos Position to be checked.
     * @returns {Bool} True if the position is inside the ellipse, else false.
     */
    withinEllipticalBounds( pos )
    {
        var center = {
            x: ( this.ur.x + this.ll.x ) / 2.0,
            y: ( this.ur.y + this.ll.y ) / 2.0
        };

        return ( ( Math.pow( ( pos.x - center.x ) * Math.cos( this.angle ) + ( pos.y - center.y ) * Math.sin( this.angle ), 2 ) ) / ( this.majorAxis * this.majorAxis ) + ( Math.pow( ( pos.x - center.x ) * Math.sin( this.angle ) - ( pos.y - center.y ) * Math.cos( this.angle ), 2 ) ) / ( this.minorAxis * this.minorAxis ) <= 1 );
    }

    deleteBox()
    {
        this.removePoints();
        this.removeBox();
        this.removeLines();
        this.removeConnectionHandle();
    }
}


/**
 * Represents a selection of neurons in 3D space.
 *
 * @param {Number} width Width of the selection.
 * @param {Number} height Height of the selection.
 * @param {Number} depth Depth of the selection.
 * @param {Object} center Center coordinates of the selection.
 * @param {String} shape Shape of the selection.
 */
class SelectionBox3D
{
    constructor( width, height, depth, center, shape, scale={x: 1.0, y: 1.0, z: 1.0} )
    {
        this.uniqueID = -1;

        this.originalWidth = width;
        this.originalHeight = height;
        this.originalDepth = depth;

        this.width = this.originalWidth * scale.x;
        this.height = this.originalHeight * scale.y;
        this.depth = this.originalDepth * scale.z;
        this.center = center;

        // ll and ur use object coordinates in 3D
        // TODO: Should we have same in 2D and 3D? Different because they are defined completely different.
        this.updateLLAndUR();

        this.azimuthAngle = 0.0;
        this.polarAngle = 0.0;

        this.selectedNeuronType = app.getSelectedDropDown( "neuronType" );
        this.selectedSynModel = app.getSelectedDropDown( "synapseModel" );
        this.selectedShape = shape;

        this.box;
        this.borderBox;
        this.activeColor = new app.THREE.Color();
        this.activeColor.setRGB( 1.0, 1.0, 0.0 );
        this.inactiveColor = new app.THREE.Color();
        this.inactiveColor.setRGB( 0.7, 0.7, 0.7 );

        this.currentCurve;
        this.currentCurveObject;
        this.lines = [];

        this.selectedPoints = {};

        this.makeBox();
        this.box.scale.set( scale.x, scale.y, scale.z );
    }

    /**
     * Creates a box, adds it to the scene, and sets it active in {@link Controls}.
     */
    makeBox()
    {
        if ( this.selectedShape === "box" )
        {
            var geometry = new app.THREE.BoxBufferGeometry(this.originalWidth, this.originalHeight, this.originalDepth);
        }
        else if ( this.selectedShape === "ellipsoidal" )
        {
            // For now we set the radius to be the largest of the dimensions
            var radius = Math.max( this.originalWidth, this.originalHeight, this.originalDepth );
            var geometry = new app.THREE.SphereBufferGeometry( radius / 2, 32, 32 );
        }
        console.log(geometry);
        var material = new app.THREE.MeshBasicMaterial();
        material.transparent = true;
        material.opacity = 0.3;
        this.box = new app.THREE.Mesh( geometry, material );
        this.box.position.copy( this.center );
        app.scene.add( this.box );
        this.makeBorderLines();
        this.makeTransformControls();
        this.updateColors();
        this.makeConnectionHandle();

        this.box.rotation.order = "ZYX";//"YZX";
        console.log(this.box)
    }

    /**
     * Creates lines around the borders of the selection.
     */
    makeBorderLines()
    {
        this.borderBox = new app.THREE.BoxHelper( );
        this.borderBox.material.depthTest = false;
        this.borderBox.material.transparent = true;

        app.scene.add( this.borderBox );

        this.borderBox.setFromObject( this.box );
        this.setBorderLinesColor(this.inactiveColor);
    }

    /**
     * Updates the border lines.
     */
    updateBorderLines()
    {
        this.borderBox.setFromObject( this.box );
    }

    /**
     * Sets the colour of the border lines.
     *
     * @param {Object} color New colour of the lines.
     */
    setBorderLinesColor( color)
    {
        this.borderBox.material.color = color;
    }

    /**
     * Makes transform controls for the selection box.
     */
    makeTransformControls()
    {
        //this.transformControls = new THREE.TransformControls( app.camera, app.renderer.domElement );
        this.transformControls = new TransformControls( app.camera, app.renderer.domElement );
        app.scene.add( this.transformControls );
        //this.transformControls.attach( this.box );

        console.log(this.transformControls)

        this.transformControls.addEventListener( 'change', this.updateAfterTransformations.bind( this ) )
    }

    /**
     * Updates the colours of points in the box, and position of the connection handle.
     */
    updateBox()
    {
        this.updateColors();
        this.updateConnectionHandle();
    }


    /**
     * Makes a handle which we can use to create a connection to a device.
     */
    makeConnectionHandle()
    {
        var handleGeometry = new app.THREE.SphereGeometry( 0.025, 32, 32 );
        var handleMaterial = new app.THREE.MeshBasicMaterial( { color: 0x28FFCC } );
        handleMaterial.depthTest = false;
        handleMaterial.depthWrite = false;
        handleMaterial.side = app.THREE.FrontSide;
        handleMaterial.transparent = true;
        handleMaterial.opacity = 0.5;
        this.connectionHandle = new app.THREE.Mesh( handleGeometry, handleMaterial );
        this.updateConnectionHandle();  // To set the position
        app.scene.add( this.connectionHandle );
        document.addEventListener( "mousemove", this.onMouseMove.bind( this ), false );
    }

    /**
     * Updates the position of the connection handle.
     */
    updateConnectionHandle()
    {
        this.connectionHandle.position.copy( this.box.position );
    }

    /**
     * Removes the connection handle.
     */
    removeConnectionHandle()
    {
        app.scene.remove( this.connectionHandle );
        document.removeEventListener( "mousemove", this.onMouseMove );
    }

    /**
     * Event handler for mouse movement.
     *
     * @event
     */
    onMouseMove(event)
    {
        var intersect = app.controls.getMouseIntersecting( event.clientX, event.clientY, [this.connectionHandle] );
        if ( intersect.length > 0 )
        {
            if ( this.connectionHandle.material.opacity !== 1 )
            {
                this.connectionHandle.material.opacity = 1;
                requestAnimationFrame( app.render.bind(app) );
            }
        }
        else
        {
            if ( this.connectionHandle.material.opacity !== 0.5 )
            {
                this.connectionHandle.material.opacity = 0.5;
                requestAnimationFrame( app.render.bind(app) );
            }
        }
    }

    /**
     * Makes the selection box active by showing transformation controls and updating border lines colour.
     */
    setActive()
    {
        this.transformControls.attach( this.box );
        this.setBorderLinesColor(this.activeColor);
        this.updateColors();
        this.connectionHandle.visible = true;
        document.addEventListener( "mousemove", this.onMouseMove.bind( this ), false );
    }

    /**
     * Makes the selection box inactive by hiding transformation controls and updating border lines colour.
     */
    setInactive()
    {
        this.transformControls.detach();
        this.setBorderLinesColor(this.inactiveColor);
        this.connectionHandle.visible = false;
        document.removeEventListener( "mousemove", this.onMouseMove );
    }
    
    /*
    * Callback function for transformation controls that is used when we have change because of the controls.
    */
    updateAfterTransformations()
    {
        this.updateWidthHeightDeptCenter();
        this.updateLLAndUR();
        //this.updateAzimuthAndPolarAngle();
        
        if ( this.lines.length !== 0 )
        {
            this.updateLineStart();
        }
    }

    /*
     * Removes the box from the scene and resets the colours of the points.
     */
    removeBox()
    {
        app.scene.remove( this.box );
        this.setInactive();
        app.scene.remove( this.borderBox );

        var points;
        var colorID;
        var colors;
        var oldPoints = this.selectedPoints;

        for ( var layer in app.layer_points )
        {
            points = app.layer_points[ layer ].points;
            colors = points.geometry.getAttribute( "customColor" ).array;

            for ( var i = 0; i < oldPoints[ layer ].length; ++i )
            {
                var colorID = oldPoints[ layer ][ i ].index;

                colors[ colorID ] = oldPoints[ layer ][ i ].color.r;
                colors[ colorID + 1 ] = oldPoints[ layer ][ i ].color.g;
                colors[ colorID + 2 ] = oldPoints[ layer ][ i ].color.b;
            }
            points.geometry.attributes.customColor.needsUpdate = true;
        }

        app.resetVisibility();
    }

    /**
     * Updates the width, height, depth from the scale of the box, and center from the position of the box. 
     */
    updateWidthHeightDeptCenter()
    {
        this.width = this.originalWidth * this.box.scale.x;
        this.height = this.originalHeight * this.box.scale.y;
        this.depth = this.originalDepth * this.box.scale.z;
        this.center = this.box.position;
    }

    /**
     * Updates lower left and upper right of the selection box.
     */
    updateLLAndUR()
    {
        this.ll = { x: this.center.x - this.width / 2, y: this.center.y - this.height / 2, z: this.center.z - this.depth / 2 };
        this.ur = { x: this.center.x + this.width / 2, y: this.center.y + this.height / 2, z: this.center.z + this.depth / 2 };
    }

    updateAzimuthAndPolarAngle()
    {
        this.azimuthAngle = this.box.rotation.z;
        this.polarAngle = this.box.rotation.y;

        if ( this.azimuthAngle < 0 )
        {
            this.azimuthAngle += 2 * Math.PI;
        }
        
        console.log("azimuthAngle:", this.azimuthAngle * 180 / Math.PI)
        console.log("polarAngle:", this.polarAngle * 180 / Math.PI)
    }

    /**
     * Finds which points lie within the box, and colors them.
     */
    updateColors()
    {
        var points;
        var colors;
        var positions;
        var visibility;
        var oldColor;
        var oldPoints = this.selectedPoints;

        for ( var layer in app.layer_points )
        {
            var newPoints = [];
            points = app.layer_points[ layer ].points;
            colors = points.geometry.getAttribute( "customColor" ).array;
            positions = points.geometry.getAttribute( "position" ).array;
            visibility = points.geometry.getAttribute( "visible" ).array;

            if ( oldPoints[ layer ] )
            {
                for ( var i = 0; i < oldPoints[ layer ].length; ++i )
                {
                    var colorID = oldPoints[ layer ][ i ].index;

                    colors[ colorID ] = oldPoints[ layer ][ i ].color.r;
                    colors[ colorID + 1 ] = oldPoints[ layer ][ i ].color.g;
                    colors[ colorID + 2 ] = oldPoints[ layer ][ i ].color.b;
                }
            }

            for ( var i = 0; i < positions.length; i += 3 )
            {
                var p = {};
                p.x = positions[ i ];
                p.y = positions[ i + 1 ];
                p.z = positions[ i + 2 ];
                if ( this.containsPoint( p ) )
                {
                    oldColor = { r: colors[ i ], g: colors[ i + 1 ], b: colors[ i + 2 ] };
                    colors[ i ] = 1.0;
                    colors[ i + 1 ] = 0.92;
                    colors[ i + 2 ] = 0.0;
                    visibility[i / 3] = 1.0;
                    points.geometry.attributes.customColor.needsUpdate = true;
                    newPoints.push( {index: i, color: oldColor} );
                }
                else
                {
                    if ( p.x > this.box.position.x )
                        //&& p.y > this.box.position.y
                        //&& p.z > this.box.position.z )
                    {
                        visibility[i / 3] = 1.0;
                    }
                    else 
                    {
                        visibility[i / 3] = 0.0;
                    }

                }
                points.geometry.attributes.visible.needsUpdate = true;
            }
            this.selectedPoints[ layer ] = newPoints;
        }
    }

    /**
     * Checks if a position is within the selection box. Ellipsoid version.
     *
     * @param {Object} pos Position to be checked.
     * @returns {Bool} True if the position is inside, else false.
     */
    withinEllipsoidBounds( pos )
    {
        var x_side = ( this.ur.x - this.ll.x ) / 2;
        var y_side = ( this.ur.y - this.ll.y ) / 2;
        var z_side = ( this.ur.z - this.ll.z ) / 2;

        var new_x = ( ( pos.x - this.center.x ) * Math.cos( this.azimuthAngle ) +
                      ( pos.y - this.center.y ) * Math.sin( this.azimuthAngle ) ) * Math.cos( this.polarAngle ) -
                    ( pos. z - this.center.z ) * Math.sin( this.polarAngle );

        var new_y = ( ( pos.x - this.center.x ) * Math.sin( this.azimuthAngle ) -
                      ( pos.y - this.center.y ) * Math.cos( this.azimuthAngle ) );

        var new_z = ( ( pos.x - this.center.x ) * Math.cos( this.azimuthAngle ) +
                      ( pos.y - this.center.y ) * Math.sin( this.azimuthAngle ) ) * Math.sin( this.polarAngle ) +
                    ( pos. z - this.center.z ) * Math.cos( this.polarAngle );        

        return ( ( Math.pow( new_x, 2 ) ) / ( x_side * x_side ) +
                 ( Math.pow( new_y, 2 ) ) / ( y_side * y_side ) +
                 ( Math.pow( new_z, 2 ) ) / ( z_side * z_side ) <= 1 );
    }

    /**
     * Checks if a position is within the selection box. Box version.
     *
     * @param {Object} pos Position to be checked.
     * @returns {Bool} True if the position is inside, else false.
     */
    withinBoxBounds( pos )
    {
        var new_x = ( ( pos.x - this.center.x ) * Math.cos( this.azimuthAngle ) +
                      ( pos.y - this.center.y ) * Math.sin( this.azimuthAngle ) ) * Math.cos( this.polarAngle ) -
                    ( pos.z - this.center.z ) * Math.sin( this.polarAngle ) + this.center.x;
        var new_y = -( pos.x - this.center.x ) * Math.sin( this.azimuthAngle ) +
                    ( pos.y - this.center.y ) * Math.cos( this.azimuthAngle ) + this.center.y;
        var new_z = ( ( pos.x - this.center.x ) * Math.cos( this.azimuthAngle ) +
                      ( pos.y - this.center.y ) * Math.sin( this.azimuthAngle ) ) * Math.sin( this.polarAngle ) +
                    ( pos.z - this.center.z ) * Math.cos( this.polarAngle ) + this.center.z;        

        return new_x > this.ll.x && new_x < this.ur.x
            && new_y > this.ll.y && new_y < this.ur.y
            && new_z > this.ll.z && new_z < this.ur.z;
    }

    /*
     * Checks if position is inside the selection box.
     *
     * @param {Object} pos Position to check.
     * @returns {Bool} True if point is inside the box, false otherwise.
     */
    containsPoint( pos )
    {
        if ( this.selectedShape === "box" )
        {
            return this.withinBoxBounds( pos );
        }
        else if ( this.selectedShape === "ellipsoidal" )
        {
            return this.withinEllipsoidBounds( pos );
        }
    }

    /*
     * Creates a line representing a connection, that is to be connected to a
     * device.
     */
    makeLine()
    {
        var line = new ConnectionLine(this.ll, this.ur, true, this);
        line.makeLine();
        this.currentCurveObject = line.curveObject;
        this.currentCurve = line.curve;
        app.scene.add( this.currentCurveObject );

        this.lines.push(line);

        app.enableOrbitControls( false );
    }

    /*
     * Updates the start position of all lines of this selection box.
     */
    updateLineStart()
    {
        for (var i = 0; i < this.lines.length; ++i)
        {
            this.lines[i].updateLineStart(this.ll, this.ur);
        }
    }

    /*
     * Updates the end positions of lines connecting to a specific target device.
     */
    updateLineEnd( newPos, target, radius = 0 )
    {
        for (var i = 0; i < this.lines.length; ++i)
        {
            this.lines[i].updateLineEnd(newPos, target, radius);
        }
    }

    /*
     * Removes the line that was created last.
     */
    removeLine()
    {
        app.scene.remove( this.currentCurveObject );
        this.lines.pop();
    }

    /*
     * Removes all lines, or optionally a line connected to a specific target
     * device.
     */
    removeLines( target = "" )
    {
        for ( var i = 0; i < this.lines.length; ++i )
        {
            if ( target === "" )
            {
                app.scene.remove( this.lines[ i ].curveObject );
            }
            else if ( target === this.lines[ i ].target )
            {
                app.scene.remove( this.lines[ i ].curveObject );
                this.lines.splice( i, 1 );
                break;
            }
        }
        if ( target === "" )
        {
            this.lines = [];
        }
    }

    /*
     * Sets a target for the line that was created last.
     */
    setLineTarget( device )
    {
        this.lines[ this.lines.length - 1 ].target = device;
    }

    /*
     * Connects a line to a target device.
     */
    lineToDevice( targetPos, radius, target )
    {
        console.log(targetPos)
        var centreX = ( this.ll.x + this.ur.x ) / 2;
        if ( ( targetPos.x - radius ) < centreX )
        {
            this.updateLineEnd(
            {
                x: targetPos.x + radius,
                y: targetPos.y,
                z: targetPos.z
            }, target );
        }
        else
        {
            this.updateLineEnd(
            {
                x: targetPos.x - radius,
                y: targetPos.y,
                z: targetPos.z
            }, target );
        }
    }


    /**
     * Gets data of this selection box to be saved or sent to the server for
     * connecting.
     *
     * @returns {Object} Data of this selection box.
     */
    getData()
    {
        var nameArray = [];
        var noNeuronPointsDict = {}
        for ( var layerName in app.layer_points )
        {
            nameArray.push(layerName);
            noNeuronPointsDict[layerName] = app.layer_points[layerName]['noElements']
        }

        var selectionInfo = {
            name: nameArray,
            selection: { "ll": this.ll, "ur": this.ur },
            width: this.originalWidth,
            height: this.originalHeight,
            depth: this.originalDepth,
            scale: this.box.scale,
            center: this.center,
            azimuthAngle: this.azimuthAngle,
            polarAngle: this.polarAngle,
            neuronType: this.selectedNeuronType,
            synModel: this.selectedSynModel,
            maskShape: this.selectedShape,
            noOfNeuronTypesInLayer: noNeuronPointsDict,
            uniqueID: this.uniqueID
        };
        return selectionInfo;
    }

    /**
     * Removes the box and corresponding lines. 
     */
    deleteBox()
    {
        this.removeBox();
        this.removeLines();
    }
}


// Try exporting SelectionBox for testing
try
{
    module.exports = SelectionBox;
}
catch(err)
{
}
