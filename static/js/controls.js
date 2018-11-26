/**
 * This class holds the data and methods used when controlling the app.
* @param {Array} drag_objects Devices.
* @param {Object} domElement The DOM element of the renderer.
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
        this.mouseMoved = false;
        this.keyDown = false;
        this.shiftDown = false;
        this.translatingBox = false;
        this.make_selection_box = false;
        this.make_connection = false;
        this.selectable = true;

        this.plane;
        this.raycaster;
        this.intersection = new app.THREE.Vector3();

        this.boxInFocus;
        this.resizeSideInFocus;
        this.deviceInFocus;
        this.lineInFocus;
        this.rotationPoint;

        this.curveObject;
        this.curve;

        this.outlineMesh;

        // Callbacks have to be bound to this
        this.domElement.addEventListener( 'mousemove', this.onMouseMove.bind( this ), false );
        this.domElement.addEventListener( 'mousedown', this.onMouseDown.bind( this ), false );
        this.domElement.addEventListener( 'mouseup', this.onMouseUp.bind( this ), false );
        this.domElement.addEventListener( 'wheel', this.onMouseWheel.bind(this), false );

        window.addEventListener( 'keydown', this.onKeyDown.bind( this ), false );
        window.addEventListener( 'keyup', this.onKeyUp.bind( this ), false );
        window.addEventListener( 'resize', this.onWindowResize.bind( this ), false );
    }

    /**
     * Resets all the controls.
     */
    resetButtons()
    {
        this.mouseDown = false;
        this.shiftDown = false;
        this.translatingBox = false;
        this.nothingClicked = false;
        this.mouseMoved = false;
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

    /**
     * Creates an outline of a device icon, to show that it is selected.
     *
     * @param focusObject The THREE.Mesh of the device to be highlighted.
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

    /**
     * Removes a device outline.
     */
    removeOutline()
    {
        app.outlineScene.remove( this.outlineMesh );
    }

    /**
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
                userID: app.userID,
                network: app.modelParameters,
                info: this.boxInFocus.getData( true )
            } ),
            success: function( data )
            {},
            dataType: "json"
        } );
    }

    /**
     * Finds objects intersecting with the mouse, given a list of objects.
     *
     * @param {Object} mouseX x coordinates of the mouse.
     * @param {Object} mouseY y coordinates of the mouse.
     * @param {Array} objects Objects in the scene to be checked for intersection.
     * @returns {Array} Objects intersected.
     */
    getMouseIntersecting( mouseX, mouseY, objects )
    {
        this.raycaster = new app.THREE.Raycaster();
        this.raycaster.linePrecision = 0.05;
        var rect = this.domElement.getBoundingClientRect();
        var mouse = new app.THREE.Vector2();
        mouse.x = ( ( mouseX - rect.left ) / rect.width ) * 2 - 1;
        mouse.y = -( ( mouseY - rect.top ) / rect.height ) * 2 + 1;

        this.raycaster.setFromCamera( mouse, app.camera );

        if ( objects === undefined )
        {
            return [];
        }
        return this.raycaster.intersectObjects( objects );
    }

    /**
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
            this.rotationPoint = rotatePointIntersects[ 0 ].object;
            return;
        }
        else if ( !app.is3DLayer )
        {
            // This is done by select3DBox if we have a 3D model.
            this.boxInFocus.setInactive();
            this.boxInFocus = undefined;
        }
    }

    /**
     * Checks if the mouse clicks on a device. If so, sets the device as
     * selected, and creates an outline around the device icon.
     */
    selectDevice()
    {
        this.plane = new app.THREE.Plane();

        var intersects = this.getMouseIntersecting( app.mouseDownCoords.x,
            app.mouseDownCoords.y,
            this.drag_objects );

        if ( intersects.length > 0 )
        {
            this.deviceInFocus = intersects[ 0 ].object;
            this.domElement.style.cursor = 'move';

            this.makeOutline( this.deviceInFocus );
        }
    }

    /**
     * Checks if we have a 3D or 2D model and redistribute to correct function to check
     * if the mouse clicks on a selection box.
     */
    selectBox()
    {
        if ( app.is3DLayer )
        {
            this.select3DBox();
        }
        else
        {
            this.select2DBox();
        }
    }

    /**
     * Checks if the mouse clicks on a 2D selection box. If so, sets the selection
     * box as selected. If not, indicates that we should create a selection box.
     */
    select2DBox()
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
                this.boxInFocus.enableConnectionHandle();

                if ( this.clickedConnectionHandle() )
                {
                    // Make conectee line
                    this.make_connection = true;
                    this.boxInFocus.makeLine();
                }
                

                // SelectedFirstTime is used to turn the elliptical masks.
                if( this.boxInFocus.selectedFirstTime )
                {
                    console.log( "Selected for second time!" );
                    // We have chosen the selectionBox two times, and must make rotation points.
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
     * Checks if the mouse clicks on a selection 3D box. If so, sets the selection
     * box as selected.
     */
    select3DBox()
    {
        var boxClicked = this.getBoxClicked3D();
        if ( this.boxInFocus !== undefined )
        {
            if ( boxClicked === undefined )
            {
                // If we have not pressed a box, but we have a box in focus, we need to deactivate the
                // box in focus, because we have pressed somewhere else. 
                if ( this.boxInFocus.transformControls.axis === null )
                {
                    this.nothingClicked = true;
                    return;
                }
                this.translatingBox = true;
                return;
            }
            else if ( boxClicked !== this.boxInFocus )
            {
                // If we have pressed on a box, but it is not the one that is in focus, we need
                // to make the clicked box the box in focus.
                this.boxInFocus.setInactive();
                this.boxInFocus = boxClicked;
                this.boxInFocus.setActive();

                // For debugging
                this.serverPrintGids();
            }
            if ( this.clickedConnectionHandle() )
            {
                // Make conectee line
                this.make_connection = true;
                this.boxInFocus.makeLine();
            }
        }
        else
        {
            // If we don't have a box in focus, we check if we click on a box, and if so, make it the one in focus.
            this.boxInFocus = boxClicked;
            if ( this.boxInFocus !== undefined )
            {
                this.boxInFocus.setActive();

                // For debugging
                this.serverPrintGids();

                // Make conectee line
                this.boxInFocus.makeLine();
                this.make_connection = true;
            }
        }
    }


    /**
     * In 3D space, gets the box clicked.
     *
     * @returns {SelectionBox3D|undefined} Box clicked, if we click on a box.
     */
    getBoxClicked3D()
    {
        var boxIntersects = this.getMouseIntersecting( app.mouseDownCoords.x,
                    app.mouseDownCoords.y,
                    app.getMaskBoxes() );
        var selectedBox;
        if ( boxIntersects.length > 0 )
        {
            for ( var i in app.selectionBoxArray )
            {
                if (app.selectionBoxArray[ i ].box === boxIntersects[ 0 ].object )
                {
                    selectedBox = app.selectionBoxArray[ i ];
                }
            }
        }
        return selectedBox;
    }

    /**
     * Checks if we click on the connection handle of the box in focus.
     *
     * @returns {Bool} If we clicked on the connection handle.
     */
    clickedConnectionHandle()
    {
        var intersects = this.getMouseIntersecting( app.mouseDownCoords.x,
            app.mouseDownCoords.y,
            [ this.boxInFocus.connectionHandle ] );
        return intersects.length > 0;
    }

    /*
     * Selects a connection line if any are being clicked at.
     */
    selectLine()
    {
        var selectedLine;
        var lines = app.getConnectionLines();
        app.tmpLine = lines[0];
        var lineIntersects = this.getMouseIntersecting( app.mouseDownCoords.x,
                    app.mouseDownCoords.y,
                    lines );
        if ( lineIntersects.length > 0 )
        {
            selectedLine = lineIntersects[0].object.parentObject;
        }
        if ( selectedLine !== undefined )
        {
            this.lineInFocus = selectedLine;
            this.lineInFocus.setActive();
        }
        
    }

    /**
     * Given the mouse position, updates the marquee dimensions.
     *
     * @param {Int} mouseX x-coordinate of the mouse
     * @param {Int} mouseY y-coordinate of the mouse
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

    /**
     * Given the mouse position, resizes the selected box according to which
     * resize point has been clicked.
     *
     * @param {Int} mouseX x-coordinate of the mouse
     * @param {Int} mouseY y-coordinate of the mouse
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
        this.boxInFocus.updateMajorAndMinorAxis();
        this.boxInFocus.updateBox();
        this.boxInFocus.removePoints();
        this.boxInFocus.makeSelectionPoints();
        this.boxInFocus.updateColors();
        this.boxInFocus.updateLineStart();
        this.boxInFocus.updateConnectionHandle();
    }

    /**
     * Finds the angle of rotation above the x-axis, and updates the ellipse to be tilted with the angle.
     *
     * @param {Int} mouseX x-coordinate of the mouse
     * @param {Int} mouseY y-coordinate of the mouse
     */
    rotateBox( mouseX, mouseY )
    {
        console.log(this.boxInFocus.box);

        var cntr = app.toScreenXY(this.boxInFocus.box.position);

        // The length between the centre of the ellipse and the mouse position.
        var hyp = Math.sqrt( Math.pow( app.renderer.getSize().height - cntr.y - mouseY, 2 ) + Math.pow( mouseX - cntr.x, 2 ) );
        var angle;
        if(  app.renderer.getSize().height - cntr.y - mouseY >= 0 )
        {
            // If the mouse position is at the upper half of the ellipse.
            angle = Math.acos( ( mouseX - cntr.x ) / hyp );
        }
        else
        {
            // If the mouse position is at the bottom half of the ellipse.
            angle = 2*Math.PI - Math.acos( ( mouseX - cntr.x ) / hyp ) ;
        }

        this.boxInFocus.angle = angle;
        this.boxInFocus.updateBox();
        this.boxInFocus.updateColors();
    }

    /**
     * Given the mouse position, updates the connection line.
     *
     * @param {Int} mouseX x-coordinate of the mouse
     * @param {Int} mouseY y-coordinate of the mouse
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
            y: relScreenPos.y,
            z: 0.0
        }, "" );
    }

    /**
     * Given the mouse position, updates the position of the device selected,
     * and its connected lines.
     *
     * @param {Int} mouseX x-coordinate of the mouse
     * @param {Int} mouseY y-coordinate of the mouse
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
            var deviceName = this.deviceInFocus.name;
            var radius = this.deviceInFocus.geometry.boundingSphere.radius;
            for ( var i in app.deviceBoxMap[ deviceName ].connectees )
            {
                app.deviceBoxMap[ deviceName ].connectees[ i ].updateLineEnd(
                {
                    x: this.deviceInFocus.position.x,
                    y: this.deviceInFocus.position.y,
                    z: this.deviceInFocus.position.z
                }, deviceName, radius );
            }
        }
    }

    /**
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
        app.layerSelected = this.boxInFocus.layerName;

        // If we didn't click on a layer, it will cause problems further down
        if ( app.layerSelected === "" )
        {
            this.boxInFocus.removeBox();
            this.boxInFocus = undefined;
            this.resetButtons();
            return false;
        }
        this.boxInFocus.uniqueID = app.uniqueID++;

        app.selectionBoxArray.push( this.boxInFocus );

        this.boxInFocus.makeSelectionPoints();

        this.boxInFocus.selectedNeuronType = app.getSelectedDropDown( "neuronType" );
        this.boxInFocus.selectedSynModel = app.getSelectedDropDown( "synapseModel" );

        this.serverPrintGids();

        this.boxInFocus.selectedFirstTime = true;
        return true;
    }

    /**
     * Checks if the mouse is over a device, if so creates a connection between
     * the device and the selected selection box.
     *
     * @param {Int} mouseX x-coordinate of the mouse
     * @param {Int} mouseY y-coordinate of the mouse
     */
    makeConnection( mouseX, mouseY )
    {
        console.log( "make connection" );

        var intersects = this.getMouseIntersecting( mouseX,
            mouseY,
            this.drag_objects );
        if ( intersects.length > 0 &&
             app.deviceBoxMap[ intersects[ 0 ].object.name ]
             .connectees.indexOf( this.boxInFocus ) === -1 )
        {
            var intersect_target = intersects[ 0 ].object;
            var radius = intersect_target.geometry.boundingSphere.radius;
            this.boxInFocus.setLineTarget( intersect_target.name );
            this.boxInFocus.lineToDevice( intersect_target.position, radius, intersect_target.name );

            app.deviceBoxMap[ intersect_target.name ].connectees.push( this.boxInFocus );
            app.stateCheckpoint();
        }
        else
        {
            this.boxInFocus.removeLine();
        }
    }

    /**
     * Deletes the selected selection box.
     */
    deleteBox()
    {
        this.boxInFocus.deleteBox();

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

    /**
     * Deletes the selected device.
     */
    deleteDevice()
    {
        // remove connection lines
        var deviceName = this.deviceInFocus.name;
        var i;
        for ( i in app.deviceBoxMap[ deviceName ].connectees )
        {
            app.deviceBoxMap[ deviceName ].connectees[ i ].removeLines( deviceName );
        }
        this.removeOutline();
        for ( i in app.circle_objects )
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

    /**
     * Event handler for mouse click down.
     *
     * @event
     */
    onMouseDown( event )
    {
        this.mouseMoved = false;
        if ( event.target.localName === "canvas" )
        {
            this.mouseDown = true;
            app.mouseDownCoords.x = event.clientX;
            app.mouseDownCoords.y = event.clientY;

            if ( !this.selectable )
            {
                return;
            }

            this.deviceInFocus = undefined;
            this.removeOutline();
            this.lineInFocus && this.lineInFocus.setInactive();

            if ( !app.is3DLayer &&  this.boxInFocus !== undefined )
            {
                console.log( "Select resize points" );
                // If a box is selected, check if we click on a resize or rotation point.
                this.selectResizeOrRotationPoints( event.clientX, event.clientY );
                if ( this.resizeSideInFocus !== undefined || this.rotationPoint !== undefined )
                {
                    return;
                }
            }
            if ( event.shiftKey )
            {
                console.log( "Select device" );
                // If the shift key is down, check if we click on a device.
                this.selectDevice( event.clientX, event.clientY );

                // Don't want to rotate the camera if we are moving a device. This is only relevant
                // if we have a 3D model.
                app.is3DLayer && this.deviceInFocus && app.enableOrbitControls( false );
            }
            else
            {
                if ( this.boxInFocus && this.boxInFocus.transformControls.axis != null )
                {
                    // If we are translating the box.
                    this.translatingBox = true;
                    return;
                }
                // If not selecting a device, check if we click on a box.
                this.selectBox();
                if ( this.boxInFocus && !this.nothingClicked )
                {
                    return;
                }
                // If no box was selected, check if we click on a line.
                this.selectLine();
            }
        }
    }

    /**
     * Event handler for mouse movement.
     *
     * @event
     */
    onMouseMove( event )
    {
        this.mouseMoved = true;
        if ( app.is3DLayer )
        {
            this.boxInFocus && this.boxInFocus.updateBorderLines();
            this.translatingBox && this.boxInFocus.updateAzimuthAndPolarAngle();
            this.boxInFocus && this.translatingBox && this.boxInFocus.updateBox();
            this.mouseDown && requestAnimationFrame( app.render.bind(app) );
        }
        if ( this.make_selection_box )
        {
            // If we are making a box, update the marquee
            this.updateMarquee( event.clientX, event.clientY );
            requestAnimationFrame( app.render.bind(app) );
        }
        else if ( this.resizeSideInFocus !== undefined )
        {
            // If we have selected one of the resize points, update the size of
            // the box.
            this.resizeBox( event.clientX, event.clientY );
            requestAnimationFrame( app.render.bind(app) );
        }
        else if ( this.rotationPoint !== undefined )
        {
            // If we have selected one of the rotation points, rotate the selection.
            this.rotateBox( event.clientX, event.clientY );
            requestAnimationFrame( app.render.bind(app) );
        }
        else if ( this.make_connection )
        {
            // If we are making a connection, update the connection line
            this.updateLine( event.clientX, event.clientY );
            requestAnimationFrame( app.render.bind(app) );
        }
        else if ( this.deviceInFocus != undefined && this.mouseDown )
        {
            // If we are moving a device, update device position.
            if ( this.deviceInFocus )
            {
                this.updateDevicePosition( event.clientX, event.clientY );
                requestAnimationFrame( app.render.bind(app) );
            }
        }
    }

    /**
     * Event handler for mouse click up.
     *
     * @event
     */
    onMouseUp( event )
    {
        //event.preventDefault();
        //event.stopPropagation();

        if ( app.is3DLayer )
        {
            this.translatingBox && app.stateCheckpoint();
        }

        if ( this.make_selection_box )
        {
            console.log('make box');
            this.boxInFocus && this.translatingBox && this.boxInFocus.updateBox();
            this.makeSelectionBox() && app.stateCheckpoint();
        }
        else if ( this.resizeSideInFocus !== undefined )
        {
            console.log('resize side');
            this.resizeSideInFocus = undefined;
            // Check if we have flipped any of the axes of the box.
            this.boxInFocus.checkFlip();
            this.boxInFocus.updateColors();
            this.serverPrintGids();
            this.mouseMoved && app.stateCheckpoint();
        }
        else if ( this.rotationPoint !== undefined )
        {
            console.log('rotation points');
            // Update the rotation points
            this.boxInFocus.removePoints();
            this.boxInFocus.makeRotationPoints();

            this.rotationPoint = undefined;

            // Print GIDs for debugging purposes
            this.serverPrintGids();

            this.mouseMoved && app.stateCheckpoint();
        }
        else if ( this.make_connection )
        {
            this.makeConnection( event.clientX, event.clientY );
            app.is3DLayer && app.enableOrbitControls( true );
        }
        else if ( this.deviceInFocus != undefined )
        {
            console.log('move device');
            // Dropping a device will reset the cursor.
            this.domElement.style.cursor = 'auto';

            // Must enable orbit controls again
            app.is3DLayer && app.enableOrbitControls( true );
            this.mouseMoved && app.stateCheckpoint();
        }
        else if ( this.nothingClicked && !this.mouseMoved )
        {
            console.log('nothing clicked and not moved');
            this.boxInFocus.setInactive();
            this.boxInFocus = undefined;
            app.resetVisibility();
        }
        this.resetButtons();
        requestAnimationFrame( app.render.bind(app) );
    }

    /**
     * Event handler for mouse wheel.
     *
     * @event
     */
    onMouseWheel( event )
    {
        if ( app.orbitControls )
        {
            this.boxInFocus && this.boxInFocus.transformControls.update();
            requestAnimationFrame( app.render.bind(app) );
        }
    }

    /**
     * Event handler for key down.
     *
     * @event
     */
    onKeyDown( event )
    {
        if ( this.keyDown )
        {
            return;
        }
        switch ( event.keyCode )
        {
            case 16:  // shift key
                console.log("shift down");
                this.shiftDown = true;
                break;
            case 82:  // R key
                this.boxInFocus &&
                this.boxInFocus.transformControls &&
                this.boxInFocus.transformControls.setMode( "rotate" );
                break;
            case 83:  // S key
                this.boxInFocus &&
                this.boxInFocus.transformControls &&
                this.boxInFocus.transformControls.setMode( "scale" );
        }
        this.keyDown = true;
    }

    /**
     * Event handler for key up.
     *
     * @event
     */
    onKeyUp( event )
    {
        switch ( event.keyCode )
        {
            case 46:  // delete key
                if ( this.boxInFocus !== undefined )
                {
                    this.deleteBox();
                    app.stateCheckpoint();
                }
                else if ( this.deviceInFocus !== undefined )
                {
                    this.deleteDevice();
                    app.stateCheckpoint();
                }
                else if ( this.lineInFocus !== undefined )
                {
                    this.lineInFocus.remove();
                    app.stateCheckpoint();
                }
                break;
            case 16:  // shift key
                console.log("shift up");
                this.shiftDown = false;
                console.log(app.deviceBoxMap);
                break;
            case 82:  // R key
                this.boxInFocus &&
                this.boxInFocus.transformControls &&
                this.boxInFocus.transformControls.setMode( "translate" );
                console.log(this.boxInFocus);
                break;
            case 83:  // S key
                this.boxInFocus &&
                this.boxInFocus.transformControls &&
                this.boxInFocus.transformControls.setMode( "translate" );
        }
        this.keyDown = false;
        requestAnimationFrame( app.render.bind(app) );
    }

    /**
     * Event handler for window resize.
     *
     * @event
     */
    onWindowResize()
    {
        app.camera.aspect = app.container.clientWidth / app.container.clientHeight;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize( app.container.clientWidth, app.container.clientHeight );

        // 2D label positions
        var labels = app.$("[id$='_label']"); 
        for (var i = 0; i < labels.length; ++i)
        {
            app.brain && app.brain.updateLayerNamePosition( labels[ i ] );
        }
        requestAnimationFrame( app.render.bind(app) );
    }
}

// Try exporting Controls for testing
try
{
    module.exports = Controls;
}
catch(err)
{
}
