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
    var object_selected;

    var selectionBoxArray = [];
    var boxInFocus;
    var resizeSideInFocus;
    
    var curveObject;
    var curve;

    var connectionTarget;

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
      connectionTarget = undefined;
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
                    object_selected = intersects[ 0 ].object;
                    domElement.style.cursor = 'move';
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

                        // NB! Be aware
                        connectionTarget = selectionCollection.selections[i];

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
        }
        else if ( make_connection )
        {
            var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );
            boxInFocus.updateLineEnd({x: relScreenPos.x, y: relScreenPos.y}, "")
        }
        else if ( shiftDown )
        {
            var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );

            if ( object_selected ) {
                if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
                    object_selected.position.copy( relScreenPos );
                    var deviceName = object_selected.name
                    var radius = object_selected.geometry.boundingSphere.radius;
                    for (var i in projections[deviceName].connectees)
                    {
                        projections[deviceName].connectees[i].updateLineEnd({x: object_selected.position.x - radius, y: object_selected.position.y}, deviceName);
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

	    	bounds = findBounds(mouseUpCoords, mouseDownCorrected);

	    	var selectionBox = new SelectionBox( bounds.ll, bounds.ur );
	    	layerSelected = selectionBox.layerName;
	    	selectionBoxArray.push(selectionBox);

	    	// If we didn't click on a layer, it will cause problems further down
            if (layerSelected === "")
            {
              resetButtons();
              return;
            }

            selectionBox.makeBox();
            //selectionBox.makeSelectionPoints();

            // TODO: Inn i SelectionBox klasse??
            var selectionInfo = makeSelectionInfo();
            selectionCollection.selections.push(selectionInfo);

            // Send network specs to the server which makes the network
            makeNetwork();

            // send selection
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                url: "/selector",
                data: JSON.stringify(selectionInfo),
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
            boxInFocus.removePoints();
            boxInFocus.makeSelectionPoints();
            boxInFocus.updateColors();
            boxInFocus.updateLineStart(toObjectCoordinates({x: boxInFocus.ur.x, y: renderer.getSize().height - (boxInFocus.ll.y + boxInFocus.ur.y) / 2.0}))
        }
        else if ( make_connection )
        {
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

                projections[intersect_target.name].connectees.push(boxInFocus);
                console.log("proj:", projections)
            }
            else
            {
                boxInFocus.removeLine();
            }
        }
        else if ( shiftDown )
        {
            if ( object_selected ) {
                object_selected = null;
            }

            renderer.domElement.style.cursor = 'auto';
        }
        resetButtons();
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