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
    var line;
    var connectionTarget;

    function activate()
    {
        domElement.addEventListener( 'mousemove', onMouseMove, false );
        domElement.addEventListener( 'mousedown', onMouseDown, false );
        domElement.addEventListener( 'mouseup', onMouseUp, false );

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
                var sel;
                var mouseDownCorrected = {
                    x: mouseDownCoords.x,
                    y: renderer.getSize().height - mouseDownCoords.y
                };
                for ( var i in selectionCollection.selections )
                {
                    sel = selectionCollection.selections[i].selection;
                    var name = selectionCollection.selections[i].name;
                    // Clean up lower_left/ll, upper_right/ur
                    var selectionBounds = {
                        ll: {
                            x: sel.ll.x + layer_points[name].offsetts.x,
                            y: sel.ll.y + layer_points[name].offsetts.y
                        },
                        ur: {
                            x: sel.ur.x + layer_points[name].offsetts.x,
                            y: sel.ur.y + layer_points[name].offsetts.y
                        }
                    }
                    if (withinBounds( mouseDownCorrected, {lower_left: toScreenXY(selectionBounds.ll), upper_right: toScreenXY(selectionBounds.ur)} ))
                    {
                        console.log("make_connection")
                        make_connection = true;

                        var line_material = new THREE.LineBasicMaterial({ color: 0x809980*1.1, linewidth: 3 });
                        var line_geometry = new THREE.BufferGeometry();
                        var vertices = new Float32Array( [
                            selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0,
                            selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0
                            ] );
                        line_geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
                        line = new THREE.Line(line_geometry, line_material);
                        scene.add(line);
                        // TODO: save selection to tmp var
                        connectionTarget = selectionCollection.selections[i];
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
        else if ( make_connection )
        {
            var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );
            var pos = line.position;
            var linePositions = line.geometry.attributes.position.array;
            //linePositions[0] = startPos.x;
            //linePositions[1] = startPos.y;
            linePositions[3] = relScreenPos.x - pos.x;
            linePositions[4] = relScreenPos.y - pos.y;
                line.geometry.attributes.position.needsUpdate = true;
                line.geometry.boundingSphere = null;
            line.geometry.boundingBox = null;
        }
        else if ( shiftDown )
        {
            var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );

            if ( object_selected ) {
                if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
                    object_selected.position.copy( relScreenPos );
                    if (object_selected.children.length !== 0 )
                    {
                        // Move lines
                        for (var i in object_selected.children)
                        {
                            var linePosition = object_selected.children[i].geometry.attributes.position.array;
                            var radius = intersect_target.geometry.boundingSphere.radius;
                            linePosition[3] = object_selected.position.x - radius;
                            linePosition[4] = object_selected.position.y;
                            object_selected.children[i].geometry.attributes.position.needsUpdate = true;
                            object_selected.children[i].geometry.boundingSphere = null;
                            object_selected.children[i].geometry.boundingBox = null;
                        }
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
            selectPoints();
            selectionBox();
            // If we didn't click on a layer, it will cause problems further down
            if (layerSelected === "")
            {
              resetButtons();
              return;
            }
            var selectionInfo = makeSelectionInfo();
            selectionCollection.selections.push(selectionInfo);
            console.log(selectionCollection)

            // send network specs to the server which makes the network
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
        else if ( make_connection )
        {
            raycaster = new THREE.Raycaster();
            console.log(selectionCollection);
            var rect = domElement.getBoundingClientRect();
            var mouse = new THREE.Vector2();
            mouse.x = ( (event.clientX - rect.left) / rect.width ) * 2 - 1;
            mouse.y = - ( (event.clientY - rect.top) / rect.height ) * 2 + 1;

            raycaster.setFromCamera( mouse, camera );
            var intersects = raycaster.intersectObjects( drag_objects );

            if ( intersects.length > 0 )
            {
                intersect_target = intersects[ 0 ].object;
                console.log("target: ", intersect_target)
                var pos = line.position;
                var linePositions = line.geometry.attributes.position.array;
                //linePositions[0] = startPos.x;
                //linePositions[1] = startPos.y;
                var radius = intersect_target.geometry.boundingSphere.radius;
                linePositions[3] = intersect_target.position.x - radius;
                linePositions[4] = intersect_target.position.y;
                line.geometry.attributes.position.needsUpdate = true;
                line.geometry.boundingSphere = null;
                line.geometry.boundingBox = null;
                intersect_target.children.push(line);

                // TODO: get selection from tmp var, add to device array in projection
                projections[intersect_target.name].connectees.push(connectionTarget);
            }
            else
            {
                scene.remove(line);
            }
            console.log("projections:", projections);
            console.log("selcol:", selectionCollection);
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

    function onWindowResize()
    {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( container.clientWidth, container.clientHeight );
    }

    activate();


};