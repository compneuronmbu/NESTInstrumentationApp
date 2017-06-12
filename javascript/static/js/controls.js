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

    var selectionBoxArray = [];
    var boxInFocus;
    var resizeSideInFocus;
    var deviceInFocus;
    var deviceInFocusColor;
    
    var curveObject;
    var curve;


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
      marquee.css({width: 0, height: 0});
      mouseDownCoords = { x: 0, y: 0};
      mRelPos = { x: 0, y: 0 };
      layerSelected = "";
    }


    function onMouseDown( event )
    {
        //event.preventDefault();
        //if (controls.shiftDown === true) return;
        if (event.target.localName === "canvas")
        {
            event.preventDefault();

            mouseDown = true;

            mouseDownCoords.x = event.clientX;
            mouseDownCoords.y = event.clientY;

            deviceInFocus = undefined;

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
                    console.log("in focus: ", deviceInFocus);
                    console.log("down", selectionBoxArray);

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
                	if (withinBounds( mouseDownCorrected, selectionBoxArray[i] ))
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
            console.log("down", selectionBoxArray);
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

            // square variations
            // (0,0) origin is the TOP LEFT pixel of the canvas.
            //
            //  1 | 2
            // ---.---
            //  4 | 3
            // there are 4 ways a square can be gestured onto the screen.  the following detects these four variations
            // and creates/updates the CSS to draw the square on the screen
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
                    var deviceName = deviceInFocus.name
                    var radius = deviceInFocus.geometry.boundingSphere.radius;
                    for (var i in deviceBoxMap[deviceName])
                    {
                        deviceBoxMap[deviceName][i].updateLineEnd({x: deviceInFocus.position.x - radius, y: deviceInFocus.position.y}, deviceName);
                    }
                }
            }
        }
    }

    function onMouseUp( event )
    {
        event.preventDefault();
        event.stopPropagation();
        //if (controls.shiftDown === true) return;
        console.log("deviceInFocus", deviceInFocus);


        if ( make_selection_box )
        {
            console.log("make selection box");
            var mouseDownCorrected = {
                x: mouseDownCoords.x,
                y: renderer.getSize().height - mouseDownCoords.y
            };

            var mouseUpCoords = {
            	x: mRelPos.x + mouseDownCorrected.x,
	    		y: -mRelPos.y + mouseDownCorrected.y
	    	};

	    	bounds = findBounds(mouseUpCoords, mouseDownCorrected);

	    	boxInFocus = new SelectionBox( bounds.ll, bounds.ur );
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
            boxInFocus.selectedShape = getSelectedRadio("maskShape");

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
            console.log("resize in focus");
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
            boxInFocus.updateLineStart(toObjectCoordinates({x: boxInFocus.ur.x, y: renderer.getSize().height - (boxInFocus.ll.y + boxInFocus.ur.y) / 2.0}))
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
                boxInFocus.updateLineEnd({x: intersect_target.position.x - radius, y: intersect_target.position.y}, intersect_target.name)

                //curveObject.children = curve;
                //intersect_target.children.push(boxInFocus);

                deviceBoxMap[intersect_target.name].push(boxInFocus);
            }
            else
            {
                boxInFocus.removeLine();
            }
        }
        else if ( deviceInFocus != undefined )
        {
            console.log("device in focus");
            
            renderer.domElement.style.cursor = 'auto';
        }
        resetButtons();
        console.log("up", selectionBoxArray);
    }

    function onKeyUp( event )
    {
        if( event.keyCode == 46 && boxInFocus !== undefined )
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
    }

    function onWindowResize()
    {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( container.clientWidth, container.clientHeight );
    }

    activate();


};