
function makeSpikeTrain(spikeEvents)
{
	var margin = {top: 30, right: 75, bottom: 2, left: 75}
    var width = container.clientWidth / 2;
    var height = 200;

    time = spikeEvents.times
    senders = spikeEvents.senders

    console.log(Math.min.apply(Math, senders), Math.max.apply(Math, senders))
    console.log(d3.max(senders, function(d) { return d; }))
    //y.domain([0, d3.max(data, function(d) { return d.y; })]);


    var x = d3.scale.linear().domain([0, time[time.length - 1]]).range([margin.left, width - margin.right]);
    //var y = d3.scale.linear().domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 10]).range([height - margin.top - margin.bottom, 0]);
    var y = d3.scale.linear().domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 10]).range([height - margin.top - margin.bottom, 0]);
    
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left");

	var svg = d3.select("#spikeTrain")
        .append("svg")
        .attr("width", width)
        .attr("height", height + 5);

    svg.append("g")
	    .attr("class", "axis")
	    .attr("transform", "translate(0, "+ ( height - margin.top - margin.bottom ) +")")
	    .call(xAxis);
 
	svg.append("g")
	    .attr("class", "axis")
	    .attr("transform", "translate("+( margin.left )+", 0)")
	    .call(yAxis);

    svg.append("text")
        .attr("class", "axis")
        .attr("text-anchor", "middle")
        .attr("fill","white")
        .attr("x", width/2)
        .attr("y", height - margin.bottom - 1)
        .text("Time [ms]");


    svg.append("text")
        .attr("class", "axis")
        .attr("text-anchor", "middle")
        .attr("fill","white")
        .attr("dy", ".75em")
        .attr("transform", "translate( 3, "+ (height - margin.top) / 2 +")rotate(-90)")
        //.attr("x", margin.left-3)
        //.attr("y", (height + margin.bottom) / 2)
        .text("Neuron ID");

    /*svg.selectAll("circle")
        .data(time)
        .enter().append("svg:circle")
        //.attr("transform", function (d) { return "translate("+x(d.x)+", "+y(d.y)+")"})
        .attr("cx", function (d, i) { return x(time[i]); } )
        .attr("cy", function (d, i) { return y(senders[i]); } )
        .attr("r", 3);*/

    /*svg.selectAll("line")
        .data(time)
        .enter().append("svg:line")
        //.attr("transform", function (d) { return "translate("+x(d.x)+", "+y(d.y)+")"})
        .attr("x1", function (d, i) { return x(time[i]-0.2); } )
        .attr("y1", function (d, i) { return y(senders[i]-0.2); } )
        .attr("x2", function (d, i) { return x(time[i]+0.2); } )
        .attr("y2", function (d, i) { return y(senders[i]+0.2); } )
        .attr("stroke-width", 2)
        .attr("stroke", "white");*/

    svg.selectAll("line")
        .data(time)
        .enter().append("svg:line")
        //.attr("transform", function (d) { return "translate("+x(d.x)+", "+y(d.y)+")"})
        .attr("x1", function (d, i) { return x(time[i]); } )
        .attr("y1", function (d, i) { return y(senders[i]-5); } )
        .attr("x2", function (d, i) { return x(time[i]); } )
        .attr("y2", function (d, i) { return y(senders[i]+5); } )
        .attr("stroke-width", 2)
        //.attr("stroke", "white");

}