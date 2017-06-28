var margin = {top: 30, right: 75, bottom: 2, left: 75};
var height = 200;
var x;
var y;
var lastTime = 0;
var firstTime = 0;
var lastSpikeTime = 0;


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
            .attr("height", height);

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

        spikeTrain.selectAll("circle").remove();
        spikeTrain.select("#pathId").remove();
    }
}


function makeSpikeTrain(spikeEvents, dt)
{
    var time = spikeEvents.times;
    var senders = spikeEvents.senders;
    //console.log
    //var dt = spikeEvents.dt;

    var maxtime = Math.max.apply(Math, time);

    if( lastSpikeTime != maxtime )
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
    y.domain([Math.min.apply(Math, senders)-10, Math.max.apply(Math, senders)]);

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


function makeVoltmeterPlot(events, dt)
{
    var time = events.times;
    var senders = events.senders;
    var Vm = events.V_m;
    //console.log('senders', senders)
    //console.log('time', time)
    //console.log('Vm', Vm)
    //var dt = spikeEvents.dt;

    var zippedEvents = time.map(function (e, i) {
        return {time: e, Vm: Vm[i]};
    });

    console.log(zippedEvents)


    console.log(Math.min.apply(Math, Vm), Math.max.apply(Math, Vm))

    var maxtime = Math.max.apply(Math, time);

    if( lastSpikeTime != maxtime )
    {
        lastTime = maxtime;
        lastSpikeTime = lastTime;
    }
    else
    {
        lastTime += dt;
    }

    firstTime += dt;

    x.domain([0, lastTime]);
    //y.domain([Math.min.apply(Math, Vm) - 10, Math.max.apply(Math, Vm)]);
    y.domain([d3.min(Vm), d3.max(Vm)]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
    var yAxis = d3.svg.axis().scale(y).orient("left");

    spikeTrain.select(".x.axis").transition().duration(0).call(xAxis);
    spikeTrain.select(".y.axis").transition().duration(0).call(yAxis);


    var line = d3.svg.line()
        //.interpolate("monotone")
        .interpolate("linear")
        .x(function(d) { //console.log("d.times", events.times);
                         //console.log("d", events);
                         return x(d.time); })
        .y(function(d) { return y(d.Vm); });

    // TODO: I think this is a bit of a hack, should figure out a better way to move the lines.
    //spikeTrain.select("#pathId").remove();


    var line2 = spikeTrain.selectAll(".line")
        .data(zippedEvents)
        
    line2.enter().append("path")
        .attr("class", "line")
        .attr("d", line);

    line2.transition()
        .duration(0)
        .attr("class", "line")
        .attr("d", line);
    line2.exit().remove();

//    var path = spikeTrain.selectAll('path')
//        .data(zippedEvents);
    //path.attr('d', line(time))

    //var path = spikeTrain.append("path")
   /* path.attr("d", line(time))
        .attr("stroke", "steelblue")
        .attr("stroke-width", "2")
        .attr("fill", "none");
        //.attr("id", "pathId");*/

//    path.enter().append('path')
//        .attr('d', line(zippedEvents))
//        .style('stroke-width', 2)
//        .style('stroke', 'steelblue');
    //path.exit().remove();
        
//    path.transition()
//        .duration(0)
//        .attr("d", line(zippedEvents));
//    path.exit().remove();

   /* var totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
        .duration(0)
        .ease("linear")
        .attr("stroke-dashoffset", 0);

    spikeTrain.on("click", function(){
      path      
        .transition()
        .duration(0)
        .ease("linear")
        .attr("stroke-dashoffset", totalLength);
      time.shift();
    }) */

/*     .y(function(d, i) { return y(Vm[i]); });

    var path = spikeTrain.selectAll('path').data(time).attr("id", "pathId");
    path.attr('d', line(time))
        //.style('stroke-width', 1)
        //.style('stroke', 'steelblue');
    path.enter().append('path').attr('d', line(time))
        .style('stroke-width', 2)
        .style('stroke', 'steelblue');
    path.exit().remove();
*/

/*    var line = spikeTrain.selectAll("line")
        .data(time);

    line.transition()
        .duration(0)
        .style("stroke", "steelblue")
        .attr("x1",function(d,i){
            //if (i === time.length - 1)
            //{
            //    return;
            //}
            //if( time[i] < firstTime )
            //{
             //   return;
            //}
            return x(time[i]);
        })
        .attr("y1",function(d,i){
            //if( time[i] < firstTime )
            //{
            //    return;
            //}
            console.log(Vm[i], y(Vm[i]))
            return y(Vm[i]);
        })
        .attr("x2",function(d,i){
            if( i === time.length - 1 )
            {
                return;
            }
            return x(time[i + 1]);
        })
        .attr("y2",function(d,i){
            if ( i === Vm.length - 1)
            {
                return;
            }
            console.log(Vm[i + 1], y(Vm[i + 1]))
            return y(Vm[i + 1]);
        });

    line.enter().append("line")
        .style("stroke", "steelblue")
        .attr("x1",function(d,i){
            //if (i === time.length - 1)
            //{
            //    return;
            //}
            //if( time[i] < firstTime )
            //{
             //   return;
            //}

            return x(time[i]);
        })
        .attr("y1",function(d,i){
            //if( time[i] < firstTime )
            //{
            //    return;
            //}
            return y(Vm[i]);
        })
        .attr("x2",function(d,i){
            if( i === time.length - 1 )
            {
                return;
            }
            return x(time[i + 1]);
        })
        .attr("y2",function(d,i){
            if( i === Vm.length - 1 )
            {
                return;
            }
            return y(Vm[i + 1]);
        });

*/

}


//function makeVoltmeterPlot(events, dt)
//{
//    var time = events.times;
//    var senders = events.senders;
//    var Vm = events.V_m;
    //console.log('senders', senders)
    //console.log('time', time)
    //console.log('Vm', Vm)
    //var dt = spikeEvents.dt;

//    console.log(Math.min.apply(Math, Vm), Math.max.apply(Math, Vm))

//    var maxtime = Math.max.apply(Math, time);

//    if( lastSpikeTime != maxtime )
//    {
//        lastTime = maxtime;
//        lastSpikeTime = lastTime;
//    }
//    else
//    {
//        lastTime += dt;
//    }

//    firstTime += dt;

//    x.domain([0, lastTime]);
    //y.domain([Math.min.apply(Math, Vm) - 10, Math.max.apply(Math, Vm)]);
//    y.domain([d3.min(Vm), d3.max(Vm)]);

//    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(10);
//    var yAxis = d3.svg.axis().scale(y).orient("left");

//    spikeTrain.select(".x.axis").transition().duration(0).call(xAxis);
//    spikeTrain.select(".y.axis").transition().duration(0).call(yAxis);


//    var line = d3.svg.line()
        //.interpolate("monotone")
//        .interpolate("linear")
//        .x(function(d, i) { return x(time[i]); })
//        .y(function(d, i) { return y(Vm[i]); });

    // TODO: I think this is a bit of a hack, should figure out a better way to move the lines.
    //spikeTrain.select("#pathId").remove();

//    var path = spikeTrain.selectAll('path')
//        .data(time)
//        .attr("id", "pathId");
    //path.attr('d', line(time))

    //var path = spikeTrain.append("path")
   /* path.attr("d", line(time))
        .attr("stroke", "steelblue")
        .attr("stroke-width", "2")
        .attr("fill", "none");
        //.attr("id", "pathId");*/

//    path.enter().append('path').attr('d', line(time))
//        .style('stroke-width', 2)
//        .style('stroke', 'steelblue');
    //path.exit().remove();
        
//    path.transition()
//        .duration(0)
//        .attr("d", line(time));
//    path.exit().remove();

   /* var totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
        .duration(0)
        .ease("linear")
        .attr("stroke-dashoffset", 0);

    spikeTrain.on("click", function(){
      path      
        .transition()
        .duration(0)
        .ease("linear")
        .attr("stroke-dashoffset", totalLength);
      time.shift();
    }) */

/*     .y(function(d, i) { return y(Vm[i]); });

    var path = spikeTrain.selectAll('path').data(time).attr("id", "pathId");
    path.attr('d', line(time))
        //.style('stroke-width', 1)
        //.style('stroke', 'steelblue');
    path.enter().append('path').attr('d', line(time))
        .style('stroke-width', 2)
        .style('stroke', 'steelblue');
    path.exit().remove();
*/

/*    var line = spikeTrain.selectAll("line")
        .data(time);

    line.transition()
        .duration(0)
        .style("stroke", "steelblue")
        .attr("x1",function(d,i){
            //if (i === time.length - 1)
            //{
            //    return;
            //}
            //if( time[i] < firstTime )
            //{
             //   return;
            //}
            return x(time[i]);
        })
        .attr("y1",function(d,i){
            //if( time[i] < firstTime )
            //{
            //    return;
            //}
            console.log(Vm[i], y(Vm[i]))
            return y(Vm[i]);
        })
        .attr("x2",function(d,i){
            if( i === time.length - 1 )
            {
                return;
            }
            return x(time[i + 1]);
        })
        .attr("y2",function(d,i){
            if ( i === Vm.length - 1)
            {
                return;
            }
            console.log(Vm[i + 1], y(Vm[i + 1]))
            return y(Vm[i + 1]);
        });

    line.enter().append("line")
        .style("stroke", "steelblue")
        .attr("x1",function(d,i){
            //if (i === time.length - 1)
            //{
            //    return;
            //}
            //if( time[i] < firstTime )
            //{
             //   return;
            //}

            return x(time[i]);
        })
        .attr("y1",function(d,i){
            //if( time[i] < firstTime )
            //{
            //    return;
            //}
            return y(Vm[i]);
        })
        .attr("x2",function(d,i){
            if( i === time.length - 1 )
            {
                return;
            }
            return x(time[i + 1]);
        })
        .attr("y2",function(d,i){
            if( i === Vm.length - 1 )
            {
                return;
            }
            return y(Vm[i + 1]);
        });

*/

//}


function getPlotEvents(e)
{
    var deviceData = JSON.parse(e.data);
    if ( deviceData['spike_det']['senders'].length > 1 )
    {
        makeSpikeTrain(deviceData['spike_det'], deviceData['dt']);
        //console.log(deviceData['spike_det'])
    }
    else if ( deviceData['rec_dev']['times'].length > 1 )
    {
        makeVoltmeterPlot(deviceData['rec_dev'], deviceData['dt']);
    }
    //console.log(recordedData);
}