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

	var plane;
	var raycaster;
	var intersection = new THREE.Vector3();
	var object_selected;

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
	    else if ( shiftDown )
	    {
	        var relScreenPos = toObjectCoordinates( {x: event.clientX, y: event.clientY} );

	        if ( object_selected ) {
	            if ( raycaster.ray.intersectPlane( plane, intersection ) ) {
	                object_selected.position.copy( relScreenPos );
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