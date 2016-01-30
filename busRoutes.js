var queryString = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var fs = require('fs');
var ld = require('lodash');
var http = require('http');
var express = require('express');
var app = express();

app.use(express.static('./public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.get('/route',function(req, res, next){
	var path = graph.pathBetween(req.body.from.toUpperCase(), req.body.to.toUpperCase(), graph);
	res.send(JSON.stringify(path));
});

app.get('/places', function(req, res, next){
	var places = [];
	var routesObject = createRoutesObject(routesFileData);
	for(var i in routesObject){
		var place = routesObject[i].split(',');
		for(var j = 0; j < place.length; j++){
			if(places.indexOf(place[j]) == -1){
				places.push(place[j]);
			};
		};
	};
	res.send(JSON.stringify(places.sort()));
});

http.createServer(app).listen(8000);


var routesFileData = fs.readFileSync('./all_Routes.json', 'utf-8')
routesFileData = routesFileData.split('\r\n');

var createRoutesObject = function(routesFileData){
	var routes = {};
	for(var i = 0; i < routesFileData.length-1; i++){
		var each = routesFileData[i].split(':');
		routes[each[0]] = each[1];
	};
	return routes;
};

var graphs = {
	UndirectedGraph: function(){}
};

graphs.Edge = function(edgeName,from, to, weight){
	var edge = {busNo:edgeName, from: from, to: to, weight: weight};
	return edge;
};

graphs.UndirectedGraph.prototype = {
	addVertex: function(vertex){
		this[vertex] = [];
	},
	addEdge: function(edge){
		var vertexFrom = edge.from;
		var vertexTo = edge.to;
		if(vertexFrom != vertexTo)
			this[vertexFrom].push({busNo:edge.busNo,from: vertexFrom, to:edge.to, weight:edge.weight});
	},
	fillGraph: function(routes){
		for(var i in routes){
			var locations = routes[i].split(',');
			for(var j = 0; j < locations.length; j++){
				this.addVertex(locations[j]);
			};
		};
		for(var i in routes){
			var locations = routes[i].split(',');
			for(var j = 0; j < locations.length; j++){
				for(var k = 0; k < locations.length; k++){
					var edge = new graphs.Edge(i, locations[j], locations[k], 1);
					this.addEdge(edge);
				};
			};	

		};
	},
	pathBetween: function(from, to, routes){
		var allVerteces = Object.keys(routes);
		var parent= {};
		var distance = {};
		for(var i = 0; i < allVerteces.length; i++){
			distance[allVerteces[i]] = Infinity;
		};
		distance[from] = 0;
		while(allVerteces.length > 0){
			var minimal = allVerteces.reduce(function(pv, cv){
				if(distance[pv] > distance[cv]) return cv;
				return pv;
			});
			allVerteces.splice(allVerteces.indexOf(minimal), 1);
			var neighbous = routes[minimal].map(function(each){
				return each.to;
			});
			for(var i = 0; i < neighbous.length; i++){
				var v = neighbous[i];
				var d = distance[minimal] + findWeight(routes, minimal, v);
				if(distance[v] > d){
					distance[v] = d;
					parent[v] = minimal;
				}	
			};
		};
		var path = findPath(to, from, parent).reverse(), realPath = [];
		for(var i = 0; i < path.length-1; i++){
			var edge = findEdge(routes,path[i], path[i+1])
			realPath.push(edge);
		};
		return realPath;
	}
}

var graph = new graphs.UndirectedGraph();

graph.fillGraph(createRoutesObject(routesFileData));

var findPath = function(from, to, parent, path){
	var path = path || [];
	if(from == to) return path.concat(from);
		if(path.indexOf(parent[from]) == -1){
			var result=findPath(parent[from], to, parent, path.concat(from));
			if(result && result[result.length-1] == to){
				return result;
			}
		}
	return [];
}

var findEdge = function(graph, from, to){
	var edges = [];
	for(var i = 0; i < graph[from].length; i++){
		if(graph[from][i].to == to) edges.push(graph[from][i]);
	};
	return edges.reduce(function(pv, cv){
		return (pv.weight < cv.weight) ? pv : cv;
	});
}

var findWeight = function(graph, min, v){
	for(var i = 0; i < graph[min].length; i++){
		if(graph[min][i].to == v) return graph[min][i].weight;
	};
};

var graph = new graphs.UndirectedGraph();
graph.fillGraph(createRoutesObject(routesFileData));

var findStops = function(each, graph){
	var buses = createRoutesObject(routesFileData);
	var busRoute = buses[each.busNo].split(',');
	var from = busRoute.indexOf(each.from);
	var to = busRoute.indexOf(each.to);
	return (from < to) ? busRoute.slice(from, to + 1) : busRoute.slice(to, from + 1).reverse();
};

app.post('/findOtherPaths', function(req, res, next){
	var from = req.body.from.toUpperCase();
	var to = req.body.to.toUpperCase();
	var buses = createRoutesObject(routesFileData);
	var obj = {};
	for(var i in buses){
		var from_ = buses[i].split(',').indexOf(from);
		var to_ = buses[i].split(',').indexOf(to);
		if(from_ > -1 && to_ > -1){
			obj[i] = (from_ < to_) ? buses[i].split(',').slice(from_, to_ + 1) : buses[i].split(',').slice(to_, from_ + 1)
		} 
	};
	res.send(JSON.stringify(obj));
});

app.post('/getShortest', function(req, res, next){
	var from = req.body.from.toUpperCase();
	var to = req.body.to.toUpperCase();
	var path = graph.pathBetween(from, to, graph);
	var obj = {};
	path.forEach(function(each){
		obj[each.busNo] = findStops(each, graph);;
	});
	res.send(JSON.stringify(obj));
});

