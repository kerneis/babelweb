/* Full information, as output by Babel */
var babel = {"self":{"alamakota":{"id":"unknown"}}};
var routers = {}; /* List of routers to display.  Must be updated in
                     place to retain routers positions on the graph.
                   */
var addrToRouterId = {}; /* Associate address to router id, for neighbours */
/* nodes and (minimal) metrics are used to compute the layout of the graph.
   routes are displayed on the graph too, but their metrics do not influence
   the layout. */
var nodes = [], metrics = [], routes = [];

/* Colors */
var palette = {
      "green": "#00B000"
    , "lightGreen": "#66F26A"
    , "red": "#CC0000"
    , "blue": "#24A7FF"
    , "yellow": "#FFFF00"
    , "lightYellow": "#FAFF75"
    , "gray": "#CCCCCC"
    , "darkBlue": "#000070"
    , "darkGreen": "#116600"
    , "darkRed": "#BD0000"
}
var colors = {
      installed: palette.yellow
    , uninstalled: palette.lightYellow
    , unreachable: palette.red
    , wiredLink: palette.blue
    , losslessWireless: palette.green
    , me: palette.darkRed
    , neighbour: palette.darkGreen
    , other: palette.darkBlue
    , selected: palette.red
    , route: palette.gray
}

for(id in colors) {
    d3.selectAll(".legend-"+id)
        .append("svg:svg")
        .attr("width", 10)
        .attr("height", 10)
        .attr("class", "legend-dot")
        .append("svg:circle")
        .attr("cx", 5).attr("cy", 5).attr("r", 5)
        .attr("stroke-width", 0)
        .attr("fill",colors[id]);
}

var costColor = d3.scale.log()
    .domain([0, 96, 256, 65535])
    .range([colors.wiredLink,
            colors.wiredLink,
            colors.losslessWireless,
            colors.unreachable]);

/* socket.io server */
var socket = io.connect();

/* Update status message */
var update_status = function(msg, good) {
        d3.select("#state").text(msg);
        if(good)
            d3.select("#state").style("background-color", palette.green);
        else
            d3.select("#state").style("background-color", palette.red);
}
socket.on('connect', function() { update_status("connected", true); });
socket.on('disconnect', function() { update_status("disconnected", false); });

/* Handle updates */
socket.on('message', function(message){
                var m = JSON.parse(message);
                babel = m.table;
                /* Routes table */
                recompute_table("route");
                d3.select("#route").selectAll("tr")
                    .on("mouseover", function(d) {
                            if(typeof d == 'undefined') return; /* trap event bubbling */
                            var key = d.value.id + d.value.via + d.value.installed;
                            var id = "#link-"+normalize_id(key);
                            d3.select(this).style("opacity","0.7");
                            d3.select(id)
                              .attr("stroke",colors.selected)
                              .attr("stroke-width", "3px");
                            // XXX put just before d3.select("circle.node")
                            })
                    .on("mouseout", function(d) {
                            if(typeof d == 'undefined') return; /* trap event bubbling */
                            var key = d.value.id + d.value.via + d.value.installed;
                            var id = "#link-"+normalize_id(key);
                            d3.select(this).style("opacity","");
                            d3.select(id)
                              .attr("stroke",colors.route)
                              .attr("stroke-width", "1px");
                            });
                /* Neighbours table */
                recompute_table("neighbour");
                d3.select("#neighbour").selectAll("tr")
                    .on("mouseover", function(d) {
                            if(typeof d == 'undefined') return; /* trap event bubbling */
                            d3.select(this).style("opacity","0.7");
                            if(typeof addrToRouterId[d.value.address] == 'undefined') return;
                            var id = "#node-"+normalize_id(addrToRouterId[d.value.address]);
                            d3.select(id)
                              .attr("stroke",colors.selected)
                              .attr("r", "8");
                            })
                    .on("mouseout", function(d) {
                            if(typeof d == 'undefined') return; /* trap event bubbling */
                            d3.select(this).style("opacity","");
                            if(typeof addrToRouterId[d.value.address] == 'undefined') return;
                            var id = "#node-"+normalize_id(addrToRouterId[d.value.address]);
                            d3.select(id)
                              .attr("stroke","white")
                              .attr("r", "5");
                            });
                /* Exported routes tables */
                recompute_table("xroute");
                /* Graph */
                recompute_network();
                redisplay();
                /* Number of updates */
                count("updates");
                }) ;

var normalize_id = function(s) {
    var allowedChars = "0123456789abcdef";
    var res = "";
    for(var i = 0; i<s.length; i++) {
            var c = s.charAt(i);
            if (allowedChars.indexOf(c) != -1)
                res += c;
    }
    return res;
}

var bitCount = function(v) {
    for (var c = 0; v; v >>= 1) c += v & 1;
    return c;
}

var recompute_table = function(name) {
        table = d3.select("#"+name);
        table.select("tr.loading").remove();
        var headers = [];
        table.selectAll("th").each(function() {
            headers.push(d3.select(this).text());
            });
        rows = table.select("tbody").selectAll("tr")
                    .data(d3.entries(babel[name]), function(d){
                        if( typeof d == 'undefined' ) return null;
                        else return d.key;
                        });
        var update_row = function (d) {
            /* For each <tr> row, iterate through <th> headers 
               and add <td> cells with values from the data. */
            var tr = d3.select(this);
            if(name == "route")
                 tr.transition()
                   .duration(1000)
                   .style("background-color",
                                 d.value.installed == "yes" ?
                                 colors.installed : (parseInt(d.value.metric, 10) < 65535 ?
                                 colors.uninstalled : colors.unreachable));
            else if(name == "neighbour") {
                 tr.transition()
                   .duration(1000)
                   .style("background-color", costColor(parseInt(d.value.rxcost, 10)));
            }
            var row = tr.selectAll("td")
              .data(headers.map(function(h){return d.value[h];}));
            row.style("opacity", function(d) {
                    /* transition from blank if text has changed */
                    if(d3.select(this).text() != d)
                        return 0;
                    else
                        return 1;
                        })
               .transition()
               .duration(1000)
               .style("opacity",1)
               .text(function(d){return d;});
            row.enter().append("td")
               .style("opacity",0)
               .transition()
               .duration(1000)
               .style("opacity",1)
               .text(function(d){return d;});
        }
        rows.each(update_row);
        rows.enter().append("tr")
            .attr("id", function(d) { return name+"-"+normalize_id(d.key); })
            .style("background-color","white")
            .each(update_row);
        rows.exit()
            .transition()
            .duration(1000)
            .style("opacity",0)
            .remove();
};

/* Update counters in the page */
var count = function(name) {
        if ( typeof count.counters == 'undefined' ) {
                count.counters = {};
        }
        if ( typeof count.counters[name] == 'undefined' ) {
                count.counters[name] = 0;
        }
        count.counters[name] = count.counters[name] + 1;
        d3.select("#" + name).text(count.counters[name]);
}

/* Setup svg graph */
var width = 600, height = 400; /* display size */
var w, h, xScale, yScale ;     /* virtual size */
var force = d3.layout.force(); /* force to coerce nodes */
force.charge(-200); /* stronger repulsion enhances graph */

var setZoomLevel = function(x, y) {
    w = x; h = y;
    xScale = d3.scale.linear().domain([0, w]).range([0,width]);
    yScale = d3.scale.linear().domain([0, h]).range([0,height]);
    force.size([w, h]);
}

var zoomOut = function(factor) {
    setZoomLevel(w * factor, h * factor);
    var nodes = force.nodes();
    for(var d in nodes) {
        nodes[d].x *= factor;
        nodes[d].px *= factor;
        nodes[d].y *= factor;
        nodes[d].py *= factor;
    };
}
var zoomIn = function(factor) { zoomOut(1/factor); }

setZoomLevel(width * 2, height * 2);

var randomizeNodes = function() {
    var me = babel.self.alamakota.id;
    d3.selectAll("circle.node")
      .each(function(d) {
          if(d == routers[me]) {
              d.x = d.px = w/2;
              d.y = d.py = h/2;
          } else {
              d.x = d.px = undefined;
              d.y = d.py = undefined;
          }
      });
    redisplay();
}

var vis = d3.select("#fig")
    .insert("svg:svg", "span.legend")
    .attr("width", width)
    .attr("height", height);

/* Compute a svg path from route data */
var route_path = d3.svg.line()
    .x(function(d) {
        if(typeof d == 'undefined') return null; // XXX produces invalid svg path
        else return xScale(d.x);
        })
    .y(function(d) {
        if(typeof d == 'undefined') return null;
        else return yScale(d.y);
        })
    .interpolate("linear");

var isNeighbour = function(id) {
    for(var n in babel.neighbour)
        if(addrToRouterId[babel.neighbour[n].address] == id)
            return true;
    return false;
}

force.on("tick", function() {
  me = babel.self.alamakota.id;

  vis.selectAll("circle.node")
     .style("fill", function(d) {
          var color =  d.nodeName == me ?
          colors.me : ( isNeighbour(d.nodeName) ?  colors.neighbour : colors.other);
          return color;
          })
     .attr("cx", function(d) { return xScale(d.x); })
     .attr("cy", function(d) { return yScale(d.y); });

  vis.selectAll("path.route")
     .attr("stroke-opacity", function(d) {
        var show_all = d3.select("#show_all").property("checked");
        return d.installed == "yes" ? 1 : (show_all ? 0.15 : 0);
        })
     .attr("d", function(d) { return route_path(d.path); });
});

/* Compute routers and metrics for the graph */
function insertKey(arr, obj) {
        for(var i=0; i<arr.length; i++) {
                if (arr[i].key == obj.key) return arr;
        }
        arr.push(obj);
        return arr;
};

var recompute_network = function() {

    var me = babel.self.alamakota.id;

    /* Make sure "me" is in the router list, fixed and centered */
    if(typeof routers[me] == 'undefined') {
        routers[me] = {
            nodeName : me,
            x: w/2,
            y: h/2,
            fixed: true,
            metric: 0,
            };
    }

    /* Reset minimal metrics for known routers */
    for (var r in routers) {
        routers[r].metric = undefined;
    }
    routers[me].metric = 0;

    /* Collect:
       - routers, with the minimal metric to reach them from me,
       - neighbours, with the minimal metric to every router */
    var neighToRouterMetric = {};
    for (var route in babel.route) {
        var r = babel.route[route];

        var metric = parseInt(r.metric, 10);
        var refmetric = parseInt(r.refmetric, 10);

        if(!routers[r.id]) {
            /* New router ID discovered */
            routers[r.id] = {
                nodeName:r.id,
                metric:metric,
                via:r.via,
            };
        } else {
            if(routers[r.id].metric == undefined || metric < routers[r.id].metric) {
                routers[r.id].metric = metric;
                routers[r.id].via = r.via;
            }
        }

        if(!neighToRouterMetric[r.via])
            neighToRouterMetric[r.via] = {};
        if(!neighToRouterMetric[r.via][r.id])
            neighToRouterMetric[r.via][r.id] = { refmetric: refmetric };
        else
            neighToRouterMetric[r.via][r.id].refmetric = Math.min(neighToRouterMetric[r.via][r.id].refmetric, refmetric);
    }
    /* Assume that the router id of a neighbour is the id of the
     * router annoucing the shortest route to this neighbour.
     * (This is a hack, a neighbour might hide routes to itself.) */
    addrToRouterId = {};
    for(var n in neighToRouterMetric) {
            addrToRouterId[n] = d3.first(d3.entries(neighToRouterMetric[n]), function(a, b) {
            return a.value.refmetric < b.value.refmetric ? -1 : a.value.refmetric > b.value.refmetric ? 1 : 0;
            }).key;
    }

    /* Populate nodes and metrics */
    nodes = []; metrics = [];
    for (var r in routers) {
        if(routers[r].metric == undefined)
            delete routers[r]; // Safe to delete: no route contains it
        else {
           nodes.push(routers[r]);
           metrics.push({source:routers[me],
                           target:routers[r],
                           metric:routers[r].metric,
                           });
        }
    }
    for (var n in neighToRouterMetric)
        for(var id in neighToRouterMetric[n])
                metrics.push({source:routers[addrToRouterId[n]],
                                target:routers[id],
                                metric:neighToRouterMetric[n][id].refmetric
                                });

   /* Build a list of routes to display */
   routes = [];
   for (var r_key in babel.route) {
        var r = babel.route[r_key];
        if(r.metric == "65535") // do not display retracted routes
            continue;

        insertKey(routes, {
            key: normalize_id(r.id + r.via + r.installed),
            path: [ routers[me]
                 /* for neighbours, will be the same as next point:
                  * this is fine. */
               , routers[addrToRouterId[r.via]]
               , routers[r.id]
               ],
            installed: r.installed }
            );
   }
};

var redisplay = function() {
    /* Restart simulation with new values */    
    force.nodes(nodes).links(metrics);
    force.linkDistance(function(d) { return d.metric; });
    /* There is a race here: we start simulating before
       updating the display, but otherwise we would try to display objects
       which have no coordinates yet! */
    force.start(); 

    /* Display routers */
    var node = vis.selectAll("circle.node")
        .data(nodes);
    node.enter().append("svg:circle")
        .attr("class", "node")
        .attr("cx", function(d) { return xScale(d.x); })
        .attr("cy", function(d) { return yScale(d.y); })
        .attr("r", 5)
        .attr("stroke-width", "1.5px")
        .attr("stroke", "white")
        .attr("id", function(d) {return "node-"+normalize_id(d.nodeName);})
        .each(function(d) {
            if(d.nodeName != babel.self.alamakota.id)
                d3.select(this).call(force.drag);
                })
        .append("svg:title");
    node.exit().remove();

    /* update metric in node title */
    vis.selectAll("circle.node").each(function(d) {
        d3.select(this).select("title")
          .text(d.nodeName + " (metric: "+d.metric+")");

    });
 
    /* Display routes */
    var route = vis.selectAll("path.route")
        .data(routes);
    route.enter().insert("svg:path", "circle.node")
        .attr("class", "route")
        .attr("stroke", colors.route)
        .attr("stroke-width", "1px")
        .attr("fill", "none")
        .attr("id", function(d) { return "link-"+d.key; })
        .attr("d", function(d) { return route_path(d.path); });
    route.exit().remove();

}
