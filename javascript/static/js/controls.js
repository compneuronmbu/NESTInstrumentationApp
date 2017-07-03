/*
 *
 * Controls
 *
 */
class Controls
{
    constructor( drag_objects, camera, domElement )
    {
        this.drag_objects = drag_objects;
        this.camera = camera;
        this.domElement = domElement;

        this.marquee = $( "#select-square" );

        this.mouseDown = false;
        this.shiftDown = false;
        this.make_selection_box = false;
        this.make_connection = false;

        this.plane;
        this.raycaster;
        this.intersection = new THREE.Vector3();

        this.boxInFocus;
        this.resizeSideInFocus;
        this.deviceInFocus;

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
        mouseDownCoords = {
            x: 0,
            y: 0
        };
        mRelPos = {
            x: 0,
            y: 0
        };
        layerSelected = "";
    }

    makeOutline( focusObject )
    {
        this.removeOutline();
        this.outlineMesh = new THREE.Mesh( focusObject.geometry, outlineMaterial );
        this.outlineMesh.material.depthWrite = false;
        //this.outlineMesh.quaternion = focusObject.quaternion;
        this.outlineMesh.position.copy( focusObject.position );
        var scale = new THREE.Vector3( 1.08, 1.08, 1.08 );
        this.outlineMesh.scale.copy( scale );
        outlineScene.add( this.outlineMesh );
    }

    removeOutline()
    {
        outlineScene.remove( this.outlineMesh );
    }

    serverPrintGids()
    {
        // ############ Send points to server for GID feedback ############
        // Send network specs to the server which makes the network
        $.ajax(
        {
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "/selector",
            data: JSON.stringify(
            {
                network: modelParameters,
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

    onMouseDown( event )
    {
        //event.preventDefault();
        if ( event.target.localName === "canvas" )
        {
            event.preventDefault();

            this.mouseDown = true;

            mouseDownCoords.x = event.clientX;
            mouseDownCoords.y = event.clientY;

            this.deviceInFocus = undefined;
            this.removeOutline();

            if ( this.boxInFocus !== undefined )
            {
                this.raycaster = new THREE.Raycaster();

                var rect = this.domElement.getBoundingClientRect();
                var mouse = new THREE.Vector2();
                mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
                mouse.y = -( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

                this.raycaster.setFromCamera( mouse, this.camera );
                var pointIntersects = this.raycaster.intersectObjects( this.boxInFocus.resizePoints );

                if ( pointIntersects.length > 0 )
                {
                    this.resizeSideInFocus = pointIntersects[ 0 ].object.name;
                    console.log( "intersects", this.resizeSideInFocus );
                    return;
                }
                else
                {
                    this.boxInFocus.removePoints();
                    this.boxInFocus = undefined;
                }
            }
            if ( event.shiftKey )
            {
                this.shiftDown = true;

                this.plane = new THREE.Plane();
                this.raycaster = new THREE.Raycaster();

                var rect = this.domElement.getBoundingClientRect();
                var mouse = new THREE.Vector2();
                mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
                mouse.y = -( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

                this.raycaster.setFromCamera( mouse, this.camera );
                var intersects = this.raycaster.intersectObjects( this.drag_objects );

                if ( intersects.length > 0 )
                {
                    this.deviceInFocus = intersects[ 0 ].object;
                    this.domElement.style.cursor = 'move';

                    this.makeOutline( this.deviceInFocus );
                }
            }
            else
            {
                var mouseDownCorrected = {
                    x: mouseDownCoords.x,
                    y: renderer.getSize().height - mouseDownCoords.y
                };

                for ( var i in selectionBoxArray )
                {
                    if ( selectionBoxArray[ i ].withinBounds( mouseDownCorrected, selectionBoxArray[ i ] ) )
                    {
                        this.boxInFocus = selectionBoxArray[ i ];

                        if ( this.boxInFocus.curveObject === undefined )
                        {
                            // Make conectee line
                            this.make_connection = true;
                            this.boxInFocus.makeLine();
                        }

                        // Make resize points
                        this.boxInFocus.makeSelectionPoints();

                        return;
                    }
                }
                this.make_selection_box = true;
            }
        }
    }

    onMouseMove( event )
    {
        //event.preventDefault();
        event.stopPropagation();

        // make sure we are in a select mode.
        if ( this.make_selection_box )
        {
            this.marquee.fadeIn();

            mRelPos.x = event.clientX - mouseDownCoords.x;
            mRelPos.y = event.clientY - mouseDownCoords.y;

            var selectedShape = getSelectedShape();

            if ( selectedShape == "Ellipse" )
            {
                this.marquee.css(
                {
                    borderRadius: 50 + '%'
                } );
            }
            //TODO max
            if ( mRelPos.x < 0 && mRelPos.y < 0 )
            {
                this.marquee.css(
                {
                    left: event.clientX + 'px',
                    width: -mRelPos.x + 'px',
                    top: event.clientY + 'px',
                    height: -mRelPos.y + 'px'
                } );
            }
            else if ( mRelPos.x >= 0 && mRelPos.y <= 0 )
            {
                this.marquee.css(
                {
                    left: mouseDownCoords.x + 'px',
                    width: mRelPos.x + 'px',
                    top: event.clientY,
                    height: -mRelPos.y + 'px'
                } );
            }
            else if ( mRelPos.x >= 0 && mRelPos.y >= 0 )
            {
                this.marquee.css(
                {
                    left: mouseDownCoords.x + 'px',
                    width: mRelPos.x + 'px',
                    height: mRelPos.y + 'px',
                    top: mouseDownCoords.y + 'px'
                } );
            }
            else if ( mRelPos.x < 0 && mRelPos.y >= 0 )
            {
                this.marquee.css(
                {
                    left: event.clientX + 'px',
                    width: -mRelPos.x + 'px',
                    height: mRelPos.y + 'px',
                    top: mouseDownCoords.y + 'px'
                } );
            }
        }
        else if ( this.resizeSideInFocus !== undefined )
        {
            switch ( this.resizeSideInFocus )
            {
                case "lowerLeft":
                    this.boxInFocus.ll.x = event.clientX;
                    this.boxInFocus.ll.y = renderer.getSize().height - event.clientY;
                    this.boxInFocus.updateBox();
                    break;
                case "lowerMiddle":
                    this.boxInFocus.ll.y = renderer.getSize().height - event.clientY;
                    this.boxInFocus.updateBox();
                    break;
                case "lowerRight":
                    this.boxInFocus.ur.x = event.clientX;
                    this.boxInFocus.ll.y = renderer.getSize().height - event.clientY;
                    this.boxInFocus.updateBox();
                    break;
                case "middleRight":
                    this.boxInFocus.ur.x = event.clientX;
                    this.boxInFocus.updateBox();
                    break;
                case "upperRight":
                    this.boxInFocus.ur.x = event.clientX;
                    this.boxInFocus.ur.y = renderer.getSize().height - event.clientY;
                    this.boxInFocus.updateBox();
                    break;
                case "upperMiddle":
                    this.boxInFocus.ur.y = renderer.getSize().height - event.clientY;
                    this.boxInFocus.updateBox();
                    break;
                case "upperLeft":
                    this.boxInFocus.ll.x = event.clientX;
                    this.boxInFocus.ur.y = renderer.getSize().height - event.clientY;
                    this.boxInFocus.updateBox();
                    break;
                case "middleLeft":
                    this.boxInFocus.ll.x = event.clientX;
                    this.boxInFocus.updateBox();
            }
            this.boxInFocus.removePoints();
            this.boxInFocus.makeSelectionPoints();
            this.boxInFocus.updateColors();
            this.boxInFocus.updateLineStart();
        }
        else if ( this.make_connection )
        {
            var relScreenPos = toObjectCoordinates(
            {
                x: event.clientX,
                y: event.clientY
            } );
            this.boxInFocus.updateLineEnd(
            {
                x: relScreenPos.x,
                y: relScreenPos.y
            }, "" )
        }
        else if ( this.deviceInFocus != undefined && this.mouseDown )
        {
            // TODO: dokumentasjon og funskjoner
            var relScreenPos = toObjectCoordinates(
            {
                x: event.clientX,
                y: event.clientY
            } );

            if ( this.deviceInFocus )
            {
                if ( this.raycaster.ray.intersectPlane( this.plane, this.intersection ) )
                {
                    this.deviceInFocus.position.copy( relScreenPos );
                    this.makeOutline( this.deviceInFocus );
                    var deviceName = this.deviceInFocus.name
                    var radius = this.deviceInFocus.geometry.boundingSphere.radius;
                    for ( var i in deviceBoxMap[ deviceName ].connectees )
                    {
                        deviceBoxMap[ deviceName ].connectees[ i ].updateLineEnd(
                        {
                            x: this.deviceInFocus.position.x,
                            y: this.deviceInFocus.position.y
                        }, deviceName, radius );
                    }
                }
            }
        }
    }

    onMouseUp( event )
    {
        event.preventDefault();
        event.stopPropagation();

        if ( this.make_selection_box )
        {
            var mouseDownCorrected = {
                x: mouseDownCoords.x,
                y: renderer.getSize().height - mouseDownCoords.y
            };

            var mouseUpCoords = {
                x: mRelPos.x + mouseDownCorrected.x,
                y: -mRelPos.y + mouseDownCorrected.y
            };

            var bounds = findBounds( mouseUpCoords, mouseDownCorrected );

            this.boxInFocus = new SelectionBox( bounds.ll, bounds.ur, getSelectedShape() );
            this.boxInFocus.uniqueID = uniqueID++;
            layerSelected = this.boxInFocus.layerName;

            // If we didn't click on a layer, it will cause problems further down
            if ( layerSelected === "" )
            {
                this.resetButtons();
                return;
            }

            selectionBoxArray.push( this.boxInFocus );

            this.boxInFocus.makeBox();
            this.boxInFocus.makeSelectionPoints();

            this.boxInFocus.selectedNeuronType = getSelectedDropDown( "neuronType" );
            this.boxInFocus.selectedSynModel = getSelectedDropDown( "synapseModel" );

            this.serverPrintGids();

            requestAnimationFrame( render );
        }
        else if ( this.resizeSideInFocus !== undefined )
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
            this.boxInFocus.removePoints();
            this.boxInFocus.makeSelectionPoints();
            this.boxInFocus.updateColors();
            this.boxInFocus.updateLineStart();
            this.serverPrintGids();
        }
        else if ( this.make_connection )
        {
            //Todo: samme kode som før
            console.log( "make connection" );
            this.raycaster = new THREE.Raycaster();
            var rect = this.domElement.getBoundingClientRect();
            var mouse = new THREE.Vector2();
            mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
            mouse.y = -( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

            this.raycaster.setFromCamera( mouse, this.camera );
            var intersects = this.raycaster.intersectObjects( this.drag_objects );

            if ( intersects.length > 0 )
            {
                var intersect_target = intersects[ 0 ].object;
                var radius = intersect_target.geometry.boundingSphere.radius;
                this.boxInFocus.setLineTarget( intersect_target.name );
                this.boxInFocus.lineToDevice( intersect_target.position, radius, intersect_target.name )

                deviceBoxMap[ intersect_target.name ].connectees.push( this.boxInFocus );
            }
            else
            {
                this.boxInFocus.removeLine();
            }
        }
        else if ( this.deviceInFocus != undefined )
        {

            this.domElement.style.cursor = 'auto';
        }
        this.resetButtons();
    }

    onKeyUp( event )
    {
        // TODO kommentar!
        if ( event.keyCode == 46 )
        {
            if ( this.boxInFocus !== undefined )
            {
                this.boxInFocus.removePoints();
                this.boxInFocus.removeBox();
                this.boxInFocus.removeLines();

                var index = selectionBoxArray.indexOf( this.boxInFocus );
                if ( index > -1 )
                {
                    selectionBoxArray.splice( index, 1 );
                }
                for ( var device in deviceBoxMap )
                {
                    index = deviceBoxMap[ device ].connectees.indexOf( this.boxInFocus );
                    if ( index > -1 )
                    {
                        deviceBoxMap[ device ].connectees.splice( index, 1 );
                    }
                }
                this.boxInFocus = undefined;
            }
            else if ( this.deviceInFocus != undefined )
            {
                // remove connection lines
                var deviceName = this.deviceInFocus.name;
                for ( var i in deviceBoxMap[ deviceName ].connectees )
                {
                    deviceBoxMap[ deviceName ].connectees[ i ].removeLines( deviceName );
                }
                this.removeOutline()
                for ( i in circle_objects )
                {
                    if ( circle_objects[ i ].name === deviceName )
                    {
                        scene.remove( circle_objects[ i ] );
                        circle_objects.splice( i, 1 );
                    }
                }
                delete deviceBoxMap[ deviceName ].connectees;
                delete deviceBoxMap[ deviceName ];
                this.deviceInFocus = undefined;
            }
        }
    }

    onWindowResize()
    {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();

        renderer.setSize( container.clientWidth, container.clientHeight );

    }

};
