nv.models.GranGraph1 = function(xLimit) {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var //xshift = 0,
        margin = {top: 30, right: 50, bottom: 50, left: 50}, //added change left from 70 + shifted on marker2
        marginTop = null,
        color = nv.utils.defaultColor(),
        width = null,
        height = null,
        showLegend = true,
        noData = null,
        yDomain1=[0,100],  //to be fixed bookmark
        getX = function(d) { return d.x },
        getY = function(d) { return d.y},
        interpolate = 'monotone', // added
        useVoronoi = true,
        interactiveLayer = nv.interactiveGuideline(),
        useInteractiveGuideline = false,
        duration = 250,
        dataSetLength = 0,
        initialState = []
    ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var x = d3.scale.linear(),
        yScale1 = d3.scale.linear(),

        lines1 = nv.models.line().yScale(yScale1).duration(duration),
        bars1 = nv.models.multiBar().stacked(false).yScale(yScale1).duration(duration), //added historicalBar().yScale(yScale1),

        xAxis = nv.models.axis().scale(x).orient('bottom').tickPadding(5).duration(duration),
        yAxis1 = nv.models.axis().scale(yScale1).orient('left').tickPadding(5).duration(duration), //added

        legend = nv.models.legend().height(30),
        tooltip = nv.models.tooltip(),
        dispatch = d3.dispatch(); //d3.dispatch(); //teste1 'brush', 'stateChange', 'changeState'

    var charts = [lines1, bars1];


    function chart(selection) {
        selection.each(function(data) {

            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);

            chart.update = function() { container.transition().call(chart); };
            chart.container = this;
            chart.color(d3.scale.category10().range());
            chart.yAxis1.axisLabel('Sample frequency (%)');
            chart.yAxis1.axisLabelDistance(-20); //added
            chart.xAxis.axisLabel('Phy');


            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            var dataLines1 = data.filter(function(d) {return d.type == 'line'});
            var dataBars1 =  data.filter(function(d) {return d.type == 'bar' });

            // Display noData message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            var series1 = data.filter(function(d) {return !d.disabled})
                .map(function(d) {
                    return d.values.map(function(d,i) {
                        return { x: getX(d), y: getY(d) }
                    })
                });
            /*x   .domain(d3.extent(d3.merge(series1), function(d) { return d.x })) // bookmark valores no eixo do x
                .range([-xshift, availableWidth -xshift]); // marker2 shift on x axis added*/

            //var xLimit = 10;
            var auxdomain = [];

            for (var i = -xLimit, counter = 0; i < xLimit; i++,counter++) {
                auxdomain[counter]=i;
                counter++;
                auxdomain[counter]=i+0.5;

            }

            x   .domain(auxdomain)  //([-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9]) // bookmark valores no eixo do x ->([-10, 10]);//
                .range([0, availableWidth]);
            bars1.xDomain(x.domain()); //bookmark if domain is changed

            x   .domain([-xLimit+0.25,xLimit+0.25]) // bookmark valores no eixo do x ->([-10, 10])//
            lines1.xDomain(x.domain());
            x   .domain([-xLimit,xLimit])
            //lines1.xRange([xAxis.rangeBand, availableWidth + xAxis.rangeBand]);

            var wrap = container.selectAll('g.wrap.multiChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'wrap nvd3 multiChart').append('g');

            gEnter.append('g').attr('class', 'nv-x nv-axis');
            gEnter.append('g').attr('class', 'nv-y1 nv-axis');
            gEnter.append('g').attr('class', 'bars1Wrap');
            gEnter.append('g').attr('class', 'lines1Wrap');
            gEnter.append('g').attr('class', 'legendWrap');
            gEnter.append('g').attr('class', 'nv-interactive');

            var g = wrap.select('g');

            var color_array = data.map(function(d,i) {
                return data[i].color || color(d, i);
            });

            // Legend
            if (!showLegend) {
                g.select('.legendWrap').selectAll('*').remove();
            } else {
                var legendWidth = legend.align() ? availableWidth / 2 : availableWidth;
                var legendXPosition = legend.align() ? legendWidth : 0;

                legend.width(legendWidth);
                legend.color(color_array);

                g.select('.legendWrap')
                    .datum(data.map(function(series) {
                        series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
                        series.key = series.originalKey;
                        return series;
                    }))
                    .call(legend);

                if (!marginTop && legend.height() !== margin.top) {
                    margin.top = legend.height();
                    availableHeight = nv.utils.availableHeight(height, container, margin);
                }

                g.select('.legendWrap')
                    .attr('transform', 'translate(' + legendXPosition + ',' + (-margin.top) +')');
            }

            lines1
                .width(availableWidth)
                .height(availableHeight)
                .interpolate(interpolate)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].type == 'line'}));
            bars1
                .width(availableWidth)
                .height(availableHeight)
                .groupSpacing(0) //added, bookmark for adjustment bar width
                //.xScale.rangeRoundBands([0, availableWidth],0.1,0.5)
                .color(color_array.filter(function(d,i) { return !data[i].disabled && data[i].type == 'bar'}));

            g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            var translation = availableWidth/(2*xLimit); //lines1.xScale.rangeBands(); bookmark
            var lines1Wrap = g.select('.lines1Wrap')
                .datum(dataLines1.filter(function(d){return !d.disabled}))
                .attr("transform", "translate(" + (translation/2) + ")");        //book mark line translation
            var bars1Wrap = g.select('.bars1Wrap')
                .datum(dataBars1.filter(function(d){return !d.disabled}));


            var extraValue1 = [];

            yScale1 .domain(yDomain1 || d3.extent(d3.merge(series1).concat(extraValue1), function(d) { return d.y } ))
                .range([0, availableHeight]);

            lines1.yDomain(yScale1.domain());
            bars1.yDomain(yScale1.domain());


            if(dataBars1.length){d3.transition(bars1Wrap).call(bars1);}

            if(dataLines1.length){d3.transition(lines1Wrap).call(lines1);}

            xAxis
                ._ticks(2* xLimit)  //( nv.utils.calcTicksX(availableWidth/10, data) ) //added (21)
                .tickSize(-availableHeight, 0)

            //.showMaxMin=false; //added

            g.select('.nv-x.nv-axis')
                .attr('transform', 'translate(0,' + availableHeight + ')');
            d3.transition(g.select('.nv-x.nv-axis'))
                .call(xAxis);

            yAxis1
                ._ticks( nv.utils.calcTicksY(availableHeight/36, data) )
                .tickSize( -availableWidth, 0);

            d3.transition(g.select('.nv-y1.nv-axis'))
                .call(yAxis1);


            g.select('.nv-y1.nv-axis')
                .classed('nv-disabled', series1.length ? false : true)
                .attr('transform', 'translate(' + x.range()[0] + ',0)');


            legend.dispatch.on('stateChange', function(newState) { //bookmark userchoice

                var auxlength = dataSetLength;
                for (var i = 0; i<auxlength; i++) {
                    if (data[i].userChoice == false) {
                        data[i].disabled = initialState[i];
                    }
                }
                chart.update();
            });


            if(useInteractiveGuideline){
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeight)
                    .margin({left:margin.left, top:margin.top})
                    .svgContainer(container)
                    .xScale(x);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }

            //============================================================
            // Event Handling/Dispatching
            //------------------------------------------------------------

            function mouseover_line(evt) {
                evt.value = evt.point.x;
                evt.series = {
                    value: evt.point.y,
                    color: evt.point.color,
                    key: evt.series.key
                };
                tooltip
                    .duration(0)
                    .headerFormatter(function(d, i) {
                        return xAxis.tickFormat()(d, i);
                    })
                    .valueFormatter(function(d, i) {
                        return yAxis1.tickFormat()(d, i);
                    })
                    .data(evt)
                    .hidden(false);
            }

            function mouseover_bar(evt) {
                evt.value = bars1.x()(evt.data);
                evt['series'] = {
                    value: bars1.y()(evt.data),
                    color: evt.color,
                    key: evt.data.key
                };
                tooltip
                    .duration(0)
                    .headerFormatter(function(d, i) {
                        return xAxis.tickFormat()(d, i);
                    })
                    .valueFormatter(function(d, i) {
                        return yAxis1.tickFormat()(d, i);
                    })
                    .data(evt)
                    .hidden(false);
            }



            function clearHighlights() {
                for(var i=0, il=charts.length; i < il; i++){
                    var chart = charts[i];
                    try {
                        chart.clearHighlights();
                    } catch(e){}
                }
            }

            function highlightPoint(serieIndex, pointIndex, b){
                for(var i=0, il=charts.length; i < il; i++){
                    var chart = charts[i];
                    try {
                        chart.highlightPoint(serieIndex, pointIndex, b);
                    } catch(e){}
                }
            }

            if(useInteractiveGuideline){
                interactiveLayer.dispatch.on('elementMousemove', function(e) {
                    clearHighlights();
                    var singlePoint, pointIndex, pointXLocation, allData = [];
                    data
                        .filter(function(series, i) {
                            series.seriesIndex = i;
                            return !series.disabled;
                        })
                        .forEach(function(series,i) {
                            var extent = x.domain();
                            var currentValues = series.values.filter(function(d,i) {
                                return chart.x()(d,i) >= extent[0] && chart.x()(d,i) <= extent[1];
                            });

                            pointIndex = nv.interactiveBisect(currentValues, e.pointXValue, chart.x());
                            var point = currentValues[pointIndex];
                            var pointYValue = chart.y()(point, pointIndex);
                            if (pointYValue !== null) {
                                highlightPoint(i, pointIndex, true);
                            }
                            if (point === undefined) return;
                            if (singlePoint === undefined) singlePoint = point;
                            if (pointXLocation === undefined) pointXLocation = x(chart.x()(point,pointIndex));
                            allData.push({
                                key: series.key,
                                value: pointYValue,
                                color: color(series,series.seriesIndex),
                                data: point,
                                yAxis: yAxis1
                            });
                        });

                    var defaultValueFormatter = function(d,i) {
                        var yAxis = allData[i].yAxis;
                        return d == null ? "N/A" : yAxis.tickFormat()(d);
                    };

                    interactiveLayer.tooltip
                        .headerFormatter(function(d, i) {
                            return xAxis.tickFormat()(d, i);
                        })
                        .valueFormatter(interactiveLayer.tooltip.valueFormatter() || defaultValueFormatter)
                        .data({
                            value: chart.x()( singlePoint,pointIndex ),
                            index: pointIndex,
                            series: allData
                        })();

                    interactiveLayer.renderGuideLine(pointXLocation);
                });

                interactiveLayer.dispatch.on("elementMouseout",function(e) {
                    clearHighlights();
                });
            } else {
                lines1.dispatch.on('elementMouseover.tooltip', mouseover_line);
                lines1.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true)
                });

                bars1.dispatch.on('elementMouseover.tooltip', mouseover_bar);
                bars1.dispatch.on('elementMouseout.tooltip', function(evt) {
                    tooltip.hidden(true);
                });
                bars1.dispatch.on('elementMousemove.tooltip', function(evt) {
                    tooltip();
                });
            }
        });

        return chart;
    }

    chart.addData = function(newData,Dataset) {

        var datalength = newData.values.length;
        var aux = Dataset.length;
        var dummy =[(newData.values[0][0])-0.5, 0];
        var dummy2 =[(newData.values[datalength-1][0])+0.5, 0];
        var sum = 0;

        for (var aux2 = 0; aux2 < datalength; aux2++) {
            sum = newData.values[aux2][1] + sum;
        }
        for (var aux2 = 0; aux2 < datalength; aux2++) {
            newData.values[aux2][1] = newData.values[aux2][1] * (100/sum);
        }


        if (!newData.Histogram.disabled || newData.Histogram.userChoice){
            Dataset[aux] =  {

                "key" : "Histogram " + newData.Name ,
                "disabled": newData.Histogram.disabled, //change initial appearance (if it's showing)
                "userChoice":newData.Histogram.userChoice,
                "type": "bar",
                "values": JSON.parse(JSON.stringify(newData.values))
            }
            initialState[aux] = newData.Histogram.disabled;
            aux++;
        }

        if (!newData.FrequencyCurve.disabled ||newData.FrequencyCurve.userChoice){
            Dataset[aux] =  {
                "key" : "Frequency Curve " + newData.Name ,
                "disabled": newData.FrequencyCurve.disabled, //change initial appearance (if it's showing)
                "userChoice":newData.FrequencyCurve.userChoice,
                "type": "line",
                "values": JSON.parse(JSON.stringify(newData.values))
            }
            Dataset[aux].values.unshift(dummy);
            Dataset[aux].values.push(dummy2);
            initialState[aux] = newData.FrequencyCurve.disabled;
            aux++;
        }

        dummy2 =[(newData.values[datalength-1][0])+0.5, 100];
        if (!newData.Cumulative.disabled ||newData.Cumulative.userChoice){

            var auxdata = JSON.parse(JSON.stringify(newData.values));
            for (var aux2 = 1; aux2 < datalength; aux2++) {
                auxdata[aux2][1] = newData.values[aux2][1] + auxdata[(aux2-1)][1];
            }

            Dataset[aux] =  {
                "key" : "Cumulative " + newData.Name ,
                "disabled": newData.Cumulative.disabled, //change initial appearance (if it's showing)
                "userChoice":newData.Cumulative.userChoice,
                "type": "line",
                "values": JSON.parse(JSON.stringify(auxdata))
            }
            Dataset[aux].values.unshift(dummy);
            Dataset[aux].values.push(dummy2);
            initialState[aux] = newData.Cumulative.disabled;
            aux++;
        }
        dataSetLength = aux;
        return;
    }


    chart.DataSetUp= function(Dataset){
        Dataset.map(function(series) {
            series.values = series.values.map(function(d) { return {x: d[0], y: d[1] } });
            return series;
        })
        return;
    }

    chart.updateChart= function(SVG, testdata){
        d3.select(SVG).datum(testdata).call(chart);
        return;
    }



    //============================================================
    // Global getters and setters
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.legend = legend;
    chart.lines1 = lines1;
    chart.bars1 = bars1;
    chart.xAxis = xAxis;
    chart.yAxis1 = yAxis1;
    chart.tooltip = tooltip;
    chart.interactiveLayer = interactiveLayer;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        yDomain1:      {get: function(){return yDomain1;}, set: function(_){yDomain1=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},
        interpolate:    {get: function(){return interpolate;}, set: function(_){interpolate=_;}},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
                if (_.top !== undefined) {
                    margin.top = _.top;
                    marginTop = _.top;
                }
                margin.right  = _.right  !== undefined ? _.right  : margin.right;
                margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
                margin.left   = _.left   !== undefined ? _.left   : margin.left;
            }},
        color:  {get: function(){return color;}, set: function(_){
                color = nv.utils.getColor(_);
            }},
        x: {get: function(){return getX;}, set: function(_){
                getX = _;
                lines1.x(_);
                bars1.x(_);
            }},
        y: {get: function(){return getY;}, set: function(_){
                getY = _;
                lines1.y(_);
                bars1.y(_);
            }},
        useVoronoi: {get: function(){return useVoronoi;}, set: function(_){
                useVoronoi=_;
                lines1.useVoronoi(_);
            }},

        useInteractiveGuideline: {get: function(){return useInteractiveGuideline;}, set: function(_){
                useInteractiveGuideline = _;
                if (useInteractiveGuideline) {
                    lines1.interactive(false);
                    lines1.useVoronoi(false);
                }
            }},

        duration: {get: function(){return duration;}, set: function(_) {
                duration = _;
                [lines1, xAxis, yAxis1].forEach(function(model){
                    model.duration(duration);
                });
            }}
    });

    nv.utils.initOptions(chart);

    return chart;
};
