/*
 * Controls
 *
 */
class Controls
{
    constructor( drag_objects, domElement )
    {
        this.drag_objects = drag_objects;
        this.domElement = domElement;

        this.marquee = app.$( "#select-square" );

        this.mouseDown = false;
        this.mouseDownFirstTime = false;
        this.shiftDown = false;
        this.make_selection_box = false;
        this.make_connection = false;

        this.plane;
        this.raycaster;
        this.intersection = new app.THREE.Vector3();

        this.boxInFocus;
        this.resizeSideInFocus;
        this.deviceInFocus;
        this.rotationPoint;

        this.curveObject;
        this.curve;

        this.outlineMesh;

        // Callbacks have to be bound to this
        this.domElement.addEventListener( 'mousemove', this.onMouseMove.bind( this ), false );
        this.domElement.addEventListener( 'mousedown', this.onMouseDown.bind( this ), false );
        this.domElement.addEventListener( 'mouseup', this.onMouseUp.bind( this ), false );

        window.addEventListener( 'keyup', this.onKeyUp.bind( this ), false );
        window.addEventListener( 'resize', this.onWindowResize.bind( this ), false );
    }

    /*
     * Resets all the controls.
     */
    resetButtons()
    {
        this.mouseDown = false;
        this.shiftDown = false;
        this.make_selection_box = false;
        this.make_connection = false;
        this.marquee.fadeOut();
        this.marquee.css(
        {
            width: 0,
            height: 0,
            borderRadius: 0
        } );
        app.mouseDownCoords = {
            x: 0,
            y: 0
        };
        app.mRelPos = {
            x: 0,
            y: 0
        };
        app.layerSelected = "";
    }

    /*
     * Creates an outline of a device icon, to show that it is selected.
     */
    makeOutline( focusObject )
    {
        this.removeOutline();
        this.outlineMesh = new app.THREE.Mesh( focusObject.geometry, app.outlineMaterial );
        this.outlineMesh.material.depthWrite = false;
        //this.outlineMesh.quaternion = focusObject.quaternion;
        this.outlineMesh.position.copy( focusObject.position );
        var scale = new app.THREE.Vector3( 1.08, 1.08, 1.08 );
        this.outlineMesh.scale.copy( scale );
        app.outlineScene.add( this.outlineMesh );
    }

    /*
     * Removes a device outline.
     */
    removeOutline()
    {
        app.outlineScene.remove( this.outlineMesh );
    }

    /*
     * Sends the specifications and selection to the server which prints the
     * GIDs.
     * For debugging purposes.
     */
    serverPrintGids()
    {
        // ############ Send points to server for GID feedback ############
        // Send network specs to the server which makes the network
        app.$.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/selector",
            data: JSON.stringify(
            {
                network: app.modelParameters,
                info: this.boxInFocus.getSelectionInfo()
            } ),
            success: function( data )
            {
                console.log( data.title );
                console.log( data.article );
            },
            dataType: "json"
        } );
    }

    /*
     * Finds objects intersecting with the mouse, given a list of objects.
     */
    getMouseIntersecting( mouseX, mouseY, objects )
    {
        this.raycaster = new app.THREE.Raycaster();
        var rect = this.domElement.getBoundingClientRect();
        var mouse = new app.THREE.Vector2();
        mouse.x = ( ( mouseX - rect.left ) / rect.width ) * 2 - 1;
        mouse.y = -( ( mouseY - rect.top ) / rect.height ) * 2 + 1;

        this.raycaster.setFromCamera( mouse, app.camera );
        
        return this.raycaster.intersectObjects( objects );
    }

    /*
     * Checks if the mouse clicks on a resize or rotation point. If so, sets the point to be
     * selected. If not, removes the points.
     */
    selectResizeOrRotationPoints()
    {
        var pointIntersects = this.getMouseIntersecting( app.mouseDownCoords.x,
            app.mouseDownCoords.y,
            this.boxInFocus.resizePoints );

        var rotatePointIntersects = this.getMouseIntersecting( app.mouseDownCoords.x,
            app.mouseDownCoords.y,
            this.boxInFocus.rotationPoints );

        if ( pointIntersects.length > 0 )
        {
            this.resizeSideInFocus = pointIntersects[ 0 ].object.name;
            console.log( "intersects", this.resizeSideInFocus );
            return;
        }
        else if( rotatePointIntersects.length > 0 )
        {
            console.log("rotationPoint!");
            this.rotationPoint = rotatePointIntersects[ 0 ].object;
            console.log(rotatePointIntersects[0])
            console.log(this.rotationPoints)
            return;
        }
        else
        {
            this.boxInFocus.removePoints();
            this.boxInFocus = undefined;
        }
    }

    /*
     * Checks if the mouse clicks on a device. If so, sets the device as
     * selected, and creates an outline around the device icon.
     */
    selectDevice()
    {
        this.shiftDown = true;

        this.plane = new app.THREE.Plane();

        var intersects = this.getMouseIntersecting( app.mouseDownCoords.x,
            app.mouseDownCoords.y,
            this.drag_objects )

        if ( intersects.length > 0 )
        {
            this.deviceInFocus = intersects[ 0 ].object;
            this.domElement.style.cursor = 'move';

            this.makeOutline( this.deviceInFocus );
        }
    }

    /*
     * Checks if the mouse clicks on a selection box. If so, sets the selection
     * box as selected. If not, indicates that we should create a selection box.
     */
    selectBox()
    {
        var mouseDownCorrected = {
            x: app.mouseDownCoords.x,
            y: app.renderer.getSize().height - app.mouseDownCoords.y
        };

        for ( var i in app.selectionBoxArray )
        {
            console.log(app.selectionBoxArray[ i ]);
            if ( app.selectionBoxArray[ i ].withinBounds( mouseDownCorrected, app.selectionBoxArray[ i ] ) )
            {
                this.boxInFocus = app.selectionBoxArray[ i ];

                if ( this.boxInFocus.curveObject === undefined )
                {
                    // Make conectee line
                    this.make_connection = true;
                    this.boxInFocus.makeLine();
                }

                // SelectedFirstTime is used to turn the elliptical masks.
                if( this.boxInFocus.selectedFirstTime )
                {
                    console.log( "Selected for second time!" );
                    // We have chosen the selectionBox two times, and must make roation points.
                    this.boxInFocus.makeRotationPoints();
                    // If we have already pressed the selectionBox once, we have to reset the tracker.
                    this.boxInFocus.selectedFirstTime = false;
                }
                else
                {
                    // Make resize points
                    this.boxInFocus.makeSelectionPoints();
                    this.boxInFocus.selectedFirstTime = true;
                }

                return;
            }
            // We have to reset selectedFirstTime for all the other selectionBoxes
            // because if we choose a new box, we don't want selectedFirst Time to be true
            // the first time we go back to the original selectionBox
            app.selectionBoxArray[ i ].selectedFirstTime = false;
        }

        this.make_selection_box = true;
    }

    /*
     * Given the mouse position, updates the marquee dimensions.
     */
    updateMarquee( mouseX, mouseY )
    {
        app.mRelPos.x = mouseX - app.mouseDownCoords.x;
        app.mRelPos.y = mouseY - app.mouseDownCoords.y;
        this.marquee.fadeIn();
        var selectedShape = app.getSelectedShape();

        if ( selectedShape == "elliptical" )
        {
            this.marquee.css(
            {
                borderRadius: 50 + '%'
            } );
        }
        this.marquee.css(
        {
            left: Math.min( mouseX, app.mouseDownCoords.x ) + 'px',
            width: Math.abs( app.mRelPos.x ) + 'px',
            top: Math.min( mouseY, app.mouseDownCoords.y ) + 'px',
            height: Math.abs( app.mRelPos.y ) + 'px'
        } );
    }

    /*
     * Given the mouse position, resizes the selected box according to which
     * resize point has been clicked.
     */
    resizeBox( mouseX, mouseY )
    {
        switch ( this.resizeSideInFocus )
        {
            case "lowerLeft":
                this.boxInFocus.ll.x = mouseX;
                this.boxInFocus.ll.y = app.renderer.getSize().height - mouseY;
                break;
            case "lowerMiddle":
                this.boxInFocus.ll.y = app.renderer.getSize().height - mouseY;
                break;
            case "lowerRight":
                this.boxInFocus.ur.x = mouseX;
                this.boxInFocus.ll.y = app.renderer.getSize().height - mouseY;
                break;
            case "middleRight":
                this.boxInFocus.ur.x = mouseX;
                break;
            case "upperRight":
                this.boxInFocus.ur.x = mouseX;
                this.boxInFocus.ur.y = app.renderer.getSize().height - mouseY;
                break;
            case "upperMiddle":
                this.boxInFocus.ur.y = app.renderer.getSize().height - mouseY;
                break;
            case "upperLeft":
                this.boxInFocus.ll.x = mouseX;
                this.boxInFocus.ur.y = app.renderer.getSize().height - mouseY;
                break;
            case "middleLeft":
                this.boxInFocus.ll.x = mouseX;
        }
        this.boxInFocus.updateBox();
        this.boxInFocus.removePoints();
        this.boxInFocus.makeSelectionPoints();
        this.boxInFocus.updateColors();
        this.boxInFocus.updateLineStart();
    }

    /*
    * Finds the angle of rotation above the x-axis, and updates the ellipse to be tilted with the angle.
    */
    rotateBox( mouseX, mouseY )
    {
        var cntr = app.toScreenXY(this.boxInFocus.box.position);

        // Could also use law of cosine with mouseDownCoords?
        // Think we need to use sine if major axis is on y-axis?

        // The length between the center of the ellipse and the mouse position.
        var hyp = Math.sqrt( Math.pow( app.renderer.getSize().height - cntr.y - mouseY, 2 ) + Math.pow( mouseX - cntr.x, 2 ) );

        if(  app.renderer.getSize().height - cntr.y - mouseY >= 0 )
        {
            // If the mouse position is at the upper half of the ellipse.
            var angle = Math.acos( ( mouseX - cntr.x ) / hyp );
        }
        else
        {
            // If the mouse position is at the bottom half of the ellipse.
            var angle = - Math.acos( ( mouseX - cntr.x ) / hyp ) ;
        }

        this.boxInFocus.angle = angle;
        this.boxInFocus.updateBox();
        this.boxInFocus.updateColors();
    }

    /*
     * Given the mouse position, updates the connection line.
     */
    updateLine( mouseX, mouseY )
    {
        var relScreenPos = app.toObjectCoordinates(
        {
            x: mouseX,
            y: mouseY
        } );
        this.boxInFocus.updateLineEnd(
        {
            x: relScreenPos.x,
            y: relScreenPos.y
        }, "" )
    }

    /*
     * Given the mouse position, updates the position of the device selected,
     * and its connected lines.
     */
    updateDevicePosition( mouseX, mouseY )
    {
        this.raycaster = new app.THREE.Raycaster();
        if ( this.raycaster.ray.intersectPlane( this.plane, this.intersection ) )
        {
            var relScreenPos = app.toObjectCoordinates(
            {
                x: mouseX,
                y: mouseY
            } );
            this.deviceInFocus.position.copy( relScreenPos );
            this.makeOutline( this.deviceInFocus );
            var deviceName = this.deviceInFocus.name
            var radius = this.deviceInFocus.geometry.boundingSphere.radius;
            for ( var i in app.deviceBoxMap[ deviceName ].connectees )
            {
                app.deviceBoxMap[ deviceName ].connectees[ i ].updateLineEnd(
                {
                    x: this.deviceInFocus.position.x,
                    y: this.deviceInFocus.position.y
                }, deviceName, radius );
            }
        }
    }

    /*
     * Makes a selection box from coordinates from clicking and dragging the
     * mouse.
     */
    makeSelectionBox()
    {
        var mouseDownCorrected = {
            x: app.mouseDownCoords.x,
            y: app.renderer.getSize().height - app.mouseDownCoords.y
        };

        var mouseUpCoords = {
            x: app.mRelPos.x + mouseDownCorrected.x,
            y: -app.mRelPos.y + mouseDownCorrected.y
        };

        var bounds = app.findBounds( mouseUpCoords, mouseDownCorrected );

        this.boxInFocus = new app.SelectionBox( bounds.ll, bounds.ur, app.getSelectedShape() );
        this.boxInFocus.uniqueID = app.uniqueID++;
        app.layerSelected = this.boxInFocus.layerName;

        // If we didn't click on a layer, it will cause problems further down
        if ( app.layerSelected === "" )
        {
            this.resetButtons();
            return;
        }

        app.selectionBoxArray.push( this.boxInFocus );

        this.boxInFocus.makeBox();
        this.boxInFocus.makeSelectionPoints();

        this.boxInFocus.selectedNeuronType = app.getSelectedDropDown( "neuronType" );
        this.boxInFocus.selectedSynModel = app.getSelectedDropDown( "synapseModel" );

        this.serverPrintGids();

        this.boxInFocus.selectedFirstTime = true;
    }

    /*
     * Checks if the selection box is flipped, and updates accordingly.
     */
    checkFlipBox()
    {
        this.resizeSideInFocus = undefined;
        // We need to exchange coordinates if the selection is being flipped
        if ( this.boxInFocus.ll.x > this.boxInFocus.ur.x )
        {
            var tmpX = this.boxInFocus.ur.x;
            this.boxInFocus.ur.x = this.boxInFocus.ll.x;
            this.boxInFocus.ll.x = tmpX;
        }
        if ( this.boxInFocus.ll.y > this.boxInFocus.ur.y )
        {
            var tmpY = this.boxInFocus.ur.y;
            this.boxInFocus.ur.y = this.boxInFocus.ll.y;
            this.boxInFocus.ll.y = tmpY;
        }
        this.boxInFocus.updateColors();
        this.serverPrintGids();
    }

    /*
     * Checks if the mouse is over a device, if so creates a connection between
     * the device and the selected selection box.
     */
    makeConnection( mouseX, mouseY )
    {
        console.log( "make connection" );

        var intersects = this.getMouseIntersecting( mouseX,
            mouseY,
            this.drag_objects )
        if ( intersects.length > 0
             && app.deviceBoxMap[ intersects[ 0 ].object.name ].connectees.indexOf( this.boxInFocus ) === -1 )
        {
            var intersect_target = intersects[ 0 ].object;
            var radius = intersect_target.geometry.boundingSphere.radius;
            this.boxInFocus.setLineTarget( intersect_target.name );
            this.boxInFocus.lineToDevice( intersect_target.position, radius, intersect_target.name )

            app.deviceBoxMap[ intersect_target.name ].connectees.push( this.boxInFocus );
        }
        else
        {
            this.boxInFocus.removeLine();
        }
    }

    /*
     * Delete the selected selection box.
     */
    deleteBox()
    {
        this.boxInFocus.removePoints();
        this.boxInFocus.removeBox();
        this.boxInFocus.removeLines();

        var index = app.selectionBoxArray.indexOf( this.boxInFocus );
        if ( index > -1 )
        {
            app.selectionBoxArray.splice( index, 1 );
        }
        for ( var device in app.deviceBoxMap )
        {
            index = app.deviceBoxMap[ device ].connectees.indexOf( this.boxInFocus );
            if ( index > -1 )
            {
                app.deviceBoxMap[ device ].connectees.splice( index, 1 );
            }
        }
        this.boxInFocus = undefined;
    }

    /*
     * Delete the selected device.
     */
    deleteDevice()
    {
        // remove connection lines
        var deviceName = this.deviceInFocus.name;
        for ( var i in app.deviceBoxMap[ deviceName ].connectees )
        {
            app.deviceBoxMap[ deviceName ].connectees[ i ].removeLines( deviceName );
        }
        this.removeOutline()
        for ( var i in app.circle_objects )
        {
            if ( app.circle_objects[ i ].name === deviceName )
            {
                app.scene.remove( app.circle_objects[ i ] );
                app.circle_objects.splice( i, 1 );
            }
        }
        delete app.deviceBoxMap[ deviceName ].connectees;
        delete app.deviceBoxMap[ deviceName ];
        this.deviceInFocus = undefined;
    }

    /*
     * Callback function for mouse click down.
     */
    onMouseDown( event )
    {
        //event.preventDefault();
        if ( event.target.localName === "canvas" )
        {
            event.preventDefault();

            this.mouseDown = true;
            app.mouseDownCoords.x = event.clientX;
            app.mouseDownCoords.y = event.clientY;

            this.deviceInFocus = undefined;
            this.removeOutline();

            if ( this.boxInFocus !== undefined )
            {
                console.log( "Select resize points" )
                // If a box is selected, check if we click on a resize or rotation point.
                this.selectResizeOrRotationPoints( event.clientX, event.clientY );
                if ( this.resizeSideInFocus !== undefined || this.rotationPoint !== undefined )
                {
                    return;
                }
            }
            if ( event.shiftKey )
            {
                console.log( "Select device" )
                // If the shift key is down, check if we click on a device.
                this.selectDevice( event.clientX, event.clientY );
            }
            else
            {
                console.log( "Select box" )
                // If neither of the above, check if we click on a box.
                this.selectBox()
            }
        }
    }

    /*
     * Callback function for mouse movement.
     */
    onMouseMove( event )
    {
        //event.preventDefault();
        event.stopPropagation();

        if ( this.make_selection_box )
        {
            // If we are making a box, update the marquee
            this.updateMarquee( event.clientX, event.clientY );
        }
        else if ( this.resizeSideInFocus !== undefined )
        {
            // If we have selected one of the resize points, update the size of
            // the box.
            this.resizeBox( event.clientX, event.clientY );
        }
        else if ( this.rotationPoint !== undefined )
        {
            // If we have selected one of the rotation points, rotate the selection.
            this.rotateBox( event.clientX, event.clientY );
        }
        else if ( this.make_connection )
        {
            // If we are making a connection, update the connection line
            this.updateLine( event.clientX, event.clientY );
        }
        else if ( this.deviceInFocus != undefined && this.mouseDown )
        {
            // If we are moving a device, update device position.
            if ( this.deviceInFocus )
            {
                this.updateDevicePosition( event.clientX, event.clientY );
            }
        }
    }

    /*
     * Callback function for mouse click up.
     */
    onMouseUp( event )
    {
        event.preventDefault();
        event.stopPropagation();

        if ( this.make_selection_box )
        {
            this.makeSelectionBox();
        }
        else if ( this.resizeSideInFocus !== undefined )
        {
            // Check if we have flipped any of the axes of the box.
            this.checkFlipBox();
        }
        else if ( this.rotationPoint !== undefined )
        {
            // NB! Making new resize-points after having updated the ellipse does not work!!!
            console.log(this.boxInFocus)

            this.boxInFocus.removePoints();
            this.boxInFocus.makeRotationPoints();
            this.rotationPoint = undefined;

            this.serverPrintGids();
        }
        else if ( this.make_connection )
        {
            this.makeConnection( event.clientX, event.clientY );
        }
        else if ( this.deviceInFocus != undefined )
        {
            // Dropping a device will reset the cursor.
            this.domElement.style.cursor = 'auto';
        }
        this.resetButtons();
    }

    /*
     * Callback function for key up.
     */
    onKeyUp( event )
    {
        // For releasing the delete key (46).
        if ( event.keyCode == 46 )
        {
            if ( this.boxInFocus !== undefined )
            {
                this.deleteBox();
            }
            else if ( this.deviceInFocus != undefined )
            {
                this.deleteDevice();
            }
        }
    }

    /*
     * Callback function for window resize.
     */
    onWindowResize()
    {
        app.camera.aspect = app.container.clientWidth / app.container.clientHeight;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize( app.container.clientWidth, app.container.clientHeight );
    }
};

// Try exporting Controls for testing
try
{
    module.exports = Controls;
}
catch(err)
{
}
