/**
* Class for creating graphs from the results of devices. 
*/
class DevicePlots {
    constructor()
    {
        this.margin = {top: 30, right: 75, bottom: 2, left: 75};
        this.height = 200;
        this.lfpMargin = {top: 30, right: 75, bottom: 2, left: 50};

        // The three plots
        this.spikeTrain;
        this.membrane;
        this.lfpPlot;

        // Axis values
        this.x;
        this.y;
        this.potY;
        this.lfpY;
        this.lfpX;

        this.reset();
    }

    /**
    * Reset graph content.
    */
    reset()
    {
        this.lfpDict = {};

        this.lastTime = 1;
        this.firstTime = 1;

        this.spikeTime = [];
        this.senders = [];
        this.VmTime = [];
        this.Vm = [];
        this.lfpTime = [];
        this.lfpVal = {};
    }

    /**
    * Make graph plots of the device output.
    *
    * @param {Object} devices Indicates whether devices exist.
    */
    makeDevicePlot(devices)
    {
        this.madePlot = false;
        d3.selectAll("svg").remove();
        this.reset();
        var width = app.container.clientWidth / 2;

        this.x = d3.scaleLinear().range([this.margin.left, width - this.margin.right]);
        this.y = d3.scaleLinear().domain([0, 1]).range([this.height / 2 - this.margin.top - this.margin.bottom, 0]);
        this.potY = d3.scaleLinear().domain([0, -70]).range([this.height / 2 - this.margin.top - this.margin.bottom, 0]);
        
        var xAxis = d3.axisBottom(this.x).ticks(10);
        var yAxis = d3.axisLeft(this.y).ticks(5);
        var yAxisPot = d3.axisLeft(this.y).ticks(5);

        // Make the framework for the spikeTrain and membrane plots.
        var svg = d3.select("#spikeTrain")
            .append("svg")
            .attr("width", width)
            .attr("height", this.height);

        if ( devices.spike_detector || devices.voltmeter )
        {
            this.spikeTrain = svg.append("g")
                                .attr("class", "spikeTrain")
                                .attr("transform", "translate(0," + this.height/2 + ")");

            this.spikeTrain.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0, "+ (this.height / 2 - this.margin.top - this.margin.bottom ) +")")
                .call(xAxis);

            this.spikeTrain.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("x", width/2)
                .attr("y", this.height/2 - this.margin.bottom)
                .text("Time [ms]");

        }
        if ( devices.spike_detector )
        {
            this.spikeTrain.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+( this.margin.left )+", 0)")
                .call(yAxis);

            this.spikeTrain.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("dy", ".75em")
                .attr("transform", "translate( 3, "+ (this.height / 2 - this.margin.top) / 2 +")rotate(-90)")
                .text("Neuron ID");
        }

        if ( devices.voltmeter )
        {
            let yTranslate = devices.spike_detector ? 0 : this.height / 2;
            this.membrane = svg.append("g")
                .attr("class", "membrane")
                .attr("transform", "translate(0," + yTranslate + ")");

            this.membrane.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+( this.margin.left )+", 0)")
                .call(yAxisPot);

            this.membrane.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("dy", ".75em")
                .attr("transform", "translate( 3, "+ (this.height / 2 - this.margin.top) / 2 +")rotate(-90)")
                .text("Mem.pot. [mv]");
        }

        if( devices.LFP )
        {
            var height = app.container.clientHeight / 2;
            width = app.container.clientWidth / 3;
            this.lfpX = d3.scaleLinear().range([this.lfpMargin.left, width - this.lfpMargin.right]);
            this.lfpY = d3.scaleLinear().domain([16.5, 0.5]).range([height - this.lfpMargin.top - this.lfpMargin.bottom, 0]);
            var xAxisLFP = d3.axisBottom(this.lfpX).ticks(10);
            var yAxisLFP = d3.axisLeft(this.lfpY).ticks(16);

            var LFPsvg = d3.select("#LFPplot")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

            this.lfpPlot = LFPsvg.append("g")
                                .attr("class", "LFPplot")
                                .attr("transform", "translate(0, 0)");
            this.lfpPlot.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0, "+ (height - this.lfpMargin.top - this.lfpMargin.bottom ) +")")
                .call(xAxisLFP);
         
            this.lfpPlot.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+( this.lfpMargin.left )+", 0)")
                .call(yAxisLFP);

            this.lfpPlot.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("x", width/2)
                .attr("y", height - this.lfpMargin.bottom)
                .text("Time [ms]");

            this.lfpPlot.append("text")
                .attr("class", "axis")
                .attr("text-anchor", "middle")
                .attr("fill","white")
                .attr("dy", ".75em")
                .attr("transform", "translate( 3, "+ (height - this.lfpMargin.top) / 2 +")rotate(-90)")
                .text("Channel");

            for ( var i = 16, j = 1 ; i >= 1 ; --i, ++j )
            {
                this.lfpDict[i] = {};
                this.lfpDict[i].axis = d3.scaleLinear().range([height/32,0]);
                yAxis = d3.axisLeft(this.lfpDict[i].axis).tickValues([]).tickSizeOuter(0);

                this.lfpDict[i].graph = LFPsvg.append("g")
                    .attr("class", "LFPplot")
                    .attr("transform", "translate(0, "+ (height - (j+1)*height/17 ) +")");
                this.lfpDict[i].graph.append("g")
                    .attr("class", "y axis")
                    .attr("transform", "translate("+( this.lfpMargin.left )+", 0)")
                    .call(yAxis);

                this.lfpVal[i] = [];
            }
        } // app.isLFP
    }

    /**
    * Make the x-axis in the plot.
    *
    * @param {Number} timestamp The time of the device data.
    */
    makeXAxis(timestamp)
    {
        if ( this.spikeTrain === undefined )
        {
            return;
        }
        // Make the shared x-axis for both plots.

        this.lastTime = timestamp;
        this.firstTime = this.lastTime - 70 < 1 ? 1:this.lastTime - 50;

        this.x.domain([this.firstTime, this.lastTime]);
        var xAxis = d3.axisBottom(this.x).ticks(10);

        // The x-axis is attached to the plot on the bottom, the spike train.
        this.spikeTrain.select(".x.axis").transition().duration(0).call(xAxis);
    }

    /**
    * Make spike train plot.
    *
    * @param {Object} spikeEvents Contains times and senders of the spike events.
    * @param {Number} timestamp The time of the device data.
    */
    makeSpikeTrain(spikeEvents, timestamp)
    {
        this.makeXAxis(timestamp);

        var toRemove = 0;
        var t;
        for ( t in this.spikeTime )
        {
            if( this.spikeTime[t] >= this.firstTime )
            {
                toRemove = t;
                break;
            }
        }

        // Remove values that are outside of axis domain
        this.spikeTime = this.spikeTime.slice(toRemove );
        this.senders = this.senders.slice(toRemove);

        // Add the newly simulated events.
        this.spikeTime.push.apply(this.spikeTime, spikeEvents.times);
        this.senders.push.apply(this.senders, spikeEvents.senders);

        // Update y-axis in case new senders have started spiking
        this.y.domain([Math.min.apply(Math, this.senders)-10, Math.max.apply(Math, this.senders)]);
        var yAxis = d3.axisLeft(this.y).ticks(5);
        this.spikeTrain.select(".y.axis").transition().duration(0).call(yAxis);

        // The spike events are given as circles.
        var circle = this.spikeTrain.selectAll("circle")
            .data(this.spikeTime);

        // Update all circles to new positions. 
        // Circles are given by centre x-position, centre y-position and radius of the circle.
        circle.transition()
            .duration(0)
            .attr("cx",(d, i) => {
                return this.x(this.spikeTime[i]);
            })
            .attr("cy",(d, i) => {
                return this.y(this.senders[i]);
            })
            .attr("r", 3);

        // Create any new circles needed
        circle.enter().append("circle")
            .attr("cx", (d, i) => {
                return this.x(this.spikeTime[i]);
            } )
            .attr("cy", (d, i) => {
                return this.y(this.senders[i]);
                } )
            .attr("r", 3);
        circle.exit().remove(); // Remove unneeded circles
    }

    /**
    * Make membrane potential plot.
    *
    * @param {Object} events Contains events of the voltmeter.
    * @param {Number} timestamp The time of the device data.
    */
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
                break;
            }
        }

        // Remove values that are outside of axis domain
        this.VmTime = this.VmTime.slice(toRemove);
        this.Vm = this.Vm.slice(toRemove);

        // Add the newly simulated events.
        this.VmTime.push.apply(this.VmTime, events.times);
        this.Vm.push.apply(this.Vm, events.V_m);

        var no_neurons = events.V_m[0].length;

        // Update y-axis to handle changing membrane potential.
        var maxVms = events.V_m.map(function(d) { return d3.max(d);});
        var minVms = events.V_m.map(function(d) { return d3.min(d);});

        var yMin = this.potY.domain()[0];
        var yMax = this.potY.domain()[1];

        this.potY.domain([d3.min([yMin, d3.min(minVms)]), d3.max([yMax, d3.max(maxVms)])]);
        var yAxis = d3.axisLeft(this.potY).ticks(5);
        this.membrane.select(".y.axis").transition().duration(0).call(yAxis);

        // The potential is plotted using line and path. Line needs the x and y positions to each point,
        // and path goes through all data makes a path with all the lines.
        // NB! We only plot the membrane potential of the first neuron in the selection!!
        var line = d3.line()
            .x((d, i) => { return this.x(this.VmTime[i]); })
            .y((d, i) => { 
                if (no_neurons > 1 && d[0] !== undefined)
                {
                    // NB! This returns only Vm of first neuron
                    return this.potY(d[0]);
                }
                else
                {
                   return this.potY(d);  
                }});

        var path = this.membrane.selectAll('path').data(this.Vm);
      
        path.attr('d', line(this.Vm));
        path.enter().append('path').attr('d', line(this.Vm))
            .classed('line', true)
            .style('stroke-width', 2)
            .style('stroke', 'steelblue');
        path.exit().remove();
    }

    makeLFPPlot(events)
    {
        if ( d3.select('#LFPplot').select('svg').empty() )
        {
            return;
        }

        this.lfpTime.push.apply(this.lfpTime, events.times);
        if ( this.lfpTime.length > 100 )
        {
            // We remove all times at beginning of our lfpTime, up to the
            // length of the array of times coming in.
            this.lfpTime = this.lfpTime.slice(events['times'].length);
        }

        this.lfpX.domain([this.lfpTime[0], this.lfpTime[this.lfpTime.length - 1]]);
        var xAxis = d3.axisBottom(this.lfpX).ticks(10);

        this.lfpPlot.select(".x.axis").transition().duration(0).call(xAxis);

        var min_lfp;
        var max_lfp;
        var ev;
        var updated_lfp;

        for ( var i = 1 ; i <= 16 ; ++i )
        {
            ev = events[i-1];
            updated_lfp = ev.lfp;
            this.lfpVal[i].push.apply(this.lfpVal[i], updated_lfp);
            if ( this.lfpVal[i].length > 100 )
            {
                this.lfpVal[i] = this.lfpVal[i].slice(updated_lfp.length);
            }

            min_lfp = d3.min(this.lfpVal[i]);
            max_lfp = d3.max(this.lfpVal[i]);

            this.lfpDict[i].axis.domain([min_lfp, max_lfp]);
            var yAxis = d3.axisLeft(this.lfpDict[i].axis).tickValues([]).tickSizeOuter(0);
            this.lfpDict[i].graph.select(".y.axis").transition().duration(0).call(yAxis);

            var line = d3.line()
                .x((d, j) => { return this.lfpX(this.lfpTime[j]); })
                .y((d, j) => { return this.lfpDict[i].axis(this.lfpVal[i][j]); });

            var path = this.lfpDict[i].graph.selectAll('path').data(this.lfpVal[i]);

            path.attr('d', line(this.lfpVal[i]));
            path.enter().append('path').attr('d', line(this.lfpVal[i]))
                .classed('line', true)
                .style('stroke-width', 2)
                .style('stroke', 'steelblue');
            path.exit().remove();
        }
    }
}


// Try exporting DevicePlots for testing
try
{
    module.exports = DevicePlots;
}
catch(err)
{
}
