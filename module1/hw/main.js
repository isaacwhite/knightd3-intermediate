 (function () {
    'use strict';
    // grab a local reference to D3
    var d3 = window.d3;

    var mousePosition = {
        x: 0,
        y: 0
    };

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

    var getThreshold = function (range, steps) {
        var max = range[1];
        var min = range[0];
        var span = max - min;
        var rise = (span / steps) * 1.01;
        var result = [];

        for (var i = 1; i <= steps; i++) {
            result.push(Math.ceil(min + i * rise));
        }

        return result;
    };

    var createColumnChart = function (chart, cbs) {
        var padding, width, height, xScale, yScale, xAxis, yAxis, barWidth;

        // we need to be passed a chart with an svg target to render on
        if (!chart || !chart.svg) {
            return;
        }

        // don't take these as options yet, maybe later.
        padding = {
            top: 0,
            right: 10,
            bottom: 60,
            left: 50
        };
        width = chart.settings.width - padding.right - padding.left;
        height = chart.settings.height - padding.top - padding.bottom;

        xScale = d3.scale
            .ordinal()
            .rangeRoundBands([0, width], 0.1);

        yScale = d3.scale
            .linear()
            .rangeRound([height, 0]);

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
            var groups, bars, colorScale;
            var extents = d3.extent(data, function (datum) {
                return datum.all.incidents;
            });
            var max = extents[1];
            var threshold = getThreshold(extents, 9);

            data.pop(); // get rid of the last index, it's partial data
            // make an object where we'll save
            // modal positioning data later
            data = data.map(function (datum) {
                datum.tooltip = {};
                return datum;
            });

            // scales
            xScale.domain(data.map(function (datum) {
                return datum.name;
            }));

            yScale.domain([0, max]);

            colorScale = d3.scale.threshold()
                .domain(threshold)
                .range(['#fff5eb','#fee6ce','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#a63603','#7f2704']);
            // axes
            chart.svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(' + padding.left + ',' + height + ')')
                .call(xAxis);

            chart.svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + padding.left + ', 0)')
                .call(yAxis);

            // columns
            groups = chart.svg
                .append('g')
                .attr('class', 'bars')
                .selectAll('.bar')
                .data(data)
                .enter()
                .append('g')
                .attr('class', 'bar');

            barWidth = xScale.rangeBand();
            bars = groups.append('rect')
                .attr({
                    x: function (datum) {
                        var leftEdge = padding.left + xScale(datum.name);
                        var maxLeft = 400;
                        if (leftEdge > maxLeft) {
                            datum.tooltip = {
                                x: maxLeft,
                                arrow: leftEdge + 9 - maxLeft
                            };
                        } else {
                            datum.tooltip = {
                                x: leftEdge,
                                arrow: 9
                            };
                        }

                        return leftEdge;
                    },
                    y: function () {
                        return height;
                    },
                    width: barWidth,
                    height: 0,
                    fill: function (datum) {
                        return colorScale(datum.all.incidents);
                    }
                })
                .on('mouseenter', function (datum) {
                    if (!cbs || !cbs.show) {
                        return;
                    }

                    cbs.show(datum);
                }).on('mouseleave', function (datum) {
                    if (!cbs || !cbs.hide) {
                        return;
                    }

                    cbs.hide(datum);
                });

            // transition height initially
            bars.transition()
                .delay(function(datum, index) {
                    return index * 50;
                })
                .duration(1000)
                .attr({
                    height: function (datum) {
                        return height - yScale(datum.all.incidents);
                    },
                    y: function (datum) {
                        return yScale(datum.all.incidents);
                    }
                });

        });

    };

    var createBarChart = function (chart, data) {
        var groups, barHeight;
        var padding = {
            top: 50,
            right: 20,
            bottom: 40,
            left: 100
        };
        var width = chart.settings.width - padding.left - padding.right;
        var height = chart.settings.height - padding.top - padding.bottom;

        // put the name on each object directly
        var chartData = Object.keys(data.breakdown).map(function (borough) {
            data.breakdown[borough].name = borough;

            return data.breakdown[borough];
        }).sort(function (a, b) {
            return d3.descending(a.incidents, b.incidents);
        });

        var container = chart.svg.append('g');
        var plot = container
            .append('g')
            .attr('transform', 'translate(0, ' + padding.top + ')');

        var xScale = d3
            .scale
            .linear()
            .range([0, width])
            .domain([0, d3.max(chartData, function (datum) {
                return datum.incidents;
            })]);

        var yScale = d3
            .scale
            .ordinal()
            .rangeRoundBands([0, height], 0.1)
            .domain(chartData.map(function (datum) {
                return datum.name;
            }));

        var xAxis = d3
            .svg
            .axis()
            .scale(xScale)
            .orient('bottom');

        var yAxis = d3
            .svg
            .axis()
            .scale(yScale)
            .orient('left');

        container.append('text')
            .attr({
                'text-anchor': 'middle',
                transform: 'translate(' + chart.settings.width / 2 + ', 35)'
            })
            .text('NYC traffic collisions by borough, ' + data.name);

        plot.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + padding.left + ',' + height + ')')
            .call(xAxis);

        plot.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + padding.left + ', 0)')
            .call(yAxis);

        groups = plot
                .append('g')
                .attr('class', 'bars')
                .selectAll('.bar')
                .data(chartData)
                .enter()
                .append('g')
                .attr('class', 'bar');

        barHeight = yScale.rangeBand();

        groups.append('rect')
            .attr({
                x: padding.left,
                y: function (datum) {
                    return yScale(datum.name);
                },
                width: function (datum) {
                    return xScale(datum.incidents);
                },
                height: barHeight
            });

        groups.append('text')
            .attr({
                x: function (datum) {
                    return padding.left + xScale(datum.incidents) - 7;
                },
                y: function (datum) {
                    return yScale(datum.name) + barHeight / 2 + 3;
                },
                'text-anchor': 'end'
            })
            .text(function (datum) {
                return d3.format('0,000')(datum.incidents);
            });


        return container;
    };

    // the svg elements we're going to use
    var charts = {
        main: createCanvas('chart-container', {
            width: 900,
            height: 500,
            id: 'main-chart'
        }),
        tooltip: createCanvas('tooltip-container', {
            width: 500,
            height: 300,
            id: 'chart-tooltip'
        }),
        tooltipHideDelay: 500 // .5s
    };

    var tooltipData = {};
    var queued = {
        cb: undefined,
        timeout: undefined
    };

    var showTooltip = function (datum) {
        var tooltipTop;
        var existing = tooltipData[datum.name];
        var $arrow = d3.select('#tooltip-arrow');

        if (mousePosition.y > 400) {
            // align below cursor
            tooltipTop = mousePosition.y - 360;
            $arrow.classed('on-top', false);
        } else {
            // align above cursor
            tooltipTop = mousePosition.y + 30;
            $arrow.classed('on-top', true);
        }


        // show the tooltip container
        if (queued.cb) {
            clearTimeout(queued.timeout);
            queued.cb();
            queued = {};
        } else {
            charts.tooltip.parent.classed('hidden', false);
        }

        // we'll need to set this when we create the bars
        charts.tooltip.parent.style({
            top: tooltipTop + 'px',
            left: datum.tooltip.x + 'px'
        });

        $arrow.style({
            left: datum.tooltip.arrow + 'px'
        });

        // check for an already drawn chart
        if (existing) {
            // show it, don't need to draw a new one
            existing.classed('hidden', false);
            return;
        }

        tooltipData[datum.name] = createBarChart(charts.tooltip, datum);
    };

    var hideTooltip = function (datum) {
        var hideParent = function () {
            // hide the container
            charts.tooltip.parent.classed('hidden', true);
        };

        var partial = function (cb) {
            // hide the chart linked to this bar
            tooltipData[datum.name].classed('hidden', true);
            // indicate no longer queued
            queued = {};

            if (cb) {
                // call callback
                cb();
            }
        };

        var complete = function () {
            partial(hideParent);
        };

        queued = {
            timeout: setTimeout(complete, charts.tooltipHideDelay),
            cb: partial,
            datum: datum
        };
    };

    createColumnChart(charts.main, {
        show: showTooltip,
        hide: hideTooltip
    });

    charts.tooltip.svg.on('mouseenter', function () {
        // cancel the pending hide
        clearTimeout(queued.timeout);
    });

    charts.tooltip.svg.on('mouseleave', function () {
        var datum = queued.datum;
        queued = {};
        hideTooltip(datum);
    });

    // keep track of mouse position for height positioning of modal
    window.onmousemove = function (e) {
        mousePosition = e;
    };

})();