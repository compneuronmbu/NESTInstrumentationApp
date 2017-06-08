/*
*
* SELECTIONBOX
*
*/

class SelectionBox {
	constructor( ll, ur )
	{
		this.layerName = "";
		this.ll = ll;
		this.ur = ur;

		this.box;
		this.resizePoints;

		this.selectPoints();
	}


	selectPoints()
	{
	    var xypos;
	    var nSelectedOld = nSelected;

	    for ( var layer_name in layer_points )
	    {
	        if (layer_points.hasOwnProperty(layer_name))
	        {
	            var points = layer_points[layer_name].points;
	            var colors = points.geometry.getAttribute("customColor").array;
	            var positions = points.geometry.getAttribute("position").array;
	            
	            for (var i = 0; i < positions.length; i += 3)
	            {
	                var p = {};
	                p.x = positions[i];
	                p.y = positions[i + 1];
	                p.z = positions[i + 2];
	                xypos = toScreenXY(p);

	                if (withinBounds(xypos, bounds))
	                {
	                    //color.setRGB(0.7, 0.0, 0.0);
	                    colors[ i ]     = 1.0;
	                    colors[ i + 1 ] = 0.0;
	                    colors[ i + 2 ] = 1.0;

	                    points.geometry.attributes.customColor.needsUpdate = true;
	                    nSelected += 1;

	                    if ( this.layerName === "" )
	                    {
	                        this.layerName = layer_name;
	                    }
	                }
	            }
	            if (nSelected != nSelectedOld)
	            {
	                $("#infoselected").html( nSelected.toString() + " selected" );
	            }
	        }
	    }
	}

	makeBox()
	{
	    var objectBoundsLL = toObjectCoordinates(bounds.ll);
	    var objectBoundsUR = toObjectCoordinates(bounds.ur);
	    var xLength = objectBoundsUR.x - objectBoundsLL.x;
	    var yLength = objectBoundsUR.y - objectBoundsLL.y;
	    var boxGeometry = new THREE.BoxBufferGeometry( xLength, yLength, 0.0 );

	    var boxMaterial = new THREE.MeshBasicMaterial( {color: 0xFF00FF, transparent: true, opacity: 0.2} );
	    this.box = new THREE.Mesh( boxGeometry, boxMaterial );

	    var boxPosition = {
	        x: ( objectBoundsUR.x + objectBoundsLL.x ) / 2,
	        y: -( objectBoundsUR.y + objectBoundsLL.y ) / 2,
	        z: 0.0
	    }

	    this.box.position.copy(boxPosition);

	    scene.add( this.box );
	}

	getSelectionBounds()
	{
		var roomLL = toObjectCoordinates(this.ll);
		var roomUR = toObjectCoordinates(this.ur);
		return {
			        ll: {
			            x: roomLL.x,
			            y: -roomLL.y
			        },
			        ur: {
			            x: roomUR.x,
			            y: -roomUR.y
			        }
			    };
	}

	makeSelectionPoints()
	{
		var resizeGeometry = new THREE.BufferGeometry();
        var resizePos = new Float32Array( 24 );

        var selectionBounds = this.getSelectionBounds();

        resizePos[0] = selectionBounds.ll.x;
        resizePos[1] = selectionBounds.ll.y;
        resizePos[3] = ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2;
        resizePos[4] = selectionBounds.ll.y;
        resizePos[6] = selectionBounds.ur.x;
        resizePos[7] = selectionBounds.ll.y;
        resizePos[9] = selectionBounds.ur.x;
        resizePos[10] = ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2;
        resizePos[12] = selectionBounds.ur.x;
        resizePos[13] = selectionBounds.ur.y;
        resizePos[15] = ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2;
        resizePos[16] = selectionBounds.ur.y;
        resizePos[18] = selectionBounds.ll.x;
        resizePos[19] = selectionBounds.ur.y;
        resizePos[21] = selectionBounds.ll.x;
        resizePos[22] = ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2;

        resizeGeometry.addAttribute( 'position', new THREE.BufferAttribute( resizePos, 3 ) );
		
		var resizeMaterial = new THREE.PointsMaterial({size: 0.03, color: 0xffffff});
		this.resizePoints = new THREE.Points( resizeGeometry, resizeMaterial );
		scene.add(this.resizePoints);
	}

	removePoints()
	{
		scene.remove(this.resizePoints);
	}

}