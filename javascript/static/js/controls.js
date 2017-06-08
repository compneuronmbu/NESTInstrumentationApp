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
    
    var curveObject;
    var curve;

    var CURVE_SEGMENTS = 100;

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

    function updateLinePosition( lineObject, curvePos, newPos)
    {
        var curveVertices = lineObject.geometry.vertices;
        curvePos.points[1].x = curvePos.points[0].x + 0.05;
        curvePos.points[2].x = newPos.x - 0.05;
        curvePos.points[2].y = newPos.y;
        curvePos.points[3].x = newPos.x;
        curvePos.points[3].y = newPos.y;

        for (var i=0; i<=CURVE_SEGMENTS; ++i)
        {
            p = curveVertices[i];
            p.copy( curvePos.getPoint( i / (CURVE_SEGMENTS) ) );
        }
        lineObject.geometry.verticesNeedUpdate = true;

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
                        make_connection = true;

                        curve = new THREE.CatmullRomCurve3( [
                            new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 ),
                            new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 ),
                            new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 ),
                            new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 )
                        ] );
                        curve.type = 'chordal';
                        var curveGeometry = new THREE.Geometry();
                        curveGeometry.vertices = curve.getPoints(CURVE_SEGMENTS);
                        var curveMaterial = new THREE.LineBasicMaterial({ color: 0x809980*1.1, linewidth: 3 });
                        curveObject = new THREE.Line(curveGeometry, curveMaterial);
                        scene.add(curveObject);

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
            var pos = curveObject.position;
            updateLinePosition(curveObject, curve, {x: relScreenPos.x - pos.x, y: relScreenPos.y - pos.y})
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
                            var radius = intersect_target.geometry.boundingSphere.radius;
                            updateLinePosition(object_selected.children[i], object_selected.children[i].children, {x: object_selected.position.x - radius, y: object_selected.position.y})
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
                updateLinePosition(curveObject, curve, {x: intersect_target.position.x - radius, y: intersect_target.position.y})

                curveObject.children = curve;
                intersect_target.children.push(curveObject);

                // TODO: get selection from tmp var, add to device array in projection
                projections[intersect_target.name].connectees.push(connectionTarget);
            }
            else
            {
                scene.remove(curveObject);
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

    function onWindowResize()
    {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( container.clientWidth, container.clientHeight );
    }

    activate();


};