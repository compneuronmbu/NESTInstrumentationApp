/*
* DEVICE PLOTS
* TODO: Make into class
*
*/

var margin = {top: 30, right: 75, bottom: 2, left: 75};
var height = 200;
var madePlot = false;
var spikeTrain;
var membrain;
var x;
var y;
var potY;

var lastTime = 1;
var firstTime = 1;

var VmTime = [];
var Vm = [];


function makeDevicePlot()
{
    var width = container.clientWidth / 2;

    x = d3.scale.linear().range([margin.left, width - margin.right]);
    y = d3.scale.linear().domain([0, -70]).range([height / 2 - margin.top - margin.bottom, 0]);
    potY = d3.scale.linear().domain([0, -70]).range([height / 2 - margin.top - margin.bottom, 0]);
    
    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
    var yAxis = d3.svg.axis().scale(y).orient("left");
    var yAxisPot = d3.svg.axis().scale(y).orient("left");

    if( !madePlot)
    {

        var svg = d3.select("#spikeTrain")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        spikeTrain = svg.append("g").attr("class", "spikeTrain").attr("transform", "translate(0," + height/2 + ")");
        membrain = svg.append("g").attr("class", "membrain");

        spikeTrain.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, "+ ( height / 2 - margin.top - margin.bottom ) +")")
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
            .attr("y", height/2 - margin.bottom)
            .text("Time [ms]");

        spikeTrain.append("text")
            .attr("class", "axis")
            .attr("text-anchor", "middle")
            .attr("fill","white")
            .attr("dy", ".75em")
            .attr("transform", "translate( 3, "+ (height / 2 - margin.top) / 2 +")rotate(-90)")
            .text("Neuron ID");

        membrain.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate("+( margin.left )+", 0)")
            .call(yAxisPot);

        membrain.append("text")
            .attr("class", "axis")
            .attr("text-anchor", "middle")
            .attr("fill","white")
            .attr("dy", ".75em")
            .attr("transform", "translate( 3, "+ (height / 2 - margin.top) / 2 +")rotate(-90)")
            .text("Mem.pot. [mv]");


        madePlot = true;
    }
    else
    {
        lastTime = 1;
        firstTime = 1;

        spikeTrain.selectAll("circle").remove();
        membrain.select("#pathId").remove();

        VmTime  = [];
        Vm = [];
    }
}

function makeXAxis(timestamp)
{
    lastTime = timestamp;

    firstTime = lastTime - 50 < 1 ? 1:lastTime - 50;

    x.domain([firstTime, lastTime]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
    spikeTrain.select(".x.axis").transition().duration(0).call(xAxis);
}


function makeSpikeTrain(spikeEvents, timestamp)
{
    var time = spikeEvents.times;
    var senders = spikeEvents.senders;

    makeXAxis(timestamp);

    var toRemove = 0;
    for ( t in time )
    {
        if( time[t] >= firstTime )
        {
            toRemove = t;
            break
        }
    }

    time = time.slice(toRemove );
    senders = senders.slice(toRemove);

    y.domain([Math.min.apply(Math, senders)-10, Math.max.apply(Math, senders)]);
    var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);
    spikeTrain.select(".y.axis").transition().duration(0).call(yAxis);

    var circle = spikeTrain.selectAll("circle")
        .data(time);

    //update all circles to new positions
    circle.transition()
        .duration(0)
        .attr("cx",function(d,i){
            return x(time[i]);
        })
        .attr("cy",function(d,i){
            return y(senders[i]);
        })
        .attr("r", 3);

    circle.enter().append("circle")
        .attr("cx", function (d, i) {
            return x(time[i]);
        } )
        .attr("cy", function (d, i) {
            return y(senders[i]);
            } )
        .attr("r", 3); //create any new circles needed
    circle.exit().remove();//remove unneeded circles

    // TODO: Make into lines:
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

function makeVoltmeterPlot(events, timestamp)
{
    makeXAxis(timestamp);

    // TODO: this can probably be done without loop
    var toRemove = 0;
    for ( t in VmTime )
    {
        if( VmTime[t] >= firstTime )
        {
            toRemove = t;
            break
        }
    }

    VmTime = VmTime.slice(toRemove );
    Vm = Vm.slice(toRemove);

    VmTime.push.apply(VmTime, events.times);
    Vm.push.apply(Vm, events.V_m);

    var no_neurons = events.V_m[0].length;

    console.log("times", VmTime)
    console.log("Vm", Vm)

    var maxVms = events.V_m.map(function(d) { return d3.max(d)});
    var minVms = events.V_m.map(function(d) { return d3.min(d)});

    var yMin = potY.domain()[0];
    var yMax = potY.domain()[1];

    potY.domain([d3.min([yMin, d3.min(minVms)]), d3.max([yMax, d3.max(maxVms)])]);
    var yAxis = d3.svg.axis().scale(potY).orient("left").ticks(5);
    membrain.select(".y.axis").transition().duration(0).call(yAxis);

    var line = d3.svg.line()
        .interpolate("basis")
        .x(function(d, i) { return x(VmTime[i]); })
        .y(function(d, i) { 
            if (no_neurons > 1 && d[0] !== undefined)
            {
                //console.log(d)
                // return Vm of first neuron
                return potY(d[0]);
            }
            else
            {
               return potY(d);  
            }});

    var path = membrain.selectAll('path').data(Vm).attr("id", "pathId");
  
    path.attr('d', line)
        .attr("d", function(d) { return line(Vm); });
    path.enter().append('path').attr('d', line)
        .attr("d", function(d) { return line(Vm); })
        .style('stroke-width', 2)
        .style('stroke', 'steelblue');
    path.exit().remove();
}

function getPlotEvents(e)
{
    var deviceData = JSON.parse(e.data);

    if ( deviceData['spike_det']['senders'].length >= 1 )
    {
        makeSpikeTrain(deviceData['spike_det'], deviceData['time']);
    }
    if ( deviceData['rec_dev']['times'].length >= 1 )
    {
        return makeVoltmeterPlot(deviceData['rec_dev'], deviceData['time']);
    }
}