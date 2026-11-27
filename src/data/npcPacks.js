/* Весь стартовый бестиарий: книга (npcDefaults) + общий пак + пак кампании.
   Сторона из пака раскладывается по разделам бестиария и фракциям. */
import { buildNpcDefaults } from './npcDefaults';
import { GENERIC_NPCS } from './npcGeneric';
import { CAMPAIGN_NPCS } from './npcCampaign';

var CAMPAIGN_CAT='Кампания «Падение Запада»';
/* сторона пака → раздел бестиария и фракция (data/factions.js) */
var GROUP_CAT={'Полис':'Полис','Орда':'Орда','Тракт':'Люди тракта','Артель':'Люди тракта','Северяне':'Люди тракта','Алаасы':'Люди тракта','Мутанты':'Твари',
  'Родня':'Фракции за трактом','Покров':'Фракции за трактом','Культ':'Фракции за трактом','Лента':'Фракции за трактом','Синдикат':'Фракции за трактом','Безбашенные':'Фракции за трактом','«Горизонт»':'Фракции за трактом'};
var GROUP_FACTION={'Родня':'rodnya','Покров':'pokrov','Культ':'kult','Лента':'lenta','Синдикат':'sok','Безбашенные':'bezbash'};

function buildAllNpcDefaults(){
  var cats=buildNpcDefaults();
  GENERIC_NPCS.forEach(function(n,i){
    var cat=GROUP_CAT[n.group]||'Люди тракта';
    if(!cats[cat])cats[cat]={_created:Date.now()};
    cats[cat]['npc_gen_'+i]=Object.assign({},n,{faction:n.faction||GROUP_FACTION[n.group]||null});
  });
  var camp={_created:Date.now()};
  CAMPAIGN_NPCS.forEach(function(n,i){camp['npc_camp_'+i]=Object.assign({},n,{campaign:true,faction:n.faction||GROUP_FACTION[n.group]||null})});
  cats[CAMPAIGN_CAT]=camp;
  return cats;
}
export { buildAllNpcDefaults, CAMPAIGN_CAT };
