/*
*
* Controls
*
*/

var Controls = function ( drag_objects, camera, domElement )
{   
    var marquee = $("#select-square");

    var mouseDown = false;
    var shiftDown = false;
    var make_selection_box = false;
    var make_connection = false;

    var plane;
    var raycaster;
    var intersection = new THREE.Vector3();

    var boxInFocus;
    var resizeSideInFocus;
    var deviceInFocus;

    var curveObject;
    var curve;

    var outlineMesh;


    function activate()
    {
        domElement.addEventListener( 'mousemove', onMouseMove, false );
        domElement.addEventListener( 'mousedown', onMouseDown, false );
        domElement.addEventListener( 'mouseup', onMouseUp, false );

        window.addEventListener( 'keyup', onKeyUp, false );

        window.addEventListener( 'resize', onWindowResize, false );
    }

    function resetButtons()
    {
      mouseDown = false;
      shiftDown = false;
      make_selection_box = false;
      make_connection = false;
      marquee.fadeOut();
      marquee.css({width: 0, height: 0, borderRadius: 0});
      mouseDownCoords = { x: 0, y: 0};
      mRelPos = { x: 0, y: 0 };
      layerSelected = "";
    }

    function makeOutline(focusObject)
    {
        removeOutline();
        outlineMesh = new THREE.Mesh( focusObject.geometry, outlineMaterial );
        outlineMesh.material.depthWrite = false;
        outlineMesh.quaternion = focusObject.quaternion;
        outlineMesh.position.copy(focusObject.position);
        var scale = new THREE.Vector3(1.08, 1.08, 1.08);
        outlineMesh.scale.copy(scale);
        outlineScene.add(outlineMesh);
    }

    function removeOutline()
    {
        outlineScene.remove(outlineMesh);
    }

    function onMouseDown( event )
    {
        //event.preventDefault();
        if (event.target.localName === "canvas")
        {
            event.preventDefault();

            mouseDown = true;

            mouseDownCoords.x = event.clientX;
            mouseDownCoords.y = event.clientY;

            deviceInFocus = undefined;
            removeOutline();

            if ( boxInFocus !== undefined )
            {
            	raycaster = new THREE.Raycaster();

                var rect = domElement.getBoundingClientRect();
                var mouse = new THREE.Vector2();
                mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
                mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;

                raycaster.setFromCamera( mouse, camera );
                var pointIntersects = raycaster.intersectObjects( boxInFocus.resizePoints );

                if ( pointIntersects.length > 0 )
                {
                    resizeSideInFocus = pointIntersects[ 0 ].object.name;
                    console.log("intersects", resizeSideInFocus);
                    return;
                }
                else
                {
                    boxInFocus.removePoints();
                    boxInFocus = undefined;
                }
            }
            if ( event.shiftKey )
            {
                shiftDown = true;

                plane = new THREE.Plane();
                raycaster = new THREE.Raycaster();

                var rect = domElement.getBoundingClientRect();
                var mouse = new THREE.Vector2();
                mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
                mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;

                raycaster.setFromCamera( mouse, camera );
                var intersects = raycaster.intersectObjects( drag_objects );

                if ( intersects.length > 0 )
                {
                    deviceInFocus = intersects[ 0 ].object;
                    domElement.style.cursor = 'move';

                    makeOutline(deviceInFocus);
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
                	if ( selectionBoxArray[i].withinBounds( mouseDownCorrected, selectionBoxArray[i] ) )
                    {
                    	boxInFocus = selectionBoxArray[i];

                        if (boxInFocus.curveObject === undefined)
                        {
                            // Make conectee line
                            make_connection = true;
                            boxInFocus.makeLine();
                        }

                        // Make resize points
                        boxInFocus.makeSelectionPoints();

                        return;
                    }
                }
                make_selection_box = true;
            }
        }
    }

    function onMouseMove( event )
    {
        //event.preventDefault();
        event.stopPropagation();

        // make sure we are in a select mode.
        if( make_selection_box )
        {
            marquee.fadeIn();

            mRelPos.x = event.clientX - mouseDownCoords.x;
            mRelPos.y = event.clientY - mouseDownCoords.y;

            var selectedShape = getSelectedShape();

            if ( selectedShape == "Ellipse" )
            {
                marquee.css({borderRadius: 50 + '%'});
            }

            if (mRelPos.x < 0 && mRelPos.y < 0)
            {
              marquee.css({left: event.clientX + 'px',
                           width: -mRelPos.x + 'px',
                           top: event.clientY + 'px',
                           height: -mRelPos.y + 'px'});
            } else if ( mRelPos.x >= 0 && mRelPos.y <= 0)
            {
              marquee.css({left: mouseDownCoords.x + 'px',
                           width: mRelPos.x + 'px',
                           top: event.clientY,
                           height: -mRelPos.y + 'px'});
            } else if (mRelPos.x >= 0 && mRelPos.y >= 0)
            {
              marquee.css({left: mouseDownCoords.x + 'px',
                           width: mRelPos.x + 'px',
                           height: mRelPos.y + 'px',
                           top: mouseDownCoords.y + 'px'});
            } else if (mRelPos.x < 0 && mRelPos.y >= 0)
            {
              marquee.css({left: event.clientX + 'px',
                           width: -mRelPos.x + 'px',
                           height: mRelPos.y + 'px',
                           top: mouseDownCoords.y + 'px'});
            }
        }
        else if (resizeSideInFocus !== undefined)
        {
            switch ( resizeSideInFocus ) {
                case "lowerLeft":
                    boxInFocus.ll.x = event.clientX;
                    boxInFocus.ll.y = renderer.getSize().height - event.clientY;
                    boxInFocus.updateBox();
                    break;
                case "lowerMiddle":
                    boxInFocus.ll.y = renderer.getSize().height - event.clientY;
                    boxInFocus.updateBox();
                    break;
                case "lowerRight":
                    boxInFocus.ur.x = event.clientX;
                    boxInFocus.ll.y = renderer.getSize().height - event.clientY;
                    boxInFocus.updateBox();
                    break;
                case "middleRight":
                    boxInFocus.ur.x = event.clientX;
                    boxInFocus.updateBox();    
                    break;
                case "upperRight":
                    boxInFocus.ur.x = event.clientX;
                    boxInFocus.ur.y = renderer.getSize().height - event.clientY;
                    boxInFocus.updateBox(); 
                    break;
                case "upperMiddle":
                    boxInFocus.ur.y = renderer.getSize().height - event.clientY;
                    boxInFocus.updateBox();  
                    break;
                case "upperLeft":
                    boxInFocus.ll.x = event.clientX;
                    boxInFocus.ur.y = renderer.getSize().height - event.clientY;
                    boxInFocus.updateBox();  
                    break;
                case "middleLeft":
                    boxInFocus.ll.x = event.clientX;
                    boxInFocus.updateBox();  
            }
            boxInFocus.removePoints();
            boxInFocus.makeSelectionPoints();
            boxInFocus.updateLineStart();
        }
        else if ( make_connection )
        {
            var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );
            boxInFocus.updateLineEnd({x: relScreenPos.x, y: relScreenPos.y}, "")
        }
        else if ( deviceInFocus != undefined && mouseDown )
        {
            var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );

            if ( deviceInFocus ) {
                if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
                    deviceInFocus.position.copy( relScreenPos );
                    makeOutline(deviceInFocus);
                    var deviceName = deviceInFocus.name
                    var radius = deviceInFocus.geometry.boundingSphere.radius;
                    for (var i in deviceBoxMap[deviceName])
                    {
                        deviceBoxMap[deviceName][i].updateLineEnd({x: deviceInFocus.position.x, y: deviceInFocus.position.y}, deviceName, radius);
                    }
                }
            }
        }
    }

    function onMouseUp( event )
    {
        event.preventDefault();
        event.stopPropagation();

        if ( make_selection_box )
        {
            var mouseDownCorrected = {
                x: mouseDownCoords.x,
                y: renderer.getSize().height - mouseDownCoords.y
            };

            var mouseUpCoords = {
            	x: mRelPos.x + mouseDownCorrected.x,
	    		y: -mRelPos.y + mouseDownCorrected.y
	    	};

	    	var bounds = findBounds(mouseUpCoords, mouseDownCorrected);

	    	boxInFocus = new SelectionBox( bounds.ll, bounds.ur, getSelectedShape() );
            boxInFocus.uniqueID = uniqueID++;
	    	layerSelected = boxInFocus.layerName;

	    	// If we didn't click on a layer, it will cause problems further down
            if (layerSelected === "")
            {
              resetButtons();
              return;
            }

            selectionBoxArray.push(boxInFocus);

            boxInFocus.makeBox();
            boxInFocus.makeSelectionPoints();

            boxInFocus.selectedNeuronType = getSelectedDropDown("neuronType");
            boxInFocus.selectedSynModel = getSelectedDropDown("synapseModel");

            // ############ Send points to server for GID feedback ############
            // Send network specs to the server which makes the network
            makeNetwork();

            // send selection
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                url: "/selector",
                data: JSON.stringify(boxInFocus.getSelectionInfo()),
                success: function (data) {
                    console.log(data.title);
                    console.log(data.article);
                },
                dataType: "json"
            });

            requestAnimationFrame( render );
        }
        else if (resizeSideInFocus !== undefined)
        {
            resizeSideInFocus = undefined;
            // We need to exchange coordinates if the selection is being flipped
            if (boxInFocus.ll.x > boxInFocus.ur.x)
            {
                var tmpX = boxInFocus.ur.x;
                boxInFocus.ur.x = boxInFocus.ll.x;
                boxInFocus.ll.x = tmpX;
            }
            if (boxInFocus.ll.y > boxInFocus.ur.y)
            {
                var tmpY = boxInFocus.ur.y;
                boxInFocus.ur.y = boxInFocus.ll.y;
                boxInFocus.ll.y = tmpY;
            }
            boxInFocus.removePoints();
            boxInFocus.makeSelectionPoints();
            boxInFocus.updateColors();
            boxInFocus.updateLineStart();
        }
        else if ( make_connection )
        {
            console.log("make connection");
            raycaster = new THREE.Raycaster();
            var rect = domElement.getBoundingClientRect();
            var mouse = new THREE.Vector2();
            mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
            mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;

            raycaster.setFromCamera( mouse, camera );
            var intersects = raycaster.intersectObjects( drag_objects );

            if ( intersects.length > 0 )
            {
                intersect_target = intersects[ 0 ].object;
                var radius = intersect_target.geometry.boundingSphere.radius;
                boxInFocus.setLineTarget(intersect_target.name);
                boxInFocus.lineToDevice(intersect_target.position, radius, intersect_target.name)

                deviceBoxMap[intersect_target.name].push(boxInFocus);
            }
            else
            {
                boxInFocus.removeLine();
            }
        }
        else if ( deviceInFocus != undefined )
        {
            
            renderer.domElement.style.cursor = 'auto';
        }
        resetButtons();
    }

    function onKeyUp( event )
    {
        if( event.keyCode == 46)
        {
            if (boxInFocus !== undefined)
            {
                boxInFocus.removePoints();
                boxInFocus.removeBox();
                boxInFocus.removeLines();

                var index = selectionBoxArray.indexOf(boxInFocus);
                if ( index > -1 )
                {
                    selectionBoxArray.splice(index, 1);
                }
                for (device in deviceBoxMap)
                {
                    index = deviceBoxMap[device].indexOf(boxInFocus);
                    if ( index > -1 )
                    {
                        deviceBoxMap[device].splice(index, 1);
                    }
                }
                console.log("dbm", deviceBoxMap)
                boxInFocus = undefined;
            }
            else if (deviceInFocus != undefined)
            {
                // remove connection lines
                var deviceName = deviceInFocus.name;
                for (var i in deviceBoxMap[deviceName])
                {
                    deviceBoxMap[deviceName][i].removeLines( deviceName );
                }
                removeOutline()
                for (i in circle_objects)
                {
                    if (circle_objects[i].name === deviceName)
                    {
                        scene.remove(circle_objects[i]);
                        circle_objects.splice(i, 1);
                    }
                }
                delete deviceBoxMap[deviceName];
                deviceInFocus = undefined;
            }
        }
    }

    function onWindowResize()
    {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( container.clientWidth, container.clientHeight );

    }

    activate();

};
