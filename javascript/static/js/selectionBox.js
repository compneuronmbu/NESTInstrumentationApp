/*
*
* SELECTIONBOX
*
*/

class SelectionBox {
	constructor( ll, ur )
	{
		this.layerName = "";
		// Use screen coordinates
		this.ll = ll;
		this.ur = ur;

		this.box;
		this.resizePoints = [];

		this.selectedPointIDs = [];

		this.selectPoints();
	}


	selectPoints()
	{
	    var xypos;
	    var nSelectedOld = nSelected;
	    var boundary = {ll: this.ll, ur: this.ur}

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

	                if (withinBounds(xypos, boundary))
	                {
	                	this.selectedPointIDs.push(i);
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

	updateColors()
	{
		var points = layer_points[this.layerName].points;
		var colors = points.geometry.getAttribute("customColor").array;
	    var positions = points.geometry.getAttribute("position").array;

	    var nSelectedOld = nSelected;

	    var oldPointIDs = this.selectedPointIDs;
	    var newPoints = [];

	    var colorID;

        var xypos;
        var newBounds = {ll: this.ll, ur: this.ur};

	    for (var i = 0; i < oldPointIDs.length; ++i)
        {
        	colorID = oldPointIDs[i];

        	colors[ colorID ]     = color.r;
        	colors[ colorID + 1 ] = color.g;
        	colors[ colorID + 2 ] = color.b;
        	
        	nSelected -= 1
        }

        for (var i = 0; i < positions.length; i += 3)
        {
            var p = { x: positions[i], y: positions[i + 1], z: positions[i + 2] };
            xypos = toScreenXY(p);

            if (withinBounds(xypos, newBounds))
            {
            	newPoints.push(i);
                colors[ i ]     = 1.0;
                colors[ i + 1 ] = 0.0;
                colors[ i + 2 ] = 1.0;

                nSelected += 1;
            }

        }
        points.geometry.attributes.customColor.needsUpdate = true;

        if (nSelected != nSelectedOld)
        {
            $("#infoselected").html( nSelected.toString() + " selected" );
        }

        this.selectedPointIDs = newPoints;

	}

	makeBox()
	{
	    var objectBoundsLL = toObjectCoordinates(this.ll);
	    var objectBoundsUR = toObjectCoordinates(this.ur);
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

	updateBox()
	{
		var objectBoundsLL = toObjectCoordinates(this.ll);
	    var objectBoundsUR = toObjectCoordinates(this.ur);
	    var xLength = objectBoundsUR.x - objectBoundsLL.x;
	    var yLength = objectBoundsUR.y - objectBoundsLL.y;
	    var boxGeometry = new THREE.BoxBufferGeometry( xLength, yLength, 0.0 );

	    this.box.geometry = boxGeometry;

	    var boxPosition = {
	        x: ( objectBoundsUR.x + objectBoundsLL.x ) / 2,
	        y: -( objectBoundsUR.y + objectBoundsLL.y ) / 2,
	        z: 0.0
	    }

	    this.box.position.copy(boxPosition);

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
		var selectionBounds = this.getSelectionBounds();

		var resizeGeometry = new THREE.BufferGeometry();
        var resizePos = new Float32Array( 24 );

        var posArray = [
        	{x: selectionBounds.ll.x, y: selectionBounds.ll.y, z: 0.0001},
        	{x: ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2, y: selectionBounds.ll.y, z: 0.0001},
        	{x: selectionBounds.ur.x, y: selectionBounds.ll.y, z: 0.0001},
        	{x: selectionBounds.ur.x, y: ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2, z: 0.0001},
        	{x: selectionBounds.ur.x, y: selectionBounds.ur.y, z: 0.0001},
        	{x: ( selectionBounds.ll.x + selectionBounds.ur.x ) / 2, y: selectionBounds.ur.y, z: 0.0001},
        	{x: selectionBounds.ll.x, y: selectionBounds.ur.y, z: 0.0001},
        	{x: selectionBounds.ll.x, y: ( selectionBounds.ll.y + selectionBounds.ur.y ) / 2, z: 0.0001},
        	];

        var nameArray = [
        	'lowerLeft',
        	'lowerMiddle',
        	'lowerRight',
        	'middleRight',
        	'upperRight',
        	'upperMiddle',
        	'upperLeft',
        	'middleLeft'
        ];

        for ( var i = 0; i < posArray.length; ++i )
        {
        	this.resizePoints.push(this.makePoint(posArray[i], nameArray[i]));
        }
	}

	makePoint(pos, name)
	{
		var geometry = new THREE.CircleBufferGeometry( 0.009, 32 );
   		var material = new THREE.MeshBasicMaterial( { color: 0xffffff,} );
    	var point = new THREE.Mesh( geometry, material );
    	point.name = name;
    	point.position.copy( pos );

    	scene.add(point);

		return point;
	}

	removePoints()
	{
		for (var i = 0; i < this.resizePoints.length ; ++i)
		{
			scene.remove(this.resizePoints[i]);
		}
		this.resizePoints = [];
	}

}