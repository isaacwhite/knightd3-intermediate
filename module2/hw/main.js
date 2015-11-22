 (function () {
    'use strict';
    // grab a local reference to D3
    var d3 = window.d3;

    // d3 code needed to make chart svgs
    var createCanvas = function (target, options) {
        var $target = d3.select('#' + target);

        return {
            svg: $target
                .select('.chart-wrap')
                .append('svg')
                .attr(options),
            parent: $target,
            settings: options
        };
    };

    var createColumnChart = function (chart) {
        var padding, width, height, xScale, yScale, xAxis, yAxis, barWidth;

        // we need to be passed a chart with an svg target to render on
        if (!chart || !chart.svg) {
            return;
        }

        // don't take these as options yet, maybe later.
        padding = {
            top: 0,
            right: 10,
            bottom: 70,
            left: 50
        };
        width = chart.settings.width - padding.right - padding.left;
        height = chart.settings.height - padding.top - padding.bottom;

        xScale = d3.scale
            .ordinal()
            .rangeRoundBands([0, width], 0.1);

        yScale = d3.scale
            .linear()
            .range([height, 0]);

        xAxis = d3.svg
            .axis()
            .scale(xScale)
            .orient('bottom');

        yAxis = d3.svg
            .axis()
            .scale(yScale)
            .orient('left')
            .ticks(16);

        d3.json('nyc_motor_vehicle_collisions.json', function (data) {
            var groups, bars, stacked, max, key;
            // stack names
            var stack = ['Brooklyn', 'Staten Island', 'Bronx', 'Manhattan', 'Queens'];
            // categories of data we have to attach to each stack
            var categories = ['deaths', 'injuries', 'total', 'incidents'];
            // maybe pick some custom colors here later?
            var colors = d3.scale.category10();
            // get rid of the last index, it's partial data.
            data.pop();

            // convert our data to the proper format
            stacked = stack.map(function (borough) {
                // the object we'll return at the end
                var result = {
                    name: borough
                };

                // add categories to each result
                categories.forEach(function (category) {
                    result[category] = data.map(function (datum) {
                        return {
                            x: datum.name,
                            y: datum.breakdown[borough][category]
                        };
                    });
                });

                return result;
            });

            // call d3 layhout stack on our values
            d3.layout.stack()
                .values(function (datum) {
                    return datum.incidents;
                })
                (stacked);

            // get the max from the stacked data
            max = stacked.reduce(function (soFar, value) {
                var localMax = d3.max(value.incidents, function (datum) {
                    return datum.y + datum.y0;
                });

                return d3.max([soFar, localMax]);
            }, 0);

            // scales
            xScale.domain(data.map(function (datum) {
                return datum.name;
            }));

            yScale.domain([0, max]);

            // axes
            chart.svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(' + padding.left + ',' + height + ')')
                .call(xAxis);

            chart.svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + padding.left + ', 0)')
                .call(yAxis);

            // make the chart key
            d3.select('.chart-container').append('ul')
                .attr('class', 'key')
                .selectAll('.key-item')
                .data(stack)
                .enter()
                .append('li')
                .text(function (name) {
                    return name;
                })
                .attr('class', 'key-item')
                .append('div')
                .style('background-color', function (name, index) {
                    return colors(index);
                })
                .attr('class', 'item-color');

            // columns
            groups = chart.svg
                .append('g')
                .attr('class', 'bars')
                .selectAll('.bar')
                .data(stacked)
                .enter()
                .append('g')
                .style('fill', function (datum, index) {
                    return colors(index);
                })
                .attr('class', 'bar');


            barWidth = xScale.rangeBand();
            // Add a rect for each data value
            bars = groups.selectAll('rect')
                .data(function (datum) {
                    return datum.incidents;
                })
                .enter()
                .append('rect')
                .attr({
                    x: function (datum) {
                        return padding.left + xScale(datum.x);
                    },
                    y: height,
                    height: 0,
                    width: barWidth
                });

            // transition height initially
            bars.transition()
                .delay(function(datum, index) {
                    return index * 50;
                })
                .duration(1000)
                .attr({
                    height: function (datum) {
                        return  yScale(0) - yScale(datum.y);
                    },
                    y: function (datum) {
                        return yScale(datum.y0) - (yScale(0) - yScale(datum.y));
                    }
                });
        });

    };

    // the svg elements we're going to use
    var charts = {
        main: createCanvas('chart-container', {
            width: 900,
            height: 500,
            id: 'main-chart'
        })
    };

    createColumnChart(charts.main);

})();