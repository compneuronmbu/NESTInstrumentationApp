/**
 * Represents a selection of neurons in 2D space.
 *
 * @param {Object} ll Lower left coordinates.
 * @param {Object} ur Upper right coordinates.
 * @param {String} shape Shape of the selection.
 */
class SelectionBox
{
    constructor( ll, ur, shape )
    {
        this.uniqueID = -1;
        this.layerName = "";
        // ll and ur use screen coordinates
        this.ll = ll;
        this.ur = ur;

        this.majorAxis = Math.max( ( ur.x - ll.x ) / 2, ( ur.y - ll.y ) / 2 );
        this.minorAxis = Math.min( ( ur.x - ll.x ) / 2, ( ur.y - ll.y ) / 2 );
        this.angle = ( this.majorAxis == ( ur.x - ll.x )  / 2 ) ? 0.0: Math.PI / 2;

        this.selectedNeuronType;
        this.selectedSynModel;
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
        this.curves = [];

        this.selectedPointIDs = [];
        this.nSelected = 0;

        this.selectPoints();
        this.CURVE_SEGMENTS = 100;
    }

    /**
     * Finds which points lie within the box, and colors them.
     */
    selectPoints()
    {
        var xypos;
        var count = 0;

        this.getLayerName();
        if ( this.layerName === "" )
        {
            return;
        }

        var points = app.layer_points[ this.layerName ].points;
        var colors = points.geometry.getAttribute( "customColor" ).array;
        var positions = points.geometry.getAttribute( "position" ).array;

        for ( var i = 0; i < positions.length; i += 3 )
        {
            var p = {};
            p.x = positions[ i ];
            p.y = positions[ i + 1 ];
            p.z = positions[ i + 2 ];
            xypos = app.toScreenXY( p );

            if ( this.withinBounds( xypos ) )
            {
                this.selectedPointIDs.push( i );
                colors[ i ] = 1.0;
                colors[ i + 1 ] = 0.92;
                colors[ i + 2 ] = 0.0;

                points.geometry.attributes.customColor.needsUpdate = true;
                count += 1;
            }
        }
        if ( !count )
        {
            this.layerName = "";
        }
        else
        {
            this.nSelected += count;
            app.$( "#infoselected" ).html( this.nSelected.toString() + " selected" );
        }
    }

    /**
     * Finds the name of the layer in which the selection box is located.
     */
    getLayerName()
    {
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

        console.log(objectBoundsLL)
        console.log(objectBoundsUR)
        console.log(boxPosition)

        this.box.position.copy( boxPosition );
        app.scene.add( this.box );
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

    /**
     * Creates a line representing a connection, that is to be connected to a
     * device.
     */
    makeLine()
    {
        var selectionBounds = this.getSelectionBounds();

        this.currentCurve = new app.THREE.CatmullRomCurve3( [
            new app.THREE.Vector3( selectionBounds.ur.x, ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2.0, 0.0 ),
            new app.THREE.Vector3( selectionBounds.ur.x, ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2.0, 0.0 ),
            new app.THREE.Vector3( selectionBounds.ur.x, ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2.0, 0.0 ),
            new app.THREE.Vector3( selectionBounds.ur.x, ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2.0, 0.0 )
        ] );
        this.currentCurve.type = 'chordal';
        var curveGeometry = new app.THREE.Geometry();
        curveGeometry.vertices = this.currentCurve.getPoints( this.CURVE_SEGMENTS );
        var curveMaterial = new app.THREE.LineBasicMaterial(
        {
            color: 0xffca28,
            linewidth: 3
        } );
        this.currentCurveObject = new app.THREE.Line( curveGeometry, curveMaterial );
        app.scene.add( this.currentCurveObject );

        this.curves.push(
        {
            curveObject: this.currentCurveObject,
            curve: this.currentCurve,
            target: ""
        } );
    }

    /**
     * Sets a target for the line that was created last.
     */
    setLineTarget( device )
    {
        this.curves[ this.curves.length - 1 ].target = device;
    }

    /**
     * Updates the endpoint of a line.
     */
    updateLine( newEndPos, curveIndex, radius )
    {
        var curveObject = this.curves[ curveIndex ].curveObject;
        var curve = this.curves[ curveIndex ].curve;

        var selectionBounds = this.getSelectionBounds();
        var centreX = ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2;
        var direction = 1;
        var endLength = 0.015;

        var endPos = ( newEndPos === undefined ) ? curve.points[ 3 ] : newEndPos;
        if ( endPos.x < centreX )
        {
            curve.points[ 0 ].x = ( selectionBounds.ll.x < selectionBounds.ur.x ) ? selectionBounds.ll.x : selectionBounds.ur.x;
        }
        else
        {
            curve.points[ 0 ].x = ( selectionBounds.ll.x < selectionBounds.ur.x ) ? selectionBounds.ur.x : selectionBounds.ll.x;
            direction = -1;
        }

        curve.points[ 0 ].y = ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2;
        curve.points[ 1 ].x = curve.points[ 0 ].x + direction * -endLength;
        curve.points[ 1 ].y = curve.points[ 0 ].y;

        if ( newEndPos !== undefined )
        {
            curve.points[ 3 ].x = newEndPos.x + direction * radius;
            curve.points[ 3 ].y = newEndPos.y;
            curve.points[ 2 ].x = curve.points[ 3 ].x + direction * endLength;
            curve.points[ 2 ].y = curve.points[ 3 ].y;
        }
        for ( var i = 0; i <= this.CURVE_SEGMENTS; ++i )
        {
            curveObject.geometry.vertices[ i ].copy( curve.getPoint( i / ( this.CURVE_SEGMENTS ) ) );
        }
        curveObject.geometry.verticesNeedUpdate = true;
    }

    /**
     * Updates the start position of all lines of this selection box.
     */
    updateLineStart()
    {
        for ( var i in this.curves )
        {
            this.updateLine( undefined, i, 0 );
        }
    }

    /**
     * Updates the end positions of lines connecting to a specific target device.
     */
    updateLineEnd( newPos, target, radius = 0 )
    {
        for ( var i in this.curves )
        {
            if ( this.curves[ i ].target === target )
            {
                this.updateLine( newPos, i, radius );
            }
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
        this.curves.pop();
    }

    /**
     * Removes all lines, or optionally a line connected to a specific target
     * device.
     */
    removeLines( target = "" )
    {
        for ( var i = 0; i < this.curves.length; ++i )
        {
            if ( target === "" )
            {
                app.scene.remove( this.curves[ i ].curveObject );
            }
            else if ( target === this.curves[ i ].target )
            {
                app.scene.remove( this.curves[ i ].curveObject );
                this.curves.splice( i, 1 );
                break;
            }
        }
        if ( target === "" )
        {
            this.curves = [];
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
     * Returns data of this selection box to be sent to the server for
     * connecting. Coordinates here has to be converted to room coordinates.
     */
    getSelectionInfo()
    {
        var selectedBBoxXYZ = {
            "ll": app.toObjectCoordinates( this.ll ),
            "ur": app.toObjectCoordinates( this.ur )
        };
        var selectionBox = {
            "ll":
            {
                x: ( selectedBBoxXYZ.ll.x - app.layer_points[ this.layerName ].offsets.x ) * app.layer_points[ this.layerName ].extent[0] + app.layer_points[ this.layerName ].center[0] ,
                y: ( -( selectedBBoxXYZ.ll.y + app.layer_points[ this.layerName ].offsets.y ) ) * app.layer_points[ this.layerName ].extent[1] + app.layer_points[ this.layerName ].center[1],
                z: 0
            },
            "ur":
            {
                x: ( selectedBBoxXYZ.ur.x - app.layer_points[ this.layerName ].offsets.x ) * app.layer_points[ this.layerName ].extent[0] + app.layer_points[ this.layerName ].center[0],
                y: ( -( selectedBBoxXYZ.ur.y + app.layer_points[ this.layerName ].offsets.y ) ) * app.layer_points[ this.layerName ].extent[1] + app.layer_points[ this.layerName ].center[1],
                z: 0
            }
        };

        console.log("SelectionBox", selectionBox)

        var selectedNeuronType = app.getSelectedDropDown( "neuronType" );
        var selectedSynModel = app.getSelectedDropDown( "synapseModel" );
        var selectedShape = this.selectedShape;

        var noNeurons = { [this.layerName]: app.layer_points[this.layerName]['noElements'] };

        var selectionInfo = {
            name: [this.layerName],
            selection: selectionBox,
            angle: this.angle,
            neuronType: selectedNeuronType,
            synModel: selectedSynModel,
            maskShape: selectedShape,
            noOfNeuronTypesInLayer: noNeurons
        };
        console.log(selectionInfo)
        return selectionInfo;
    }

    /**
     * Gets data of this selection box to be saved.
     *
     * @returns {Object} Information to be saved.
     */
    getInfoForSaving()
    {
        var selectionInfo = {
            name: this.layerName,
            ll: this.ll,
            ur: this.ur,
            angle: this.angle,
            neuronType: this.selectedNeuronType,
            synModel: this.selectedSynModel,
            maskShape: this.selectedShape,
            uniqueID: this.uniqueID
        };

        return selectionInfo;
    }

    /**
     * Create points that can be used to resize the box.
     */
    makeSelectionPoints()
    {
        var selectionBounds = this.getSelectionBounds();


        // TODO: This is wrong when we resize and switch between major and minor axis.
        if ( this.majorAxis == ( this.ur.x - this.ll.x ) / 2 )
        {
            var angle = this.angle;
        }
        else
        {
            // This messes things up, but if we don't have it, it will be wrong when we major axis along y-axis.
            var angle = this.angle + Math.PI / 2;
        }
        // We have to move the points a tiny bit towards the camera to make it 
        // appear over everything else.
        // We need to apply a rotation matrix in case we have a tilted ellipse.
        // TODO: this inelegant solution must be changed when rectangular masks can be rotated.
        if ( this.selectedShape == "elliptical" )
        {
            var center = this.box.position;
            var posArray = [
            {
                x: ( selectionBounds.ll.x  - center.x ) * Math.cos( angle ) - ( selectionBounds.ll.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( selectionBounds.ll.x  - center.x ) * Math.sin( angle ) + ( selectionBounds.ll.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2  - center.x ) * Math.cos( angle ) - ( selectionBounds.ll.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2  - center.x ) * Math.sin( angle ) + ( selectionBounds.ll.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ur.x  - center.x ) * Math.cos( angle ) - ( selectionBounds.ll.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( selectionBounds.ur.x  - center.x ) * Math.sin( angle ) + ( selectionBounds.ll.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ur.x  - center.x ) * Math.cos( angle ) - ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.sin( angle ) + center.x,
                y: ( selectionBounds.ur.x  - center.x ) * Math.sin( angle ) + ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ur.x  - center.x ) * Math.cos( angle ) - ( selectionBounds.ur.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( selectionBounds.ur.x  - center.x ) * Math.sin( angle ) + ( selectionBounds.ur.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2  - center.x ) * Math.cos( angle ) - ( selectionBounds.ur.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2  - center.x ) * Math.sin( angle ) + ( selectionBounds.ur.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ll.x  - center.x ) * Math.cos( angle ) - ( selectionBounds.ur.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( selectionBounds.ll.x  - center.x ) * Math.sin( angle ) + ( selectionBounds.ur.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ll.x  - center.x ) * Math.cos( angle ) - ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.sin( angle ) + center.x,
                y: ( selectionBounds.ll.x  - center.x ) * Math.sin( angle ) + ( ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2 - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            } ];
        }
        else
        {
            var posArray = [
            {
                x: selectionBounds.ll.x,
                y: selectionBounds.ll.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2,
                y: selectionBounds.ll.y,
                z: 0.0001
            },
            {
                x: selectionBounds.ur.x,
                y: selectionBounds.ll.y,
                z: 0.0001
            },
            {
                x: selectionBounds.ur.x,
                y: ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2,
                z: 0.0001
            },
            {
                x: selectionBounds.ur.x,
                y: selectionBounds.ur.y,
                z: 0.0001
            },
            {
                x: ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2,
                y: selectionBounds.ur.y,
                z: 0.0001
            },
            {
                x: selectionBounds.ll.x,
                y: selectionBounds.ur.y,
                z: 0.0001
            },
            {
                x: selectionBounds.ll.x,
                y: ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2,
                z: 0.0001
            } ];
        }

        // TODO: Have to rotate nameArray as well...
        var nameArray = [
            'lowerLeft',
            'lowerMiddle',
            'lowerRight',
            'middleRight',
            'upperRight',
            'upperMiddle',
            'upperLeft',
            'middleLeft'
        ];

        for ( var i = 0; i < posArray.length; ++i )
        {
            this.resizePoints.push( this.makePoint( posArray[ i ], nameArray[ i ] , 0xcccccc ) );
        }
/*
        // TODO: I don't know what is prettiest.
        // Rotate points in case we have a tilted ellipse.
        var center = this.box.position;

        if ( this.majorAxis == ( this.ur.x - this.ll.x ) / 2 )
        {
            var angle = this.angle;
        }
        else
        {
            var angle = this.angle + Math.PI / 2;
        }

        for ( var i = 0; i < this.resizePoints.length; ++i )
        {
            var pos = this.resizePoints[i].position;
            var rotatedPosition = {
                x: ( pos.x - center.x ) * Math.cos( angle ) - ( pos.y - center.y ) * Math.sin( angle ) + center.x,
                y: ( pos.x - center.x ) * Math.sin( angle ) + ( pos.y - center.y ) * Math.cos( angle ) + center.y,
                z: 0.0001
            }
            this.resizePoints[i].position.copy( rotatedPosition );
        }*/
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
        this.majorAxis = Math.max( ( this.ur.x - this.ll.x ) / 2, ( this.ur.y - this.ll.y ) / 2 );
        this.minorAxis = Math.min( ( this.ur.x - this.ll.x ) / 2, ( this.ur.y - this.ll.y ) / 2 );
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
        //var x_side = ( this.ur.x - this.ll.x ) / 2;
        //var y_side = ( this.ur.y - this.ll.y ) / 2;
        var center = {
            x: ( this.ur.x + this.ll.x ) / 2.0,
            y: ( this.ur.y + this.ll.y ) / 2.0
        };

        // TODO: I think using major and minor axis might have been a bad idea on my side.
        //return ( ( Math.pow( pos.x - center.x, 2 ) ) / ( x_side * x_side ) + ( Math.pow( pos.y - center.y, 2 ) ) / ( y_side * y_side ) <= 1 );
        return ( ( Math.pow( ( pos.x - center.x ) * Math.cos( this.angle ) + ( pos.y - center.y ) * Math.sin( this.angle ), 2 ) ) / ( this.majorAxis * this.majorAxis ) + ( Math.pow( ( pos.x - center.x ) * Math.sin( this.angle ) - ( pos.y - center.y ) * Math.cos( this.angle ), 2 ) ) / ( this.minorAxis * this.minorAxis ) <= 1 );
    }

    deleteBox()
    {
        this.removePoints();
        this.removeBox();
        this.removeLines();
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
    constructor( width, height, depth, center, shape )
    {
        // this.uniqueID = -1;
        // this.layerName = "";

        this.originalWidth = width;
        this.originalHeight = height;
        this.originalDepth = depth;

        this.width = this.originalWidth;
        this.height = this.originalHeight;
        this.depth = this.originalDepth;
        this.center = center;

        // ll and ur use object coordinates in 3D
        // TODO: Should we have same in 2D and 3D? Different because they are defined completely different.
        this.ll = { x: center.x - width / 2, y: center.y - height / 2, z: center.z - depth / 2 };
        this.ur = { x: center.x + width / 2, y: center.y + height / 2, z: center.z + depth / 2 };

        // this.majorAxis = Math.max( ( ur.x - ll.x ) / 2, ( ur.y - ll.y ) / 2 );
        // this.minorAxis = Math.min( ( ur.x - ll.x ) / 2, ( ur.y - ll.y ) / 2 );
        // this.angle = ( this.majorAxis == ( ur.x - ll.x )  / 2 ) ? 0.0: Math.PI / 2;

        this.selectedNeuronType;
        this.selectedSynModel;
        this.selectedShape = shape;

        this.box;
        this.borderBox;
        this.activeColor = new app.THREE.Color();
        this.activeColor.setRGB( 1.0, 1.0, 0.0 );
        this.inactiveColor = new app.THREE.Color();
        this.inactiveColor.setRGB( 0.7, 0.7, 0.7 );
        
        //this.resizePoints = undefined;
        //this.rotationPoints = undefined;

        // SelectedFirstTime is used to turn the elliptical masks. If we press on an
        // elliptical mask two times, we should get point that let us turn the mask the
        // second time.
        // this.selectedFirstTime = false;

        this.currentCurve;
        this.currentCurveObject;
        this.curves = [];

        this.selectedPoints = {};
        // this.nSelected = 0;

        this.makeBox();
        this.CURVE_SEGMENTS = 100;
    }

    /**
     * Creates a box, adds it to the scene, and sets it active in {@link Controls}.
     */
    makeBox()
    {
        var geometry = new app.THREE.BoxBufferGeometry(this.width, this.height, this.depth);
        var material = new app.THREE.MeshBasicMaterial();
        material.transparent = true;
        material.opacity = 0.3;
        this.box = new app.THREE.Mesh( geometry, material );
        this.box.position.copy( this.center );
        app.scene.add( this.box );
        this.makeBorderLines();
        this.makeTransformControls();
        this.updateColors();
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
        this.setBorderLinesColor(this.activeColor);
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
        this.transformControls = new app.THREE.TransformControls( app.camera, app.renderer.domElement );
        app.scene.add( this.transformControls );
        this.transformControls.attach( this.box );

        this.transformControls.addEventListener( 'change', this.updateAfterTransformations.bind( this ) )
    }

    /**
     * Makes the selection box active by showing transformation controls and updating border lines colour.
     */
    setActive()
    {
        this.transformControls.attach( this.box );
        this.setBorderLinesColor(this.activeColor);
        this.updateColors();
    }

    /**
     * Makes the selection box inactive by hiding transformation controls and updating border lines colour.
     */
    setInactive()
    {
        this.transformControls.detach();
        this.setBorderLinesColor(this.inactiveColor);
    }
    
    /*
    * Callback function for transformation controls that is used when we have change because of the controls.
    */
    updateAfterTransformations()
    {
        console.log("Vi tranformerer!")
        this.updateWidthHeightDeptCenter();
        this.updateLLAndUR();
        
        if ( this.curves !== undefined )
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
            else { console.log("No old points in ", layer) }

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

    /*
     * Checks if position is inside the box.
     *
     * @param {Object} pos Position to check.
     *
     * @returns {Bool} True if point is inside the box, false otherwise.
     */
    containsPoint( pos )
    {
        return pos.x > this.ll.x && pos.x < this.ur.x
            && pos.y > this.ll.y && pos.y < this.ur.y
            && pos.z > this.ll.z && pos.z < this.ur.z;
    }

    /*
     * Creates a line representing a connection, that is to be connected to a
     * device.
     */
    makeLine()
    {
        console.log("makeLine")
        this.currentCurve = new app.THREE.CatmullRomCurve3( [
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, ( this.ll.z + this.ur.z ) / 2.0 ),
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, ( this.ll.z + this.ur.z ) / 2.0 ),
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, ( this.ll.z + this.ur.z ) / 2.0 ),
            new app.THREE.Vector3( this.ur.x, ( this.ll.y + this.ur.y ) / 2.0, ( this.ll.z + this.ur.z ) / 2.0 )
        ] );
        this.currentCurve.type = 'chordal';
        var curveGeometry = new app.THREE.Geometry();
        curveGeometry.vertices = this.currentCurve.getPoints( this.CURVE_SEGMENTS );
        var curveMaterial = new app.THREE.LineBasicMaterial(
        {
            color: 0xffca28,
            linewidth: 3
        } );
        this.currentCurveObject = new app.THREE.Line( curveGeometry, curveMaterial );
        app.scene.add( this.currentCurveObject );

        this.curves.push(
        {
            curveObject: this.currentCurveObject,
            curve: this.currentCurve,
            target: ""
        } );

        app.disableEnableOrbitControls( false );
    }

    /*
     * Updates the endpoint of a line.
     */
    updateLine( newEndPos, curveIndex, radius )
    {
        var curveObject = this.curves[ curveIndex ].curveObject;
        var curve = this.curves[ curveIndex ].curve;

        var centreX = ( this.ll.x + this.ur.x ) / 2;
        var direction = 1;
        var endLength = 0.015;

        var endPos = ( newEndPos === undefined ) ? curve.points[ 3 ] : newEndPos;
        if ( endPos.x < centreX )
        {
            curve.points[ 0 ].x = ( this.ll.x < this.ur.x ) ? this.ll.x : this.ur.x;
        }
        else
        {
            curve.points[ 0 ].x = ( this.ll.x < this.ur.x ) ? this.ur.x : this.ll.x;
            direction = -1;
        }

        curve.points[ 0 ].y = ( this.ll.y + this.ur.y ) / 2;
        curve.points[ 0 ].z = ( this.ll.z + this.ur.z ) / 2;
        curve.points[ 1 ].x = curve.points[ 0 ].x + direction * -endLength;
        curve.points[ 1 ].y = curve.points[ 0 ].y;
        curve.points[ 1 ].z = curve.points[ 0 ].z;

        if ( newEndPos !== undefined )
        {
            curve.points[ 3 ].x = newEndPos.x + direction * radius;
            curve.points[ 3 ].y = newEndPos.y;
            curve.points[ 3 ].z = newEndPos.z;
            curve.points[ 2 ].x = curve.points[ 3 ].x + direction * endLength;
            curve.points[ 2 ].y = curve.points[ 3 ].y;
            curve.points[ 2 ].z = curve.points[ 3 ].z;
        }
        for ( var i = 0; i <= this.CURVE_SEGMENTS; ++i )
        {
            curveObject.geometry.vertices[ i ].copy( curve.getPoint( i / ( this.CURVE_SEGMENTS ) ) );
        }
        curveObject.geometry.verticesNeedUpdate = true;
    }

    /*
     * Updates the start position of all lines of this selection box.
     */
    updateLineStart()
    {
        for ( var i in this.curves )
        {
            this.updateLine( undefined, i, 0 );
        }
    }

    /*
     * Updates the end positions of lines connecting to a specific target device.
     */
    updateLineEnd( newPos, target, radius = 0 )
    {
        for ( var i in this.curves )
        {
            if ( this.curves[ i ].target === target )
            {
                this.updateLine( newPos, i, radius );
            }
        }
    }

    /*
     * Removes the line that was created last.
     */
    removeLine()
    {
        app.scene.remove( this.currentCurveObject );
        this.curves.pop();
    }

    /*
     * Removes all lines, or optionally a line connected to a specific target
     * device.
     */
    removeLines( target = "" )
    {
        for ( var i = 0; i < this.curves.length; ++i )
        {
            if ( target === "" )
            {
                app.scene.remove( this.curves[ i ].curveObject );
            }
            else if ( target === this.curves[ i ].target )
            {
                app.scene.remove( this.curves[ i ].curveObject );
                this.curves.splice( i, 1 );
                break;
            }
        }
        if ( target === "" )
        {
            this.curves = [];
        }
    }

    /*
     * Sets a target for the line that was created last.
     */
    setLineTarget( device )
    {
        this.curves[ this.curves.length - 1 ].target = device;
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
     * Gets data of this selection box to be sent to the server for
     * connecting.
     *
     * @returns {Object} Information to be sent to the server.
     */
    getSelectionInfo()
    {
        var selectedNeuronType = app.getSelectedDropDown( "neuronType" );
        var selectedSynModel = app.getSelectedDropDown( "synapseModel" );
        var selectedShape = this.selectedShape;

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
            //angle: this.angle,
            angle: 0.0,
            neuronType: selectedNeuronType,
            synModel: selectedSynModel,
            maskShape: selectedShape,
            noOfNeuronTypesInLayer: noNeuronPointsDict
        };

        console.log(selectionInfo)
        return selectionInfo;
    }

    /*
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
