'use strict';

var fs = require('fs');
var moment = require('moment');
var csv = require('csv').parse({
    columns: true
});

var readStream = fs.createReadStream('./raw/NYPD_Motor_Vehicle_Collisions.csv');
var months = {};
var order = [];

var capitalize = function (string) {
    return string.toLowerCase().split(' ').map(function (word) {
        return word.slice(0, 1).toUpperCase() + word.slice(1, word.length);
    }).join(' ');
};

var assertHasStringAttrs = function (object /*, addlArgs*/) {
    var addlArgs = Array.prototype.slice.call(arguments, 1);
    var prop;

    while (addlArgs.length) {
        prop = addlArgs.shift();

        if (!object[prop] || !object[prop].length) {
            return false;
        }

    }

    return true;
};

csv.on('readable', function () {
    var month, monthData, borough, deaths, injuries, lat, lng;
    var data = csv.read();

    while (data) {

        if (!assertHasStringAttrs(data, 'BOROUGH', 'LONGITUDE', 'LATITUDE')) {
            data = csv.read();
            continue;
        }

        month = moment(data.DATE, 'MM/DD/YYYY').format('MMM YYYY');
        borough = capitalize(data.BOROUGH.toLowerCase());
        lat = parseFloat(data.LATITUDE).toFixed(3);
        lng = parseFloat(data.LONGITUDE).toFixed(3);

        // skip oct 2015, partial data
        if (month === 'Oct 2015') {
            data = csv.read();
            continue;
        }

        // assign month data by borough into hash
        monthData = months[month];
        if (!monthData) {
            order.push(month);

            monthData = {
                breakdown: {}
            };
        }


        monthData.breakdown[borough] = monthData.breakdown[borough] || {};

        monthData.breakdown[borough].deaths = monthData.breakdown[borough].deaths || 0;
        monthData.breakdown[borough].injuries = monthData.breakdown[borough].injuries || 0;
        // make our incidents map location specific
        monthData.breakdown[borough].incidents = monthData.breakdown[borough].incidents || {
            count: 0,
            map: {}
        };
        monthData.breakdown[borough].incidents.map[lat] = monthData.breakdown[borough].incidents.map[lat] || {};
        monthData.breakdown[borough].incidents.map[lat][lng] = monthData.breakdown[borough].incidents.map[lat][lng] || 0;

        deaths = parseInt(data['NUMBER OF PERSONS KILLED'], 10);
        injuries = parseInt(data['NUMBER OF PERSONS INJURED'], 10);

        monthData.breakdown[borough].deaths += deaths;
        monthData.breakdown[borough].injuries += injuries;
        // increase the overall count
        monthData.breakdown[borough].incidents.count += 1;
        // track by lat/lng rounded to 2 decimal points
        monthData.breakdown[borough].incidents.map[lat][lng] += 1;

        // assign our updated object back
        months[month] = monthData;

        data = csv.read();
    }

});

csv.on('end', function () {
    var formatted;

    // convert order list of names into reverse ordered data
    order = order.reverse().map(function (monthName) {
        var data = months[monthName];

        // attach the name of the month to the object
        data.name = monthName;

        // modify our breakdowns by reference
        Object.keys(data.breakdown).forEach(function (borough) {
            var bData = data.breakdown[borough];

            bData.total = bData.injuries + bData.deaths;
        });

        data.all = Object.keys(data.breakdown).reduce(function (soFar, borough) {
            var bData = data.breakdown[borough];

            soFar.deaths += bData.deaths;
            soFar.injuries += bData.injuries;
            soFar.total += bData.total;


            soFar.incidents.count += bData.incidents.count;

            Object.keys(bData.incidents.map).forEach(function (lat) {
                soFar.incidents.map[lat] = soFar.incidents.map[lat] || {};

                Object.keys(bData.incidents.map[lat]).forEach(function (lng) {
                    var count = bData.incidents.map[lat][lng];

                    soFar.incidents.map[lat][lng] = soFar.incidents.map[lat][lng] || 0;
                    soFar.incidents.map[lat][lng] += count;
                });

            });


            return soFar;
        }, {
            deaths: 0,
            injuries: 0,
            total: 0,
            incidents: {
                count: 0,
                map: {}
            }
        });

        return data;
    });

    formatted = JSON.stringify(order, null, 4);

    fs.writeFile('./output/nyc_motor_vehicle_collisions.json', formatted, function (err) {

        if (err) {
            console.warn('Failed to write file, error was:', err);
            return;
        }

        console.log('File written!');
    });
});

readStream.pipe(csv);
