/**
 * Created by dligtenb on 12.05.2015.
 * Modules for POIs
 */
// module for adding and updating pois
var pois = (function(){

    // changes the projection of a point from web mercator to lat/lng
    function unproject(latlng){
        var point = new L.Point(latlng.lng,latlng.lat);
        return L.Projection.SphericalMercator.unproject(point.divideBy(config.earth_radius));
    }

    // removes already loaded Features from a geojson
    function removeDuplicates(geojson){
        for (var i=0; i < geojson.features.length; i++){
            // check if id is already in the array of loaded ids - if not add it to the array
            if ($.inArray(geojson.features[i].id, ids) > -1){
                geojson.features.splice(i);
            }
            else{
                ids.push(geojson.features[i].id);
            }
        }
        return geojson
    }

    // Loads peaks from the webservice into a layergroup
    function loadPeaks(peaks_group){
        var day = forecast.getDate(),
            // month +1 because getMonth() returns a value starting at 0
            month = forecast.getMonth() + 1,
            // round the hourly forecast to 3 hours
            hour = 3 * Math.round(forecast.getHours() / 3),
            year = forecast.getFullYear();

        // build URL
        var url = config.peaks_url +
            '?y=' + year + '&m=' + month + '&d=' + day + '&h=' + hour + '';
        // empty pois
        peaks_group.clearLayers();
        // asynchronous AJAX request to retreive and display mountain pois
        $.ajax({
            url:url,
            dataType:'json',
            success:function(response){
                // Leaflet icon that will represent the points on the map
                var icon = new L.icon({
                    iconUrl:"img/peak.svg",
                    iconSize:[20,20]
                });
                var peaks = L.geoJson(response, {
                    // bind a popup on each marker with a link to the node on OSM
                    onEachFeature: function(feature, layer){
                        // if no name given show a "-"
                        var name = '-';
                        if (feature.properties.name){
                            name = feature.properties.name
                        }
                        layer.bindPopup('' + name + '<br />' +
                        '<a target="_blank" href="' + config.osm_node_url + '' + feature.id + '">OSM </a>');
                    },
                    // add the points to the layer, but first reproject the coordinates to WGS 84
                    pointToLayer: function (feature, latlng) {
                        var newlatlng = unproject(latlng);
                        return L.marker(newlatlng, {
                            icon:icon
                        });
                    }

                });
                peaks.addTo(peaks_group);
            },
            error:function(){
                error.showError('Fehler beim Abrufen der Bergspitzen!');
            }
        });
    }

     function loadStops(stops_group, bounds, zoom_level){
         console.log(zoom_level);
         // only load POIS from zoom-level 14 on
         if(zoom_level > 13) {
             var day = forecast.getDate(),
             // month +1 because getMonth() returns a value starting at 0
                 month = forecast.getMonth() + 1,
             // round the hourly forecast to 3 hours
                 hour = 3 * Math.round(forecast.getHours() / 3),
                 year = forecast.getFullYear();

             // convert the latLng bounds to mercator
             var min = L.latLng(bounds._southWest.lat, bounds._southWest.lng);
             var max = L.latLng(bounds._northEast.lat, bounds._northEast.lng);

             var mercator_min = L.Projection.SphericalMercator.project(min);
             var mercator_max = L.Projection.SphericalMercator.project(max);

             var minx = mercator_min.x * config.earth_radius,
                 miny = mercator_min.y * config.earth_radius,
                 maxx = mercator_max.x * config.earth_radius,
                 maxy = mercator_max.y * config.earth_radius;

             // build URL
             var url = config.public_transport_url +
                 '?y=' + year + '&m=' + month + '&d=' + day + '&h=' + hour + '' +
                 '&minx=' + minx + '&miny=' + miny + '&maxx=' + maxx + '&maxy=' + maxy + '';
             var icon = new L.icon({
                 iconUrl: "img/stop.svg",
                 iconSize: [20, 20]
             });
             console.log(url);
             // asynchronous AJAX request to retreive and display mountain pois
             $.ajax({
                 url: url,
                 dataType: 'json',
                 success: function (response) {
                     response = removeDuplicates(response);
                     var peaks = L.geoJson(response, {
                         // bind a popup on each marker with a link to the node on OSM
                         onEachFeature: function (feature, layer) {
                             // don't show a sbb url if no uic_name is given
                             var sbb = '',
                                 name = '-',
                                 osm = '';

                             if (feature.properties.uic_name) {
                                 sbb = '  <a target="_blak" href="' + config.sbb_url
                                 + '' + feature.properties.uic_name + '">SBB Fahrplan</a>';
                             }
                             if (feature.properties.name){
                                name = feature.properties.name;
                             }
                             // only link to OSM if point is a node ism OSM for sure
                             if (feature.id > config.min_node_value){
                                osm = '<a target="_blank" href="' + config.osm_node_url + '' + feature.id + '">OSM</a>'
                             }
                             layer.bindPopup('' + name + '<br />' + osm + sbb + '');
                         },
                         // add the points to the layer, but first reproject the coordinates to WGS 84
                         pointToLayer: function (feature, latlng) {
                             var newlatlng = unproject(latlng);
                             return L.marker(newlatlng, {
                                 icon:icon
                             });
                         }

                     });
                     peaks.addTo(stops_group);
                 },
                 error: function () {
                     error.showError('Fehler beim Abrufen der Bergspitzen!');
                 }
             });
         }
    }

    function reloadPois(stops_group, peaks_group, map){
        ids = [];
        stops_group.clearLayers();
        loadStops(stops_group, map.getBounds(), map.getZoom());
        loadPeaks(peaks_group)
    }

    return{
        loadPeaks:loadPeaks,
        loadStops:loadStops,
        reloadPois:reloadPois
    }
})();
