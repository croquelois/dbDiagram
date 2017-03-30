/* jshint esversion:6, node:true, loopfunc:true, undef: true, unused: true, sub:true */

function splitTrim(sep, str){
  return str.split(sep).map(s => s.trim());
}

function arraySplitTrim(sep, array){
  return array.map(splitTrim.bind(null,sep));
}

function cleanLine(line){
  line = splitTrim("//", line)[0];
  line = splitTrim(",", line)[0];
  return line;
}

function removeQuote(s){
  return (/"([^"]*)"/.exec(s) || [null,s])[1];
}

function parseConstants(array){
  let map = {};
  if(!array) return map;
  array = arraySplitTrim("=", array);
  array.forEach(kv => map[kv[0]] = kv[1]);
  return map;
}

function parseTag(array){
  array = arraySplitTrim(" ", array);
  array = array.map(line => line[1].split("[")[0]);
  return array;
}

// dup "NAME" = tag1 + tag2 + tag3
function parseKeys(array){
  let map = {};
  if(!array) return map;
  array = arraySplitTrim("=", array);
  array.forEach(kv => kv[1] = {keys:splitTrim("+",kv[1]),dup:(kv[0].slice(0,4) == "dup ")});
  array.filter(kv => kv[1].dup).forEach(kv => kv[0] = kv[0].slice(4));
  array.forEach(kv => kv[0] = removeQuote(kv[0]));
  array.forEach(kv => map[kv[0]] = kv[1]);
  return map;
}

function parseConstraints(array){
  let map = {};
  if(!array) return map;
  array = arraySplitTrim("->", array);
  array = array.filter(line => line.length == 2);
  array.forEach(kv => kv[1] = /<([^:]*):([^>]*)>/.exec(kv[1]));
  array = array.filter(kv => kv[1]);
  array.forEach(kv => kv[1] = {table:removeQuote(kv[1][1]),key:removeQuote(kv[1][2])});
  array.forEach(kv => kv[0] = removeQuote(kv[0]));
  array.forEach(kv => map[kv[0]] = kv[1]);
  return map;
}

function parse(str){
  let lines = str.split("\n").map(cleanLine).filter(line => line);
  let state;
  let array;
  let map = {};
  lines.forEach(function(line){
    if(line == "{") map[state] = array = [];
    else if(line == "}") array = null;
    else if(array) array.push(line);
    else state = line.split(" ")[0];
  });
  map.constants = parseConstants(map.constants);
  map.tag = parseTag(map.tag);
  map.keys = parseKeys(map.keys);
  map.constraints = parseConstraints(map.constraints);
  return map;
}

module.exports = parse;
