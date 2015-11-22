 (function (d3, queue) {
    'use strict';

    // dimensions
    var d = {
        width: 800,
        height: 800
    };

    var projection = d3.geo.mercator()
        .center([-73.98, 40.7])
        .scale(d.width * 100)
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

    d3.json('nyc_collisions.json', function (err, data) {
        var list = [];
        var reduced = data.reduce(function (soFar, item) {
            // iterate over lats and lng
            Object.keys(item.all.incidents.map).forEach(function (lat) {
                soFar[lat] = soFar[lat] || {};

                Object.keys(item.all.incidents.map[lat]).forEach(function (lng) {
                    var count = item.all.incidents.map[lat][lng];

                    soFar[lat][lng] = soFar[lat][lng] || 0;
                    soFar[lat][lng] += count;
                });

            });

            return soFar;
        }, {});

        // convert our nested hash into a list of coords and counts
        Object.keys(reduced).forEach(function (lat) {
            Object.keys(reduced[lat]).forEach(function (lng) {
                var projected = projection([lng, lat]);
                list.push({
                    x: projected[0],
                    y: projected[1],
                    count: reduced[lat][lng]
                });
            });
        });

        // create a circle for each collision area
        svg.selectAll('.collisions')
           .data(list)
           .enter()
           .append('circle')
           .attr({
                cx: function (datum) {
                    return datum.x;
                },
                cy: function (datum) {
                    return datum.y;
                },
                r: function (datum) {
                    return Math.sqrt(datum.count / 4);
                },
                class: 'collisions'
           });
    });
})(window.d3, window.queue);