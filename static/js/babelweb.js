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

/* socket.io server */
var socket = io.connect();

/* Update status message */
var update_status = function(msg, good) {
        d3.select("#state").text(msg);
        d3.select("#state").classed("bad", !good).classed("good", good);
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
                            var id = "#link-"+normalize_id(d.key);
                            d3.select(this).style("opacity","0.7");
                            d3.select(id)
                              .attr("stroke","#f00")
                              .attr("stroke-width", "3px");
                            // XXX put just before of d3.select("circle.node")
                            })
                    .on("mouseout", function(d) {
                            var id = "#link-"+normalize_id(d.key);
                            d3.select(this).style("opacity","");
                            d3.select(id)
                              .attr("stroke","#999")
                              .attr("stroke-width", "1px");
                            });
                /* Neighbours table */
                recompute_table("neighbour");
                d3.select("#neighbour").selectAll("tr")
                    .on("mouseover", function(d) {
                            var id = "#node-"+normalize_id(addrToRouterId[d.value.address]);
                            d3.select(this).style("opacity","0.7");
                            d3.select(id)
                              .attr("stroke","#f00")
                              .attr("r", "8");
                            })
                    .on("mouseout", function(d) {
                            var id = "#node-"+normalize_id(addrToRouterId[d.value.address]);
                            d3.select(this).style("opacity","");
                            d3.select(id)
                              .attr("stroke","#fff")
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
                                 d.value.installed == "yes"?
                                 "#CAFF70":"#FF7256");
            else if(name == "neighbour") {
                 var color = d3.scale.linear()
                               .domain([0, 16])
                               .range(["#FF7256","#CAFF70"]);
                 tr.transition()
                   .duration(1000)
                   .style("background-color", color(
                                 bitCount(parseInt(d.value.reach, 16))));
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
var w = 600, h = 400;

var vis = d3.select("#fig")
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h);

/* Compute a svg path from route data */
var route_path = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("linear");

/* Add a force simulation to coerce nodes */
var force = d3.layout.force()
        .size([w, h]);

force.on("tick", function() {
  me = babel.self.alamakota.id;

  vis.selectAll("circle.node")
     .style("fill", function(d) {
          var color =  d.nodeName == me ?
          "red" : ( d.refmetric == 0 ? "green" : "blue");
          return color;
          })
     .attr("cx", function(d) { return d.x; })
     .attr("cy", function(d) { return d.y; });

  vis.selectAll("path.route")
     .attr("stroke-opacity", function(d) {
        var show_all = d3.select("#show_all").property("checked");
        return d.route.installed == "yes" ? 1 : (show_all ? 0.3 : 0);
        })
     .attr("d", function(d) { return route_path(d.path); });
});

/* Compute routers and metrics for the graph */
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
        routers[r].metric = 65535;
    }
    routers[me].metric = 0;

    /* Collect routers, with the minimal metric to reach them */
    addrToRouterId = {};
    for (var route in babel.route) {
        var r = babel.route[route];

        /* Skip unreachable routers */
        var r_metric = parseInt(r.metric, 10);
        if(r_metric >= 65534) {
            continue;
        }

        if(!routers[r.id]) {
            /* New router ID discovered */
            routers[r.id] = {
                nodeName:r.id,
                metric:r.metric,
                refmetric:r.refmetric,
                via:r.via,
            };
        } else {
            if(r_metric < parseInt(routers[r.id].metric, 10)) {
                routers[r.id].metric = r.metric;
                routers[r.id].refmetric = r.refmetric;
                routers[r.id].via = r.via;
            }
        }
        if(r.refmetric == 0) {
            /* This is a direct neighbour, we need
               to remember its address to set up
               indirect routes later */
            if(typeof addrToRouterId[r.via] != 'undefined' &&
                            addrToRouterId[r.via] != r.id) {
                    console.log("bug: collision in addrToRouterId computation");
                    /* Prefer installed routes in that case */
                    if(r.installed == "yes") addrToRouterId[r.via] = r.id;
            } else {
                    addrToRouterId[r.via] = r.id;
            }
        }
    }
    /* Populate nodes and metrics */
    nodes = []; metrics = [];
    for (var r in routers) {
        if(routers[r].metric == 65535)
            /* oops, router vanished! */
            delete routers[r];
        else {
            nodes.push(routers[r]);
            if(routers[r].refmetric == 0) {
                metrics.push({source:routers[me],
                        target:routers[r],
                        metric:routers[r].metric,
                        });
            }
            else if(r != me) {
                metrics.push({source:routers[addrToRouterId[routers[r].via]],
                        target:routers[r],
                        metric:routers[r].refmetric,
                        });
                /* This is not a route, but we add a link
                   to enforce a more realistic structure */
                metrics.push({source:routers[me],
                        target:routers[r],
                        metric:routers[r].metric,
                        });
            }
        }
    }
   /* Build a list of routes to display */
   routes = [];
   for (var r_key in babel.route) {
        var r = babel.route[r_key];
        if(parseInt(routers[r.id].metric, 10) >= 65534) {
            continue;
        }
        var route = {
            path: [ routers[me] ],
            key: r_key,
            route: r };
        if(parseInt(routers[r.id].refmetric, 10) > 0) /* indirect route */
            route.path.push(routers[addrToRouterId[r.via]]);
        route.path.push(routers[r.id]);
        routes.push(route);
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
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", 5)
        .attr("stroke-width", "1.5px")
        .attr("stroke", "#fff")
        .attr("id", function(d) {return "node-"+normalize_id(d.nodeName);})
        .each(function(d) {
            if(d.nodeName != babel.self.alamakota.id)
                d3.select(this).call(force.drag);
                });
    node.exit().remove();

    node.append("svg:title")
        .text(function(d) { return d.nodeName + " (metric: "+d.metric+")"; });
 
    /* Display routes */
    var route = vis.selectAll("path.route")
        .data(routes);
    route.enter().insert("svg:path", "circle.node")
        .attr("class", "route")
        .attr("stroke", "#999")
        .attr("stroke-width", "1px")
        .attr("fill", "none")
        .attr("id", function(d) { return "link-"+normalize_id(d.key); })
        .attr("d", function(d) { return route_path(d.path); });
    route.exit().remove();

}
