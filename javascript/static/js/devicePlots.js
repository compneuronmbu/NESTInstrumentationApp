/*
* DEVICE PLOTS
*
*/

class DevicePlots {
    constructor()
    {
        this.margin = {top: 30, right: 75, bottom: 2, left: 75};
        this.height = 200;
        this.madePlot = false;
        this.spikeTrain;
        this.membrain;
        this.x;
        this.y;
        this.potY;

        this.lastTime = 1;
        this.firstTime = 1;

        this.VmTime = [];
        this.Vm = [];
    }

    makeDevicePlot()
    {
        var width = container.clientWidth / 2;

        this.x = d3.scale.linear().range([this.margin.left, width - this.margin.right]);
        this.y = d3.scale.linear().domain([0, -70]).range([this.height / 2 - this.margin.top - this.margin.bottom, 0]);
        this.potY = d3.scale.linear().domain([0, -70]).range([this.height / 2 - this.margin.top - this.margin.bottom, 0]);
        
        var xAxis = d3.svg.axis().scale(this.x).orient("bottom").ticks(10);
        var yAxis = d3.svg.axis().scale(this.y).orient("left");
        var yAxisPot = d3.svg.axis().scale(this.y).orient("left");

        if( !this.madePlot)
        {

            var svg = d3.select("#spikeTrain")
                .append("svg")
                .attr("width", width)
                .attr("height", this.height);

            this.spikeTrain = svg.append("g").attr("class", "spikeTrain").attr("transform", "translate(0," + this.height/2 + ")");
            this.membrain = svg.append("g").attr("class", "membrain");

            this.spikeTrain.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0, "+ (this.height / 2 - this.margin.top - this.margin.bottom ) +")")
                .call(xAxis);
         
            this.spikeTrain.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+( this.margin.left )+", 0)")
                .call(yAxis);

            this.spikeTrain.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("x", width/2)
                .attr("y", this.height/2 - this.margin.bottom)
                .text("Time [ms]");

            this.spikeTrain.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("dy", ".75em")
                .attr("transform", "translate( 3, "+ (this.height / 2 - this.margin.top) / 2 +")rotate(-90)")
                .text("Neuron ID");

            this.membrain.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+( this.margin.left )+", 0)")
                .call(yAxisPot);

            this.membrain.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("dy", ".75em")
                .attr("transform", "translate( 3, "+ (this.height / 2 - this.margin.top) / 2 +")rotate(-90)")
                .text("Mem.pot. [mv]");


            this.madePlot = true;
        }
        else
        {
            this.lastTime = 1;
            this.firstTime = 1;

            this.spikeTrain.selectAll("circle").remove();
            this.membrain.selectAll("path.line").remove();

            this.VmTime  = [];
            this.Vm = [];
        }
    }

    makeXAxis(timestamp)
    {
        console.log(this)
        this.lastTime = timestamp;

        this.firstTime = this.lastTime - 50 < 1 ? 1:this.lastTime - 50;

        this.x.domain([this.firstTime, this.lastTime]);
        var xAxis = d3.svg.axis().scale(this.x).orient("bottom").ticks(10);
        this.spikeTrain.select(".x.axis").transition().duration(0).call(xAxis);
    }

    makeSpikeTrain(spikeEvents, timestamp)
    {
        var time = spikeEvents.times;
        var senders = spikeEvents.senders;

        this.makeXAxis(timestamp);

        var toRemove = 0;
        var t;
        for ( t in time )
        {
            if( time[t] >= this.firstTime )
            {
                toRemove = t;
                break
            }
        }

        time = time.slice(toRemove );
        senders = senders.slice(toRemove);

        this.y.domain([Math.min.apply(Math, senders)-10, Math.max.apply(Math, senders)]);
        var yAxis = d3.svg.axis().scale(this.y).orient("left").ticks(5);
        this.spikeTrain.select(".y.axis").transition().duration(0).call(yAxis);

        var circle = this.spikeTrain.selectAll("circle")
            .data(time);

        //update all circles to new positions
        circle.transition()
            .duration(0)
            .attr("cx",(d, i) => {
                return this.x(time[i]);
            })
            .attr("cy",(d, i) => {
                return this.y(senders[i]);
            })
            .attr("r", 3);

        circle.enter().append("circle")
            .attr("cx", (d, i) => {
                return this.x(time[i]);
            } )
            .attr("cy", (d, i) => {
                return this.y(senders[i]);
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

    makeVoltmeterPlot(events, timestamp)
    {
        this.makeXAxis(timestamp);

        // TODO: this can probably be done without loop
        var toRemove = 0;
        var t;
        for ( t in this.VmTime )
        {
            if( this.VmTime[t] >= this.firstTime )
            {
                toRemove = t;
                break
            }
        }

        this.VmTime = this.VmTime.slice(toRemove );
        this.Vm = this.Vm.slice(toRemove);

        this.VmTime.push.apply(this.VmTime, events.times);
        this.Vm.push.apply(this.Vm, events.V_m);

        var no_neurons = events.V_m[0].length;

        console.log("times", this.VmTime)
        console.log("Vm", this.Vm)

        var maxVms = events.V_m.map(function(d) { return d3.max(d)});
        var minVms = events.V_m.map(function(d) { return d3.min(d)});

        var yMin = this.potY.domain()[0];
        var yMax = this.potY.domain()[1];

        console.log("min", d3.min([yMin, d3.min(minVms)]))

        this.potY.domain([d3.min([yMin, d3.min(minVms)]), d3.max([yMax, d3.max(maxVms)])]);
        var yAxis = d3.svg.axis().scale(this.potY).orient("left").ticks(5);
        this.membrain.select(".y.axis").transition().duration(0).call(yAxis);

        var line = d3.svg.line()
            .interpolate("basis")
            .x((d, i) => { return this.x(this.VmTime[i]); })
            .y((d, i) => { 
                if (no_neurons > 1 && d[0] !== undefined)
                {
                    //console.log(d)
                    // return Vm of first neuron
                    return this.potY(d[0]);
                }
                else
                {
                   return this.potY(d);  
                }});

        var path = this.membrain.selectAll('path').data(this.Vm);
      
        path.attr('d', line(this.Vm));
            //.attr('d', (d) => { return line(this.Vm); });
        path.enter().append('path').attr('d', line(this.Vm))
            .classed('line', true)
            //.attr('d', (d) => { return line(this.Vm); })
            .style('stroke-width', 2)
            .style('stroke', 'steelblue');
        path.exit().remove();
    }
}

function getPlotEvents(e)
{
    var deviceData = JSON.parse(e.data);

    if ( deviceData['spike_det']['senders'].length >= 1 )
    {
        devicePlots.makeSpikeTrain(deviceData['spike_det'], deviceData['time']);
    }
    if ( deviceData['rec_dev']['times'].length >= 1 )
    {
        devicePlots.makeVoltmeterPlot(deviceData['rec_dev'], deviceData['time']);
    }
}