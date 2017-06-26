var margin = {top: 30, right: 75, bottom: 2, left: 75};
var height = 200;
var x;
var y;
//var xAxis;
var lastTime = 100;
var firstTime = 0;
var previousLenght = 0;


function makeDevicePlot()
{
    var width = container.clientWidth / 2;

    x = d3.scale.linear().domain([0, 10]).range([margin.left, width - margin.right]);
    //var y = d3.scale.linear().domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 10]).range([height - margin.top - margin.bottom, 0]);
    y = d3.scale.linear().domain([0, 10]).range([height - margin.top - margin.bottom, 0]);
    
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left");

    spikeTrain = d3.select("#spikeTrain")
        .append("svg")
        .attr("width", width)
        .attr("height", height + 5);

    spikeTrain.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, "+ ( height - margin.top - margin.bottom ) +")")
        .call(xAxis);
 
    spikeTrain.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate("+( margin.left )+", 0)")
        .call(yAxis);

    spikeTrain.append("text")
        .attr("class", "axis")
        .attr("text-anchor", "middle")
        .attr("fill","white")
        .attr("x", width/2)
        .attr("y", height - margin.bottom - 1)
        .text("Time [ms]");


    spikeTrain.append("text")
        .attr("class", "axis")
        .attr("text-anchor", "middle")
        .attr("fill","white")
        .attr("dy", ".75em")
        .attr("transform", "translate( 3, "+ (height - margin.top) / 2 +")rotate(-90)")
        //.attr("x", margin.left-3)
        //.attr("y", (height + margin.bottom) / 2)
        .text("Neuron ID");
}


function makeSpikeTrain(spikeEvents)
{
    console.log("MAKESPIKETRAIN")
	//var margin = {top: 30, right: 75, bottom: 2, left: 75}
    var width = container.clientWidth / 2;
    //var height = 200;

    var eventLength = spikeEvents.times.length;

    var time = spikeEvents.times;
    //var oldTime = spikeEvents.times.slice(0, previousLenght)
    //var time = spikeEvents.times.slice(previousLenght, eventLength);
    //var senders = spikeEvents.senders.slice(previousLenght, eventLength);
    //previousLenght = eventLength;
    var senders = spikeEvents.senders;
    var dt = spikeEvents.dt;

    console.log(time);
    console.log(senders);

    firstTime += dt;

    x .domain([0, time[time.length - 1]]);
    y.domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 10]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left");

    spikeTrain.select(".x.axis").transition().call(xAxis)
    spikeTrain.select(".y.axis").transition().call(yAxis)

//    spikeTrain.selectAll("circle")
//        .data(time)
//        .enter().append("svg:circle")
//        //.attr("transform", function (d) { return "translate("+x(d.x)+", "+y(d.y)+")"})
//        .attr("cx", function (d, i) { return x(time[i]); } )
//        .attr("cy", function (d, i) { return y(senders[i]); } )
//        .attr("r", 3);


    var circle = spikeTrain.selectAll("circle")
        .data(time);

    console.log("previousLength", previousLenght)
    console.log("eventLength", eventLength)
    
//    circle.exit().remove();//remove unneeded circles

    //update all circles to new positions
    circle.transition()
        .duration(5)
        .attr("cx",function(d,i){
                console.log("move x")
                return x(time[i]);
        })
        .attr("cy",function(d,i){
                return y(senders[i]);
        })
        .attr("r", 3);

    circle.enter().append("circle")
        .attr("cx", function (d, i) {
            console.log("add x")
            return x(time[i]);
        } )
        .attr("cy", function (d, i) {
            return y(senders[i]);
            } )
        .attr("r", 3); //create any new circles needed

    previousLenght = eventLength;

/*
    var x = d3.scale.linear().domain([0, time[time.length - 1]]).range([margin.left, width - margin.right]);
    //var y = d3.scale.linear().domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 10]).range([height - margin.top - margin.bottom, 0]);
    var y = d3.scale.linear().domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 1]).range([height - margin.top - margin.bottom, 0]);
    
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left");

	spikeTrain = d3.select("#spikeTrain")
        .append("svg")
        .attr("width", width)
        .attr("height", height + 5);

    spikeTrain.append("g")
	    .attr("class", "axis")
	    .attr("transform", "translate(0, "+ ( height - margin.top - margin.bottom ) +")")
	    .call(xAxis);
 
	spikeTrain.append("g")
	    .attr("class", "axis")
	    .attr("transform", "translate("+( margin.left )+", 0)")
	    .call(yAxis);

    spikeTrain.append("text")
        .attr("class", "axis")
        .attr("text-anchor", "middle")
        .attr("fill","white")
        .attr("x", width/2)
        .attr("y", height - margin.bottom - 1)
        .text("Time [ms]");


    spikeTrain.append("text")
        .attr("class", "axis")
        .attr("text-anchor", "middle")
        .attr("fill","white")
        .attr("dy", ".75em")
        .attr("transform", "translate( 3, "+ (height - margin.top) / 2 +")rotate(-90)")
        //.attr("x", margin.left-3)
        //.attr("y", (height + margin.bottom) / 2)
        .text("Neuron ID");
*/


    /*spikeTrain.selectAll("line")
        .data(time)
        .enter().append("svg:line")
        //.attr("transform", function (d) { return "translate("+x(d.x)+", "+y(d.y)+")"})
        .attr("x1", function (d, i) { return x(time[i]-0.2); } )
        .attr("y1", function (d, i) { return y(senders[i]-0.2); } )
        .attr("x2", function (d, i) { return x(time[i]+0.2); } )
        .attr("y2", function (d, i) { return y(senders[i]+0.2); } )
        .attr("stroke-width", 2)
        .attr("stroke", "white");*/

    /*spikeTrain.selectAll("line")
        .data(time)
        .enter().append("svg:line")
        //.attr("transform", function (d) { return "translate("+x(d.x)+", "+y(d.y)+")"})
        .attr("x1", function (d, i) { return x(time[i]); } )
        .attr("y1", function (d, i) { return y(senders[i]-5); } )
        .attr("x2", function (d, i) { return x(time[i]); } )
        .attr("y2", function (d, i) { return y(senders[i]+5); } )
        .attr("stroke-width", 2)
        //.attr("stroke", "white");*/

}

function handleMessage2(e)
{
    console.log(e);
    var recordedData = JSON.parse(e.data);
    makeSpikeTrain(recordedData)
    console.log(recordedData);
}