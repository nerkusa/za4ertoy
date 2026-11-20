/* Где лежат машины (ТЗ v4, п.16):
   - персонажа — в его листе, c.garage (owner {type:'char', id});
   - партии и NPC — в rooms/<room>/vehicles (owner {type:'party'} / {type:'npc', id});
   - забранные — в rooms/<room>/vehicleArchive. */
import { normalizeVehicle } from '../data/vehicles';

function ownerOfNode(v){return (v&&v.owner&&v.owner.type)?v.owner:{type:"npc",id:null}}
/* Все машины: [{ref, v, owner, ownerName, char}] */
function allVehicles(chars,node){
  var out=[];
  (chars||[]).forEach(function(c){(c.garage||[]).forEach(function(v){out.push({ref:"pc:"+c._fbId+":"+v.id,v:normalizeVehicle(v,{type:"char",id:c._fbId}),owner:{type:"char",id:c._fbId},ownerName:c.name||"?",char:c})})});
  Object.keys(node||{}).forEach(function(id){var v=node[id];if(!v||typeof v!=="object")return;var o=ownerOfNode(v);out.push({ref:"node:"+id,v:normalizeVehicle(Object.assign({id:id},v)),owner:o,ownerName:o.type==="party"?"партия":"NPC"+(o.name?": "+o.name:"")})});
  return out;
}
/* Машины, доступные персонажу: свои и партии */
function myVehicles(c,node){return allVehicles([c],node).filter(function(e){return e.owner.type==="char"||e.owner.type==="party"})}
function ownerLabel(o,chars){if(!o)return"?";if(o.type==="party")return"партия";if(o.type==="npc")return"NPC"+(o.name?": "+o.name:"");var c=(chars||[]).find(function(x){return x._fbId===o.id});return c?(c.name||"?"):"?"}

export { allVehicles, myVehicles, ownerLabel };
