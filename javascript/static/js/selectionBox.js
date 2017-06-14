/*
*
* SELECTIONBOX
*
*/

class SelectionBox {
	constructor( ll, ur, shape )
	{
		this.layerName = "";
		// ll and ur use screen coordinates
		this.ll = ll;
		this.ur = ur;

		this.selectedNeuronType;
		this.selectedSynModel;
		this.selectedShape = shape;

		this.box;
		this.resizePoints = [];

		this.currentCurve;
		this.currentCurveObject;
		this.curves = [];

    	this.selectedPointIDs = [];

		this.selectPoints();
    	this.CURVE_SEGMENTS = 100;
	}

	selectPoints()
	{
	    var xypos;
	    var count = 0;

	    this.getLayerName();
	    if ( this.layerName === "" )
	    {
	    	return;
	    }

    	var points = layer_points[this.layerName].points;
        var colors = points.geometry.getAttribute("customColor").array;
        var positions = points.geometry.getAttribute("position").array;
        
        for (var i = 0; i < positions.length; i += 3)
        {
            var p = {};
            p.x = positions[i];
            p.y = positions[i + 1];
            p.z = positions[i + 2];
            xypos = toScreenXY(p);

            if ( this.withinBounds(xypos) )
            {
            	this.selectedPointIDs.push(i);
                colors[ i ]     = 1.0;
                colors[ i + 1 ] = 0.0;
                colors[ i + 2 ] = 1.0;

                points.geometry.attributes.customColor.needsUpdate = true;
                count += 1;
            }
        }
        if ( !count )
        {
        	this.layerName = "";
        }
        else
        {
        	nSelected += count;
            $("#infoselected").html( nSelected.toString() + " selected" );
        }
	}

	getLayerName()
	{
		var mouseDownCorrected = {
            x: mouseDownCoords.x,
            y: renderer.getSize().height - mouseDownCoords.y
        };
		var roomMouseDown = toObjectCoordinates(mouseDownCorrected);

		var mouseUpCoords = {
        	x: mRelPos.x + mouseDownCorrected.x,
    		y: -mRelPos.y + mouseDownCorrected.y
    	};
		var roomMouseUp = toObjectCoordinates(mouseUpCoords);

		for ( var name in layer_points )
		{
			if (layer_points.hasOwnProperty(name))
	        {
				var bbox = layer_points[name].points.geometry.boundingBox;
				if ( (roomMouseDown.x >= bbox.min.x) && (roomMouseDown.y >= bbox.min.y) && (roomMouseDown.x <= bbox.max.x) && (roomMouseDown.y <= bbox.max.y) )
				{
					this.layerName = name;
					break;
				}
				else if ( ( this.layerName === "" ) && (roomMouseUp.x >= bbox.min.x) && (roomMouseUp.y >= bbox.min.y) && (roomMouseUp.x <= bbox.max.x) && (roomMouseUp.y <= bbox.max.y) )
				{
					this.layerName = name;
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

            if ( this.withinBounds(xypos) )
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

		if ( this.selectedShape == "Rectangle" )
		{
			var geometry = new THREE.BoxBufferGeometry( xLength, yLength, 0.0 );
		}
		else if ( this.selectedShape == "Ellipse" )
		{
			var ellipseShape = new THREE.Shape();
			ellipseShape.ellipse(0, 0, Math.abs(xLength/2), Math.abs(yLength/2), 0, 2 * Math.PI, 0);
			var geometry = new THREE.ShapeBufferGeometry(ellipseShape, 200);
		}

		var material = new THREE.MeshBasicMaterial( {color: 0xFF00FF, transparent: true, opacity: 0.2} );

	    this.box = new THREE.Mesh( geometry, material );

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

	    if ( this.selectedShape == "Rectangle" )
		{
			var geometry = new THREE.BoxBufferGeometry( xLength, yLength, 0.0 );
		}
		else if ( this.selectedShape == "Ellipse" )
		{
			var ellipseShape = new THREE.Shape();
			ellipseShape.ellipse(0, 0, Math.abs(xLength/2), Math.abs(yLength/2), 0, 2 * Math.PI, 0);
			var geometry = new THREE.ShapeBufferGeometry(ellipseShape, 200);
		}
	    this.box.geometry = geometry;

	    var boxPosition = {
	        x: ( objectBoundsUR.x + objectBoundsLL.x ) / 2,
	        y: -( objectBoundsUR.y + objectBoundsLL.y ) / 2,
	        z: 0.0
	    }

	    this.box.position.copy(boxPosition);
	}

	removeBox()
	{
		scene.remove(this.box);

		var points = layer_points[this.layerName].points;
		var colors = points.geometry.getAttribute("customColor").array;

	    var nSelectedOld = nSelected;

	    var oldPointIDs = this.selectedPointIDs;

	    var colorID;

	    for (var i = 0; i < oldPointIDs.length; ++i)
        {
        	colorID = oldPointIDs[i];

        	colors[ colorID ]     = color.r;
        	colors[ colorID + 1 ] = color.g;
        	colors[ colorID + 2 ] = color.b;
        	
        	nSelected -= 1
        }
        points.geometry.attributes.customColor.needsUpdate = true;

        if (nSelected != nSelectedOld)
        {
            $("#infoselected").html( nSelected.toString() + " selected" );
        }
	}

	makeLine()
	{
		var selectionBounds = this.getSelectionBounds();

		this.currentCurve = new THREE.CatmullRomCurve3( [
		    new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 ),
		    new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 ),
		    new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 ),
		    new THREE.Vector3( selectionBounds.ur.x, (selectionBounds.ll.y + selectionBounds.ur.y)/2.0, 0.0 )
		] );
		this.currentCurve.type = 'chordal';
		var curveGeometry = new THREE.Geometry();
		curveGeometry.vertices = this.currentCurve.getPoints(this.CURVE_SEGMENTS);
		var curveMaterial = new THREE.LineBasicMaterial({ color: 0x809980*1.1, linewidth: 2 });
		this.currentCurveObject = new THREE.Line(curveGeometry, curveMaterial);
		scene.add(this.currentCurveObject);

		this.curves.push({curveObject: this.currentCurveObject, curve: this.currentCurve, target: ""});
	}

	setLineTarget( device )
	{
		this.curves[this.curves.length - 1].target = device;
	}

	updateLine( newEndPos, curveIndex, radius )
	{
		var curveObject = this.curves[curveIndex].curveObject;
		var curve = this.curves[curveIndex].curve;

		var selectionBounds = this.getSelectionBounds();
		var centreX = (selectionBounds.ll.x + selectionBounds.ur.x) / 2;
		var direction = 1;

		var endPos = (newEndPos === undefined) ? curve.points[3] : newEndPos;
    	if ( endPos.x < centreX )
    	{
    		curve.points[0].x = (selectionBounds.ll.x < selectionBounds.ur.x) ? selectionBounds.ll.x : selectionBounds.ur.x;
    	}
    	else
    	{
    		curve.points[0].x = (selectionBounds.ll.x < selectionBounds.ur.x) ? selectionBounds.ur.x : selectionBounds.ll.x;
    		direction = -1;
    	}

		curve.points[0].y = (selectionBounds.ll.y + selectionBounds.ur.y) / 2;
		curve.points[1].x = curve.points[0].x + direction * -0.05;
		curve.points[1].y = curve.points[0].y;

		if ( newEndPos !== undefined )
		{
        	curve.points[3].x = newEndPos.x + direction * radius;
        	curve.points[3].y = newEndPos.y;
        	curve.points[2].x = curve.points[3].x + direction * 0.05;
        	curve.points[2].y = curve.points[3].y;
		}
		for (var i=0; i<=this.CURVE_SEGMENTS; ++i)
		{
		    curveObject.geometry.vertices[i].copy( curve.getPoint( i / (this.CURVE_SEGMENTS) ) );
		}
		curveObject.geometry.verticesNeedUpdate = true;
	}

	updateLineStart()
    {
        for (var i in this.curves)
        {
	        this.updateLine(undefined, i, 0);
    	}
    }

    updateLineEnd( newPos, target, radius=0 )
    {
        for (var i in this.curves)
        {
        	if (this.curves[i].target === target)
        	{
        		this.updateLine(newPos, i, radius);
        	}
        }
    }

    lineToDevice(targetPos, radius, target)
    {
    	var selectionBounds = this.getSelectionBounds();
    	var centreX = (selectionBounds.ll.x + selectionBounds.ur.x) / 2;
    	if ((targetPos.x - radius) < centreX)
    	{
    		this.updateLineEnd( {x: targetPos.x + radius, y: targetPos.y}, target );
    	}
    	else
    	{
    		this.updateLineEnd( {x: targetPos.x - radius, y: targetPos.y}, target );
    	}
    }

    removeLine()
    {
    	scene.remove(this.currentCurveObject);
    	this.curves.pop();
    }

    removeLines( target = "" )
    {
    	for ( var i = 0; i < this.curves.length ; ++i )
    	{
    		if ( target === "")
    		{
    			scene.remove( this.curves[i].curveObject );
    		} 
    		else if (target === this.curves[i].target )
    		{
    			scene.remove( this.curves[i].curveObject );
    			this.curves.splice(i, 1);
    			break;
    		}
    	}
    	if ( target === "")
    	{
    		this.curves = [];
    	}
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

	getSelectionInfo()
	{
		var selectedBBoxXYZ = {
		    "ll": toObjectCoordinates(this.ll),
		    "ur": toObjectCoordinates(this.ur) 
		};
		var selectionBox = {
		    "ll": {
		        x: selectedBBoxXYZ.ll.x - layer_points[this.layerName].offsetts.x,
		        y: -(selectedBBoxXYZ.ll.y - layer_points[this.layerName].offsetts.y),
		        z: 0
		    },
		    "ur": {
		        x: selectedBBoxXYZ.ur.x - layer_points[this.layerName].offsetts.x,
		        y: -(selectedBBoxXYZ.ur.y - layer_points[this.layerName].offsetts.y),
		        z: 0
		    }
		};

		var selectedNeuronType = getSelectedDropDown("neuronType");
		var selectedSynModel = getSelectedDropDown("synapseModel");
		var selectedShape = this.selectedShape;


		var selectionInfo = {
		    name: this.layerName,
		    selection: selectionBox,
		    neuronType: selectedNeuronType,
		    synModel: selectedSynModel,
		    maskShape: selectedShape,
		};

		return selectionInfo;
	}

	getInfoForSaving()
	{
		var selectionInfo = {
		    name: this.layerName,
		    ll: this.ll,
		    ur: this.ur,
		    neuronType: this.selectedNeuronType,
		    synModel: this.selectedSynModel,
		    maskShape: this.selectedShape,
		};

		return selectionInfo;
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
   		var material = new THREE.MeshBasicMaterial( { color: 0xcccccc} );
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

	// Takes a position and detect if it is within the boundary box
	withinBounds(pos)
	{
	    if ( this.selectedShape == 'Rectangle' )
	    {
	        return this.withinRectangleBounds(pos);
	    }
	    else if ( this.selectedShape == 'Ellipse' )
	    {
	        return this.withinEllipticalBounds(pos);
	    }
	}

	withinRectangleBounds(pos)
	{
	    return ( (pos.x >= this.ll.x) && (pos.x <= this.ur.x) && (pos.y >= this.ll.y) && (pos.y <= this.ur.y) );
	}

	withinEllipticalBounds(pos)
	{
	    var x_side = (this.ur.x - this.ll.x) / 2;
	    var y_side = (this.ur.y - this.ll.y) / 2;
	    var center = { x: ( this.ur.x + this.ll.x ) / 2.0, y: ( this.ur.y + this.ll.y ) / 2.0 };

	    return ((Math.pow(pos.x - center.x, 2)) / (x_side * x_side) + (Math.pow(pos.y - center.y, 2)) / (y_side * y_side) <= 1);
	}
}