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
  array.forEach(function(line){
    if(line.length == 1 || line.length > 2)
      throw new Error("each line in the tag section should contain a field type and name separated by a space, it's not the case for '"+line+"'");
  });
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

function fixIllPlacedBracket(lines){
  let ret = [];
  function doCloseBracket(txt){
    let tmp = splitTrim("}", txt);
    if(tmp.length > 2) throw new Error("ill placed bracket");
    ret.push(tmp[0]);
    if(tmp.length > 1){
      ret.push("}");
      ret.push(tmp[1]);
    }
  }
  function doOpenBracket(txt){
    let tmp = splitTrim("{", txt);
    if(tmp.length > 2) throw new Error("ill placed bracket");
    doCloseBracket(tmp[0]);
    if(tmp.length > 1){
      ret.push("{");
      doCloseBracket(tmp[1]);
    }
  }
  lines.forEach(doOpenBracket);
  return ret;
}

function parse(str){
  let lines = str.split("\n").map(cleanLine);
  lines = fixIllPlacedBracket(lines);
  lines = lines.filter(line => line);
  let state = "invalid";
  let array;
  let map = {};
  lines.forEach(function(line){
    if(line == "{") map[state] = array = [];
    else if(line == "}") array = null;
    else if(array) array.push(line);
    else state = line.split(" ")[0];
  });
  map.constants = parseConstants(map.constants);
  if(!map.tag) throw new Error("Unable to found the 'tag' section");
  map.tag = parseTag(map.tag);
  map.keys = parseKeys(map.keys);
  map.constraints = parseConstraints(map.constraints);
  return map;
}

module.exports = parse;
