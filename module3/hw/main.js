 (function (d3) {
    'use strict';

    // dimensions
    var d = {
        width: 1600,
        height: 1000
    };

    var projection = d3.geo.mercator()
        .center([-74, 40.7])
        .scale(d.width * 50)
        .translate([d.width / 2, d.height / 2]);

    var path = d3
        .geo
        .path()
        .projection(projection);

    var svg = d3
        .select('.chart-wrap')
        .append('svg')
        .attr(d);

    // load nyc election districts
    d3.json('nyed-fixed.json', function (err, data) {

        svg.selectAll('path')
           .data(data.features)
           .enter()
           .append('path')
           .attr('d', path);

    });
})(window.d3);