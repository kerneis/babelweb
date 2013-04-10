function babelweb() {

  /* Full information, as output by Babel */
  var babel = {"self":{"id":"unknown", "name":"alamakota"}};
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
    "gray" : "#777"
  , "lightGray" : "#ddd"
  , "blue" : "#03f"
  , "violet" : "#c0f"
  , "pink" : "#f69"
  , "green" : "#4d4"
  , "lightGreen" : "#8e8"
  , "yellow" : "#ff0"
  , "orange" : "#f90"
  , "red" : "#f30"
  }
  var colors = {
    installed: palette.green
      , uninstalled: palette.lightGreen
      , unreachable: palette.lightGray
      , wiredLink: palette.yellow
      , losslessWireless: palette.orange
      , unreachableNeighbour: palette.red
      , me: palette.pink
      , neighbour: palette.violet
      , other: palette.blue
      , selected: palette.blue
      , route: palette.gray
  }

  function initLegend() {
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
  }

  var costColor = d3.scale.log()
    .domain([0, 96, 256, 65535])
    .range([colors.wiredLink,
        colors.wiredLink,
        colors.losslessWireless,
        colors.unreachableNeighbour]);

  function handleUpdate(message) {
    var m = message[0];
    if (babel.self.id !== "unknown" && babel.self.id !== m.self.id)
      return;
    else
      babel = m;
    /* Routes table */
    recompute_table("route");
    /* Neighbours table */
    recompute_table("neighbour");
    /* Exported routes tables */
    recompute_table("xroute");
    /* Graph */
    recompute_network();
    redisplay();
    /* Number of updates */
    count("updates");
  }

  /* Update status message */
  function update_status(msg, good) {
    d3.select("#state").text(msg);
    if(good)
      d3.select("#state").style("background-color", palette.green);
    else
      d3.select("#state").style("background-color", palette.red);
  }

  function connect(server) {
    /* socket.io server */
    var socket = io.connect(server);

    socket.on('connect', function() { update_status("connected", true); });
    socket.on('disconnect', function() { update_status("disconnected", false); });
    socket.on('message', handleUpdate);
  }

  function normalize_id(s) {
    var allowedChars = "0123456789abcdef";
    var res = "";
    for(var i = 0; i<s.length; i++) {
      var c = s.charAt(i);
      if (allowedChars.indexOf(c) != -1)
        res += c;
    }
    return res;
  }

  function bitCount(v) {
    for (var c = 0; v; v >>= 1) c += v & 1;
    return c;
  }

  function update_row (d, name, headers) {
    /* For each <tr> row, iterate through <th> headers
       and add <td> cells with values from the data. */
    var tr = d3.select(this);
    if(name == "route")
      tr.transition()
        .duration(1000)
        .style("background-color",
            (d.value.metric == "65535" ? colors.unreachable :
             d.value.installed == "yes" ? colors.installed :
             colors.uninstalled));
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

  function recompute_table(name) {
    var table = d3.select("#"+name);
    table.select("tr.loading").remove();
    var headers = [];
    table.selectAll("th").each(function() {
      headers.push(d3.select(this).text());
    });
    var rows = table.select("tbody").selectAll("tr")
      .data(d3.entries(babel[name]), function(d){
        if( typeof d == 'undefined' ) return null;
        else return d.key;
      });
    rows.enter().append("tr")
      .attr("id", function(d) { return name+"-"+normalize_id(d.key); })
      .style("background-color","white");
    rows.exit()
      .transition()
      .duration(1000)
      .style("opacity",0)
      .remove();
    rows.each(function(d){update_row.call(this, d, name, headers); });
  };

  /* Update counters in the page */
  function count(name) {
    if ( typeof count.counters == 'undefined' ) {
      count.counters = {};
    }
    if ( typeof count.counters[name] == 'undefined' ) {
      count.counters[name] = 0;
    }
    count.counters[name] = count.counters[name] + 1;
    d3.select("#" + name).text(count.counters[name]);
  }

  var vis;
  var width, height; /* display size */
  var w, h, xScale, yScale ;     /* virtual size */
  var force; /* force to coerce nodes */

  function setZoomLevel(x, y) {
    w = x; h = y;
    xScale = d3.scale.linear().domain([0, w]).range([0,width]);
    yScale = d3.scale.linear().domain([0, h]).range([0,height]);
    force.size([w, h]);
  }

  function zoomOut(factor) {
    setZoomLevel(w * factor, h * factor);
    var nodes = force.nodes();
    for(var d in nodes) {
      nodes[d].x *= factor;
      nodes[d].px *= factor;
      nodes[d].y *= factor;
      nodes[d].py *= factor;
    };
  }

  function zoomIn(factor) { zoomOut(1/factor); }

  function randomizeNodes() {
    var me = babel.self.id;
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


  function initGraph() {
    /* Setup svg graph */
    width = 600;
    height = 400; /* display size */
    vis = d3.select("#fig")
      .insert("svg:svg", ".legend")
      .attr("width", width)
      .attr("height", height)
      .attr("stroke-width", "1.5px");
    force = d3.layout.force(); /* force to coerce nodes */
    force.charge(-1000); /* stronger repulsion enhances graph */
    force.on("tick", onTick);
  }


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

  function isNeighbour(id) {
    for(var n in babel.neighbour)
      if(addrToRouterId[babel.neighbour[n].address] == id)
        return true;
    return false;
  }

  function onTick() {
    me = babel.self.id;

    vis.selectAll("circle.node")
      .style("fill", function(d) {
        var color =  d.nodeName == me ?
        colors.me : ( isNeighbour(d.nodeName) ?  colors.neighbour : colors.other);
      return color;
      })
    .attr("cx", function(d) { return xScale(d.x); })
      .attr("cy", function(d) { return yScale(d.y); });

    var show_all = d3.select("#show_all").property("checked");
    vis.selectAll("path.route")
      .attr("display", function(d) { return (d.installed == "yes" && d.metric != "65535") || show_all ? "inline" : "none"; })
      .attr("opacity", function(d) { return d.installed == "yes" ? "1" : "0.3"; })
      .attr("stroke-dasharray", function(d) { return d.installed == "yes" ? "none" : "5,2"; })
      .attr("d", function(d) { return route_path(d.path); });
  }

  function first(array, f) {
    var i = 0, n = array.length, a = array[0], b;
    while (++i < n) {
      if (f.call(array, a, b = array[i]) > 0) {
        a = b;
      }
    }
    return a;
  };

  /* Compute routers and metrics for the graph */
  function insertKey(arr, obj) {
    for(var i=0; i<arr.length; i++) {
      if (arr[i].key == obj.key) return arr;
    }
    arr.push(obj);
    return arr;
  };

  function recompute_network() {

    var me = babel.self.id;

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
      addrToRouterId[n] = first(d3.entries(neighToRouterMetric[n]), function(a, b) {
        return a.value.refmetric - b.value.refmetric;
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

  function redisplay() {

    var scale = d3.select("#logscale").property("checked") ?
      d3.scale.log().domain([1,65535]).range([0,500]) :
      d3.scale.linear().domain([0,65535]).range([0,10000]);


    /* Restart simulation with new values */
    force.nodes(nodes).links(metrics);
    force.linkDistance(function(d) { return scale(d.metric); });
    force.start();

    /* Display routers */
    var node = vis.selectAll("circle.node")
      .data(nodes);
    node.enter().append("svg:circle")
      .attr("class", "node")
      .attr("cx", function(d) { return xScale(d.x); })
      .attr("cy", function(d) { return yScale(d.y); })
      .attr("r", 5)
      .attr("stroke", "white")
      .attr("id", function(d) {return "node-"+normalize_id(d.nodeName);})
      .each(function(d) {
        if(d.nodeName != babel.self.id)
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
      .attr("fill", "none")
      .attr("id", function(d) { return "link-"+d.key; })
      .attr("d", function(d) { return route_path(d.path); });
    route.exit().remove();

  }

  function init() {
    initLegend();
    initGraph();
    setZoomLevel(450, 400);
  }
  var babelweb = {}
  babelweb.init = init;
  babelweb.connect = connect;
  babelweb.randomizeNodes = randomizeNodes;
  babelweb.zoomOut = zoomOut;
  babelweb.zoomIn = zoomIn;
  babelweb.redisplay = redisplay;
  return babelweb;
}
