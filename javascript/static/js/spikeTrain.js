var margin = {top: 30, right: 75, bottom: 2, left: 75};
var height = 200;
var x;
var y;
var lastTime = 0;
var firstTime = 0;
var lastSpikeTime = 0;
var firstSpikeEvent = true;


function makeDevicePlot()
{
    var width = container.clientWidth / 2;

    x = d3.scale.linear().range([margin.left, width - margin.right]);
    y = d3.scale.linear().range([height - margin.top - margin.bottom, 0]);
    
    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
    var yAxis = d3.svg.axis().scale(y).orient("left");

    if( !madePlot)
    {
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
        madePlot = true;
    }
    else
    {
        lastTime = 0;
        firstTime = 0;
        lastSpikeTime = 0;
        firstSpikeEvent = true;

        spikeTrain.selectAll("circle").remove();
    }
}


function makeSpikeTrain(spikeEvents)
{
    var time = spikeEvents.times;
    var senders = spikeEvents.senders;
    var dt = spikeEvents.dt;

    var maxtime = Math.max.apply(Math, time);

    if( firstSpikeEvent )
    {
        lastTime = maxtime;
        firstSpikeEvent = false;
    }
    else if( lastSpikeTime != maxtime )
    {
        lastTime = maxtime;
        lastSpikeTime = lastTime;
    }
    else
    {
        lastTime += dt;
    }

    firstTime += dt;

    x.domain([firstTime, lastTime]);
    y.domain([Math.min.apply(Math, senders) - 1, Math.max.apply(Math, senders) + 10]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
    var yAxis = d3.svg.axis().scale(y).orient("left");

    spikeTrain.select(".x.axis").transition().duration(5).call(xAxis);
    spikeTrain.select(".y.axis").transition().duration(5).call(yAxis);

    var circle = spikeTrain.selectAll("circle")
        .data(time);
    
    //circle.exit().remove();//remove unneeded circles

    //update all circles to new positions
    circle.transition()
        .duration(0)
        .attr("cx",function(d,i){
            if( time[i] < firstTime )
            {
                return;
            }
            return x(time[i]);
        })
        .attr("cy",function(d,i){
            if( time[i] < firstTime )
            {
                return;
            }
            return y(senders[i]);
        })
        .attr("r", 3);

    circle.enter().append("circle")
        .attr("cx", function (d, i) {
            if( time[i] < firstTime )
            {
                return;
            }
            return x(time[i]);
        } )
        .attr("cy", function (d, i) {
            if( time[i] < firstTime )
            {
                return;
            }
            return y(senders[i]);
            } )
        .attr("r", 3); //create any new circles needed

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

function getPlotEvents(e)
{
    var recordedData = JSON.parse(e.data);
    makeSpikeTrain(recordedData)
    //console.log(recordedData);
}