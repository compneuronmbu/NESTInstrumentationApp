/**
* Class for creating graphs from the results of devices. 
*/
class DevicePlots {
    constructor()
    {
        this.margin = {top: 30, right: 75, bottom: 2, left: 75};
        this.height = 200;
        this.lfpMargin = {top: 30, right: 75, bottom: 2, left: 50};

        this.madePlot = false;

        // The two plots
        this.spikeTrain;
        this.membrane;
        this.lfpPlot;

        // Axis values
        this.x;
        this.y;
        this.potY;
        this.lfpY;
        this.lfpX;
        this.yTest;
        this.tester;

        this.lfpDict = {};

        this.lastTime = 1;
        this.firstTime = 1;

        this.spikeTime = [];
        this.senders = [];
        this.VmTime = [];
        this.Vm = [];
        this.lfp = [];
        this.lfpTime = [];
    }

    /**
    * Make graph plots of the device output.
    */
    makeDevicePlot()
    {
        var width = app.container.clientWidth / 2;

        this.x = d3.scaleLinear().range([this.margin.left, width - this.margin.right]);
        this.y = d3.scaleLinear().domain([0, -70]).range([this.height / 2 - this.margin.top - this.margin.bottom, 0]);
        this.potY = d3.scaleLinear().domain([0, -70]).range([this.height / 2 - this.margin.top - this.margin.bottom, 0]);
        
        var xAxis = d3.axisBottom(this.x).ticks(10);
        var yAxis = d3.axisLeft(this.y).ticks(5);
        var yAxisPot = d3.axisLeft(this.y).ticks(5);

        if( !this.madePlot )
        {
            // Make the framework for the spikeTrain and membrane plots.
            var svg = d3.select("#spikeTrain")
                .append("svg")
                .attr("width", width)
                .attr("height", this.height);

            this.spikeTrain = svg.append("g")
                                .attr("class", "spikeTrain")
                                .attr("transform", "translate(0," + this.height/2 + ")");
            this.membrane = svg.append("g").attr("class", "membrane");

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

            if( app.isLFP )
            {
                var height = app.container.clientHeight / 2;
                width = app.container.clientWidth / 3;
                this.lfpX = d3.scaleLinear().range([this.lfpMargin.left, width - this.lfpMargin.right]);
                this.lfpY = d3.scaleLinear().domain([0.5, 16.5]).range([height - this.lfpMargin.top - this.lfpMargin.bottom, 0]);
                var xAxisLFP = d3.axisBottom(this.lfpX).ticks(10);
                var yAxisLFP = d3.axisLeft(this.lfpY).ticks(16);

                var LFGsvg = d3.select("#LFPplot")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

                this.lfpPlot = LFGsvg.append("g")
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

                for ( var i = 1 ; i <= 16 ; ++i )
                {
                    this.lfpDict[i] = {};
                    this.lfpDict[i]['axis'] = d3.scaleLinear().range([height/32,0]);
                    var yAxis = d3.axisLeft(this.lfpDict[i]['axis']).tickValues([]).tickSizeOuter(0);


                    this.lfpDict[i]['graph'] = LFGsvg.append("g")
                        .attr("class", "LFPplot")
                        .attr("transform", "translate(0, "+ (height - (i+1)*height/17 ) +")");
                    this.lfpDict[i]['graph'].append("g")
                        .attr("class", "y axis")
                        .attr("transform", "translate("+( this.lfpMargin.left )+", 0)")
                        .call(yAxis);
                }

                this.makeLFPPlot();
            }

            this.madePlot = true;
        }
        else
        {
            // Have to reset these values in case we press stream button again. We don't want to remake the framework,
            // just remove the old data.
            this.lastTime = 1;
            this.firstTime = 1;

            this.spikeTrain.selectAll("circle").remove();
            this.membrane.selectAll("path.line").remove();

            this.spikeTime = [];
            this.senders = [];
            this.VmTime  = [];
            this.Vm = [];
        }
    }

    /**
    * Make the x-axis in the plot.
    *
    * @param {Number} timestamp The time of the device data.
    */
    makeXAxis(timestamp)
    {
        // Make the shared x-axis for both plots.

        this.lastTime = timestamp;
        this.firstTime = this.lastTime - 70 < 1 ? 1:this.lastTime - 50;

        this.x.domain([this.firstTime, this.lastTime]);
        var xAxis = d3.axisBottom(this.x).ticks(10);

        // The x-axis is attached to the plot on the bottom, the spike train.
        this.spikeTrain.select(".x.axis").transition().duration(0).call(xAxis);
        if( app.isLFP )
        {
            this.lfpPlot.select(".x.axis").transition().duration(0).call(xAxis);
        }
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
                break
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
                break
            }
        }

        // Remove values that are outside of axis domain
        this.VmTime = this.VmTime.slice(toRemove );
        this.Vm = this.Vm.slice(toRemove);

        // Add the newly simulated events.
        this.VmTime.push.apply(this.VmTime, events.times);
        this.Vm.push.apply(this.Vm, events.V_m);

        var no_neurons = events.V_m[0].length;

        // Update y-axis to handle changing membrane potential.
        var maxVms = events.V_m.map(function(d) { return d3.max(d)});
        var minVms = events.V_m.map(function(d) { return d3.min(d)});

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

    makeLFPPlot()
    {
        var time = [801.0, 802.0, 803.0, 804.0, 805.0, 806.0, 807.0, 808.0, 809.0, 810.0, 811.0, 812.0, 813.0, 814.0, 815.0, 816.0, 817.0, 818.0, 819.0, 820.0, 821.0, 822.0, 823.0, 824.0, 825.0, 826.0, 827.0, 828.0, 829.0, 830.0, 831.0, 832.0, 833.0, 834.0, 835.0, 836.0, 837.0, 838.0, 839.0, 840.0, 841.0, 842.0, 843.0, 844.0, 845.0, 846.0, 847.0, 848.0, 849.0, 850.0, 851.0, 852.0, 853.0, 854.0, 855.0, 856.0, 857.0, 858.0, 859.0, 860.0, 861.0, 862.0, 863.0, 864.0, 865.0, 866.0, 867.0, 868.0, 869.0, 870.0, 871.0, 872.0, 873.0, 874.0, 875.0, 876.0, 877.0, 878.0, 879.0, 880.0, 881.0, 882.0, 883.0, 884.0, 885.0, 886.0, 887.0, 888.0, 889.0, 890.0, 891.0, 892.0, 893.0, 894.0, 895.0, 896.0, 897.0, 898.0, 899.0, 900.0, 901.0, 902.0, 903.0, 904.0, 905.0, 906.0, 907.0, 908.0, 909.0, 910.0, 911.0, 912.0, 913.0, 914.0, 915.0, 916.0, 917.0, 918.0, 919.0, 920.0, 921.0, 922.0, 923.0, 924.0, 925.0, 926.0, 927.0, 928.0, 929.0, 930.0, 931.0, 932.0, 933.0, 934.0, 935.0, 936.0, 937.0, 938.0, 939.0, 940.0, 941.0, 942.0, 943.0, 944.0, 945.0, 946.0, 947.0, 948.0, 949.0, 950.0, 951.0, 952.0, 953.0, 954.0, 955.0, 956.0, 957.0, 958.0, 959.0, 960.0, 961.0, 962.0, 963.0, 964.0, 965.0, 966.0, 967.0, 968.0, 969.0, 970.0, 971.0, 972.0, 973.0, 974.0, 975.0, 976.0, 977.0, 978.0, 979.0, 980.0, 981.0, 982.0, 983.0, 984.0, 985.0, 986.0, 987.0, 988.0, 989.0, 990.0, 991.0, 992.0, 993.0, 994.0, 995.0, 996.0, 997.0, 998.0, 999.0]
        var lfp_er = [-0.043758537642205483, -0.041515316749219537, -0.042869406258922792, -0.041367133971543388, -0.042239601408020362, -0.040136666942662921, -0.040668258270731818, -0.039741971997686032, -0.034772947331540974, -0.029625945795507352, -0.025684255321083614, -0.031181701975292544, -0.035464629973634018, -0.037030883117634729, -0.034194240978880255, -0.037091425756048221, -0.04016644095854429, -0.039912891538221341, -0.037943603215804707, -0.038113611370097389, -0.037490336771588514, -0.036170868029733384, -0.033823285770739092, -0.033016070859063142, -0.03476561114752863, -0.031146784687946717, -0.027337829831349709, -0.026676044738867696, -0.033543292383743206, -0.036417759187080775, -0.035586320461161947, -0.039428328524420256, -0.045785401147845246, -0.045202674788945539, -0.042638704585229885, -0.037455324896527482, -0.036344054546192529, -0.033675534553683002, -0.032924947595175724, -0.035719459117280895, -0.034006618123588329, -0.031982097128359234, -0.035551746694848903, -0.043787859448642656, -0.047687148144444545, -0.046630858261982419, -0.043010360747826736, -0.037807098414914433, -0.040655345161478555, -0.044365115628284033, -0.042233104828252259, -0.036869918481082738, -0.035184419762329118, -0.033647127500571306, -0.031779206430743098, -0.033181573465566175, -0.03779654781609542, -0.040430304072503497, -0.036267401025227769, -0.037666463106240895, -0.040488929111290678, -0.039113841907047676, -0.0426621793874968, -0.044982115844496656, -0.043810067672866826, -0.037161462493060377, -0.038287853911795497, -0.043576098345944503, -0.041975460106765769, -0.037036161676626503, -0.034660239478911753, -0.035168710133241653, -0.033519816822368105, -0.03844999300187104, -0.039227473071115251, -0.037000673306075524, -0.033812174552135865, -0.029135963933332037, -0.028113241088495153, -0.034398226487744682, -0.04009880014128378, -0.03663252877307388, -0.035581296167174745, -0.038096039370654158, -0.045729853782772417, -0.051890334556520742, -0.04809493694278108, -0.041303949967034861, -0.037230332652784373, -0.035932711370470431, -0.037192931970707221, -0.035830179129041149, -0.03405702110619642, -0.034713069225105524, -0.038563474008038577, -0.03588224729940151, -0.032832494774915164, -0.031063160369117764, -0.02917065904258229, -0.025746861958325453, -0.025321462989514341, -0.029689249446382265, -0.045999616473690871, -0.055787252207238167, -0.057529912778437997, -0.055642947817888609, -0.053988699801385903, -0.048043466270009563, -0.040810354024003709, -0.035719879427156494, -0.033885594355545071, -0.031546447685345314, -0.036370419647867545, -0.044345749966333489, -0.040669698376907815, -0.034540997093050953, -0.031176966877812476, -0.029435769078399347, -0.028987790056121995, -0.030126748773833759, -0.028539668421637906, -0.026876848903627404, -0.029617901209913228, -0.03800035299451468, -0.04327874116009213, -0.042430960123169638, -0.039875208735728147, -0.035774630716668684, -0.037663640211602144, -0.04046309177086773, -0.04815958987035926, -0.047768973680984324, -0.040813595593713031, -0.034754072944450556, -0.035016804017842011, -0.032999216096569625, -0.02930764158905784, -0.02771365737727776, -0.031949037820732017, -0.03120502470381133, -0.032722454974146872, -0.036433756272322183, -0.040893711688588845, -0.045397350861038417, -0.043081878699825625, -0.041098863361390771, -0.041430044904425742, -0.036994280743825485, -0.032406430458950017, -0.033362081694231736, -0.034983288817918276, -0.036443991113506546, -0.03931682472967056, -0.038559390762920732, -0.034134222389804104, -0.032643081500969333, -0.03360647773305981, -0.04130665737979914, -0.049514843974135685, -0.052401450682652638, -0.058174232779223393, -0.054711612907939224, -0.051203059524383462, -0.043932328393620039, -0.036008179238545254, -0.029094309750832013, -0.025504977281990891, -0.025823502485316615, -0.027798929488536482, -0.033454315332806454, -0.039732464023936903, -0.046155737301108016, -0.051800240046058439, -0.051964708615537848, -0.047404023833359329, -0.041118616657832355, -0.033910006730183746, -0.031390892282008566, -0.032278641765640867, -0.029530986771278887, -0.027958016836727884, -0.026681029280152549, -0.034503985468025057, -0.039940566760076228, -0.042736876242484657, -0.052360551237978954, -0.056202055085184888, -0.058669170912044585, -0.054726253565678541, -0.046537512253683605, -0.037415438533829289, -0.033482439532217065, -0.030806125259035359, -0.034148046906428024, -0.035034850874124203, -0.03366469748215193, -0.032832260232808337, -0.039894398354274663, -0.042566767325227385]

        this.lfpX.domain([800, 1000]);
        var xAxis = d3.axisBottom(this.lfpX).ticks(15);

        this.lfpPlot.select(".x.axis").transition().duration(0).call(xAxis);

        var min_lfp = d3.min(lfp_er);
        var max_lfp = d3.max(lfp_er);

        for ( var i = 1 ; i <= 16 ; ++i )
        {
            this.lfpDict[i]['axis'].domain([min_lfp, max_lfp]);
            var yAxis = d3.axisLeft(this.lfpDict[i]['axis']).tickValues([]).tickSizeOuter(0);
            this.lfpDict[i]['graph'].select(".y.axis").transition().duration(0).call(yAxis);

            var line = d3.line()
                .x((d, j) => { return this.lfpX(time[j]); })
                .y((d, j) => { return this.lfpDict[i]['axis'](lfp_er[j]); });

            var path = this.lfpDict[i]['graph'].selectAll('path').data(lfp_er);
          
            path.attr('d', line(lfp_er));
            path.enter().append('path').attr('d', line(lfp_er))
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
