/* jshint esversion:6, loopfunc:true, undef: true, unused: true, sub:true */
/* globals require, console, $, d3, window  */
(function(){
"use strict";

let ipc, $, d3, materialize;
if(require){
  ipc = require('electron').ipcRenderer;
  $ = window.jQuery = window.$ = require('jquery');
  materialize = require('./vendor/materialize.min.js');
  d3 = require('./vendor/d3.min.js');
}else{
  ipc = {
    send: function(){},
    on: function(){}
  };
}

function drawGraph(graph){
  let svg = d3.select("svg");
  let width = window.innerWidth;
  let height = window.innerHeight;
  svg.attr("width", width);
  svg.attr("height", height);

  let defs = svg.append("defs");

  let marker = defs.append("marker");
  marker.attr("id", "arrow")
        .attr("viewBox","0 -5 10 10")
        .attr("refX",8)
        .attr("refY",0)
        .attr("markerWidth",4)
        .attr("markerHeight",4)
        .attr("orient","auto")
        .append("path").attr("d", "M0,-5L10,0L0,5");

  let node = d3.select("#graph")
    .selectAll("div")
    .data(graph.nodes)
    .enter().append("div")
      .style("position", "fixed")
      .call(d3.drag()
               .on("start", dragstarted)
               .on("drag", dragged)
               .on("end", dragended));

  node.append("h1").text(d => d.name);
  node.append("ul").selectAll("li").data(d => d.table).enter().append("li").classed("key", d => d.isKey).text(d => d.name);

  let link = svg.selectAll("line")
    .data(graph.links)
    .enter().append("line")
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#arrow)");

  let simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.name; }).distance(150))
    .force("charge", d3.forceManyBody().strength(-30))
    .force("collide", d3.forceCollide(100))
    .force("center", d3.forceCenter(width/2, height/2));

  simulation.nodes(graph.nodes).on("tick", tick);
  simulation.force("link").links(graph.links);

  function tick() {

    node.each(function(d){
      let n = d3.select(this);
      d.bcr = n.node().getBoundingClientRect();
      n.style("left", d.x-(d.bcr.width/2)+"px");
      n.style("top", d.y-(d.bcr.height/2)+"px");
    });

    let eps = 1e-10;
    function btwn(a, b1, b2) {
      return ((a >= b1-eps) && (a <= b2+eps)) || ((a >= b2-eps) && (a <= b1+eps));
    }

    function lineLineIntersect(line1, line2) {
      let x1 = line1.x1, x2 = line1.x2, x3 = line2.x1, x4 = line2.x2;
      let y1 = line1.y1, y2 = line1.y2, y3 = line2.y1, y4 = line2.y2;
      let pt_denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if(!pt_denom) return;
      let pt_x_num = (x1*y2 - y1*x2) * (x3 - x4) - (x1 - x2) * (x3*y4 - y3*x4);
      let pt_y_num = (x1*y2 - y1*x2) * (y3 - y4) - (y1 - y2) * (x3*y4 - y3*x4);
      let pt = {'x': pt_x_num / pt_denom, 'y': pt_y_num / pt_denom};
      if (btwn(pt.x, x1, x2) && btwn(pt.y, y1, y2) && btwn(pt.x, x3, x4) && btwn(pt.y, y3, y4))
        return pt;
      return;
    }

    function lineRectIntersection(line,x,y,w,h){
      w /= 2;
      h /= 2;
      let lineLeft   = {x1:x-w,y1:y-h,x2:x-w,y2:y+h};
      let lineTop    = {x1:x-w,y1:y-h,x2:x+w,y2:y-h};
      let lineRight  = {x1:x+w,y1:y-h,x2:x+w,y2:y+h};
      let lineBottom = {x1:x-w,y1:y+h,x2:x+w,y2:y+h};

      let cross1 = lineLineIntersect(line,lineLeft) ||
                   lineLineIntersect(line,lineTop) ||
                   lineLineIntersect(line,lineRight) ||
                   lineLineIntersect(line,lineBottom);
      return cross1;
    }

    link.each(function(d){
      let l = d3.select(this);
      let x1 = d.source.x;
      let y1 = d.source.y;
      let w1 = d.source.bcr.width;
      let h1 = d.source.bcr.height;
      let x2 = d.target.x;
      let y2 = d.target.y;
      let w2 = d.target.bcr.width;
      let h2 = d.target.bcr.height;
      let line = {x1,y1,x2,y2};
      let cross1 = lineRectIntersection(line,x1,y1,w1,h1);
      let cross2 = lineRectIntersection(line,x2,y2,w2,h2);
      l.attr("x1", cross1.x).attr("y1", cross1.y)
       .attr("x2", cross2.x).attr("y2", cross2.y);
    });
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

function selectPopup(){
  $('#waitPopup').modal("open");
  ipc.send("list");
}
ipc.on('list', function(event, dbs){
  $('#waitPopup').modal("close");
  let select = $('#databaseSelection');
  $('#databaseSelection option[value!=""]').remove();
  dbs.forEach(name => select.append($("<option>").attr("value",name).text(name)));
  select.material_select();
  $('#selectPopup').modal("open");
  $('#selectPopup .modal-footer').addClass("hide");
});

$('#databaseSelection').change(function(){
  let v = $('#databaseSelection').val();
  if(v){
    ipc.send("get",v);
    $('#waitPopup').modal("open");
    $('#selectPopup').modal("close");
  }
});

ipc.on('get', function(event, list){
  console.log(list);
  $('#waitPopup').modal("close");
  let nodes = [];
  let links = [];
  let errorMsgs = [];
  list.forEach(function(item){
    let name = item.name;
    if(item.error){
      errorMsgs.push(name + ": " + item.error);
      return;
    }
    let data = item.data || {};
    let keys = {};
    Object.keys(data.keys).map(k => data.keys[k]).filter(v => !v.dup).forEach(v => v.keys.forEach(k => keys[k] = true));
    let table = (data.tag || []).map(function(name){ return {name,isKey:keys[name]}; });
    let constraints = data.constraints || {};
    nodes.push({name,table});
    for(let k in constraints){
      let v = constraints[k];
      if(v.table) links.push({source:name,target:v.table});
    }
  });
  if(errorMsgs.length){
    $('#errorPopup').modal("open");
    let ul = $("<ul>");
    errorMsgs.forEach(msg => ul.append($("<li>").text(msg)));
    $('#errorPopup #message').append(ul);
    $('#errorPopup .modal-footer').addClass("hide");
    return;
  }
  drawGraph({nodes, links});
});


$(function() {
  $('.modal').modal({dismissible: false});
  $('select').material_select();
  selectPopup();
});

})();
