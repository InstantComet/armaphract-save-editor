import {copy} from './model.js';
import {fitReasons,installModule,replaceModule,equipmentStats,slotModules,mountId} from './equipment.js?v=armory-2';
import {moduleIcon,moduleKind,chassisDiagram} from './armory-art.js';
const sides=['Frontal','Left','Right','Rear','TopFrontal','TopRear','None','All'];
const fmt=n=>Number(n.toFixed(2)).toLocaleString();

export function loadoutDialog(entry,data,ui){
 const {el,t,label,button,modal,body,change,model}=ui;
 const draft=copy(entry.value),stock=[...model.data.moduleStorage],definition=data.vehicles[draft.unitType];
 if(!definition)throw Error('unknownEquipment');
 let forced=false,slotId=(definition.slots.find(s=>!s.fixed)||definition.slots[0])?.id,member=null,searchText='',candidate='',source='stock',overviewOpen=false;
 modal(t('loadout')+' · '+label(draft.unitTypeName||draft.unitType),()=>change(()=>{entry.value.moduleInstances=draft.moduleInstances;model.data.moduleStorage=stock;}));
 document.querySelector('#dialog').classList.add('equipment-dialog');
 const layout=el('div',undefined,'armory-layout'),board=el('section',undefined,'armory-board'),inventory=el('section',undefined,'armory-inventory');
 board.setAttribute('aria-label',t('slots'));inventory.setAttribute('aria-label',t('moduleInventory'));layout.append(board,inventory);body.append(layout);
 const sideLabel=side=>t(side===4?'turretFront':side===5?'turretRear':sides[side]);
 let suppressClickUntil=0;
 layout.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 function draggable(tile,payload){
  tile.classList.add('draggable-module');
  tile.onpointerdown=e=>{
   if(e.button!==0||!e.isPrimary)return;
   if(payload.instance&&definition.slots.find(s=>s.id===mountId(payload.instance))?.fixed&&!forced)return;
   const startX=e.clientX,startY=e.clientY,controller=new AbortController(),options={signal:controller.signal};let ghost=null,target=null;
   const clear=()=>{controller.abort();ghost?.remove();board.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));};
   document.addEventListener('pointermove',ev=>{
    if(ev.pointerId!==e.pointerId)return;
    if(!ghost&&Math.hypot(ev.clientX-startX,ev.clientY-startY)<6)return;
    ev.preventDefault();
    if(!ghost){ghost=tile.cloneNode(true);ghost.classList.add('module-drag-ghost');const box=tile.getBoundingClientRect();ghost.style.width=box.width+'px';ghost.style.height=box.height+'px';document.querySelector('#dialog').append(ghost);}
    ghost.style.left=ev.clientX+10+'px';ghost.style.top=ev.clientY+10+'px';
    target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.mount-card');
    board.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));if(target&&board.contains(target))target.classList.add('drop-target');
   },{...options,passive:false});
   document.addEventListener('pointercancel',clear,options);
   window.addEventListener('blur',clear,options);
   document.querySelector('#dialog').addEventListener('close',clear,options);
   document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();clear();}}, {...options,capture:true});
   document.addEventListener('pointerup',ev=>{
    if(ev.pointerId!==e.pointerId)return;
    if(!ghost){clear();return;}
    suppressClickUntil=Date.now()+350;
    const hit=document.elementFromPoint(ev.clientX,ev.clientY),card=hit?.closest('.mount-card');clear();
    try{
     const origin=payload.instance,slot=card&&board.contains(card)?definition.slots.find(s=>s.id===Number(card.dataset.slotId)):null;
     if(origin&&slot?.id===mountId(origin))return;
     if(!slot){if(origin){draft.moduleInstances.splice(draft.moduleInstances.indexOf(origin),1);stock.push(origin.module);}else return;}
     else{
      const index=payload.source==='stock'?stock.indexOf(payload.name):-1;if(!origin&&payload.source==='stock'&&index<0)throw Error('noStock');
      const targetTile=hit.closest('[data-module]'),targetTiles=[...card.querySelectorAll('[data-module]')];
      const replaced=targetTile?slotModules(draft,slot)[targetTiles.indexOf(targetTile)]:null;
      const next={moduleInstances:draft.moduleInstances.filter(m=>m!==origin&&m!==replaced)};
      const reasons=fitReasons(next,slot,payload.name,data);if(!forced&&reasons.length)throw Error(reasons[0]);
      installModule(next,slot,payload.name,data,forced);
      if(origin){const added=next.moduleInstances.at(-1);next.moduleInstances[next.moduleInstances.length-1]={...origin,...added};}
      draft.moduleInstances=next.moduleInstances;if(!origin&&payload.source==='stock')stock.splice(index,1);if(replaced)stock.push(replaced.module);slotId=slot.id;
     }
     member=null;candidate='';render();
    }catch(err){const warning=inventory.querySelector('[role="alert"]');if(warning)warning.textContent=t(err.message);}
   },options);
  };
 }
 function choose(slot,selected=null){const keyboard=document.activeElement?.matches(':focus-visible');slotId=slot.id;member=selected;candidate='';render();if(keyboard){const card=[...board.querySelectorAll('.mount-card')].find(c=>Number(c.dataset.slotId)===slot.id);const target=selected?[...card.querySelectorAll('.module-tile')].find(c=>c.dataset.module===selected.module):card.querySelector('.mount-heading');target?.focus({preventScroll:true});}}
 function statsPanel(){
  const stats=equipmentStats(draft,data),top=el('div',undefined,'armory-overview'),armor=el('section',undefined,'armor-panel game-panel'),vision=el('section',undefined,'vision-panel game-panel');
  armor.append(el('h3',t('armor')));const scheme=el('div',undefined,'armor-scheme'),hull=el('div'),turret=el('div');
  hull.append(el('h4',t('hull')));turret.append(el('h4',t('turret')));
  function facing(a,parent){const row=el('div',undefined,'armor-facing');row.append(el('span',t(sides[a.side]),'facing-name'));const values=el('div',undefined,'armor-values');
   for(const [value,kind,key] of [[a.base,'base','baseArmor'],[a.builtIn,'addon','builtInArmor']]){const line=el('div',undefined,'armor-line'),bar=el('span',undefined,'armor-bar '+kind);bar.style.width=Math.max(1,Math.min(value,36)*4)+'px';bar.title=t(key)+': '+fmt(value);line.append(bar,el('span',fmt(value),'armor-number'));values.append(line);}
   if(a.contributions.length){const bonuses=el('div',undefined,'armor-bonuses');for(const m of a.contributions){const chip=el('span',t(m.type)+' +'+fmt(m.rating));chip.title=label(m.name);bonuses.append(chip);}values.append(bonuses);}row.append(values);parent.append(row);
  }
  stats.armor.slice(0,4).forEach(a=>facing(a,hull));stats.armor.slice(4).forEach(a=>facing(a,turret));
  const schematic=el('div',undefined,'schematic');schematic.append(chassisDiagram(),el('small',t('schematic')));scheme.append(hull,schematic,turret);armor.append(scheme);
  const legend=el('div',undefined,'armor-legend');legend.append(el('span',t('baseArmor'),'base-key'),el('span',t('builtInArmor'),'addon-key'));armor.append(legend);
  vision.append(el('h3',t('vision')));const values=el('dl',undefined,'stat-list');const stat=(key,value)=>values.append(el('dt',t(key)),el('dd',value));
  stat('visionRange',fmt(stats.best.range));stat('visionFov',fmt(stats.best.fov)+'°');stat('visionId',fmt(stats.best.id));stat('peripheral',fmt(stats.peripheralBase)+' + '+fmt(stats.peripheralAdded));stat('mass',fmt(stats.massBase)+' + '+fmt(stats.massAdded));vision.append(values);
  const capabilities=el('div',undefined,'vision-capabilities');for(const key of ['thermal','activeIR','passiveIR'])capabilities.append(el('span',(stats[key]?'● ':'○ ')+t(key),stats[key]?'enabled':''));vision.append(capabilities);
  const details=el('details',undefined,'stat-notes');details.append(el('summary',t('details')),el('p',t('statsHint')),el('p',t('armorHint')),el('p',t('selectedOptics')+': '+(stats.best.name?label(stats.best.name):t('none'))));
  for(const s of stats.sensors)details.append(el('p',label(s.name)+' · '+t('sensorRange')+' '+fmt(s.range)+' · '+t('sensorPower')+' '+fmt(s.power)+' · '+t('advancedSensor')+' '+t(s.advanced?'yes':'no')));
  if(stats.unknown.length)details.append(el('p',t('unknownStats')+' '+stats.unknown.join(', ')));vision.append(details);top.append(armor,vision);return top;
 }
 function render(){
  const scroll=board.scrollTop;const overview=el("details",undefined,"overview-drawer");overview.open=overviewOpen;overview.ontoggle=()=>{overviewOpen=overview.open;};overview.append(el("summary",t("overview")),statsPanel());board.replaceChildren(overview);const groups=el('div',undefined,'mount-groups');
  for(const hardpoint of [true,false]){const group=el('section',undefined,'mount-group game-panel');group.append(el('h3',t(hardpoint?'hardpoints':'openMounts')));const slots=el('div',undefined,hardpoint?'hardpoint-list':'open-mount-map');
   const buckets=new Map();
   for(const slot of definition.slots.filter(s=>s.hardpoint===hardpoint)){
    const members=slotModules(draft,slot),used=members.reduce((n,m)=>n+(data.modules[m.module]?.size??0),0),card=el('section',undefined,'mount-card'+(slotId===slot.id?' chosen':''));card.dataset.slotId=slot.id;
    const head=button('slot',()=>choose(slot,members[0]||null),'mount-heading');head.replaceChildren();head.setAttribute('aria-pressed',String(slotId===slot.id));head.append(el('span',sideLabel(slot.side)+' #'+slot.id));
    if(slot.fixed)head.append(el('small',t('fixedSlot'),'fixed-label'));head.append(el('small',used+'/'+slot.size,used>slot.size?'fit-warning':'mount-capacity'));card.append(head);
    card.onclick=e=>{if(!e.target.closest('button'))choose(slot,members[0]||null);};const tiles=el('div',undefined,'module-tiles'+(slot.fixed?' fixed-mount':''));tiles.style.setProperty('--slot-size',Math.max(1,slot.size));tiles.style.setProperty('--slot-columns',Math.max(1,slot.size,...members.map(m=>data.modules[m.module]?.size??1)));
    for(const m of members){const info=data.modules[m.module],tile=button('edit',()=>choose(slot,m),'module-tile '+moduleKind(m.module,info)+(member===m?' editing':''));tile.replaceChildren();tile.dataset.module=m.module;tile.title=label(m.module)+' · '+(info?.size??1)+'×'+(info?.height??1);tile.setAttribute('aria-label',label(m.module));tile.setAttribute('aria-pressed',String(member===m));tile.style.setProperty('--module-size',info?.size??1);tile.style.setProperty('--module-height',info?.height??1);tile.append(moduleIcon(m.module,info),el('span',data.modules[m.module]?.moduleShortName||data.modules[m.module]?.shortName||m.module));
     draggable(tile,{name:m.module,instance:m});if(m.originalSlotID!==slot.id)tile.append(el('small','+','extra-mark'));tiles.append(tile);
    }
    const free=Math.max(0,slot.size-used);
    if(free){const empty=button('emptySlot',()=>choose(slot),'module-tile empty-mount');empty.replaceChildren();empty.style.setProperty('--module-size',free);empty.dataset.freeSize=free;empty.setAttribute('aria-label',t('emptySlot')+' #'+slot.id+' · '+free+'×1');empty.title=t('emptySlot')+' · '+free+'×1';empty.append(el('span','+','free-capacity'));tiles.append(empty);}
    if(!members.length&&slot.size===0)tiles.append(button('emptySlot',()=>choose(slot),'module-tile empty-mount'));
    const limits=el('div',undefined,'mount-limits');limits.title=slot.maxGuns+' '+t('guns')+' · '+slot.maxEngines+' '+t('engines');limits.setAttribute('aria-label',limits.title);for(const [count,kind] of [[slot.maxGuns,'weapon'],[slot.maxEngines,'engine']])if(count){const marks=el('span','▪'.repeat(count),kind);marks.setAttribute('aria-hidden','true');limits.append(marks);}card.append(tiles,limits);
    if(hardpoint)slots.append(card);else{if(!buckets.has(slot.side)){const bucket=el('div',undefined,'side-bucket side-'+slot.side);buckets.set(slot.side,bucket);slots.append(bucket);}buckets.get(slot.side).append(card);}
   }group.append(slots);groups.append(group);
  }board.append(groups);
  const unknown=draft.moduleInstances.filter(m=>!definition.slots.some(s=>s.id===mountId(m)));
  if(unknown.length){const section=el('section',undefined,'game-panel unknown-mounts');section.append(el('h3',t('unknownSlot')));for(const m of unknown){const row=el('div',undefined,'installed-row');row.append(el('span',data.modules[m.module]?.moduleShortName||data.modules[m.module]?.shortName||m.module));row.append(button('uninstall',()=>{draft.moduleInstances.splice(draft.moduleInstances.indexOf(m),1);stock.push(m.module);render();}));section.append(row);}board.append(section);}
  board.scrollTop=scroll;renderInventory();
 }
 function renderInventory(){
  inventory.replaceChildren();const slot=definition.slots.find(s=>s.id===slotId);if(!slot)return;
  const toolbar=el('div',undefined,'inventory-toolbar'),context=el('div',undefined,'inventory-context');
  const available=slot.size-slotModules(draft,slot).filter(m=>m!==member).reduce((n,m)=>n+(data.modules[m.module]?.size??0),0);
  context.append(el('h3',t('moduleInventory')),el('span',sideLabel(slot.side)+' #'+slot.id+' · '+Math.max(0,available)+'×1 · '+(member?t('replaceModule')+': '+label(member.module):t('install'))));context.id='inventory-context';context.setAttribute('aria-live','polite');toolbar.append(context);
  const sources=el('div',undefined,'inventory-sources');for(const key of ['stock','catalog']){const b=button(key==='stock'?'warehouseSource':'catalogSource',()=>{source=key;candidate='';renderInventory();},source===key?'active':'');b.title=t('equipmentHint');b.dataset.source=key;b.setAttribute('aria-pressed',String(source===key));sources.append(b);}toolbar.append(sources);
  const toggle=el('label',undefined,'force-toggle'),check=el('input');check.type='checkbox';check.id='force-install';check.checked=forced;toggle.title=t('forceHint');toggle.append(check,el('span',t('forceShort')));check.onchange=()=>{forced=check.checked;candidate='';renderInventory();};toolbar.append(toggle);
  const search=el('input');search.id='equipment-search';search.type='search';search.placeholder=t('moduleSearch');search.setAttribute('aria-label',t('moduleSearch'));search.value=searchText;toolbar.append(search);inventory.append(toolbar);
  const list=el('div',undefined,'inventory-grid');list.id='module-catalog';list.setAttribute('aria-label',t('moduleChoice'));inventory.append(list);
  const footer=el('div',undefined,'inventory-footer'),detail=el('div',undefined,'candidate-detail'),actions=el('div',undefined,'inventory-actions');footer.append(detail,actions);inventory.append(footer);
  const error=el('p',undefined,'fit-warning');error.setAttribute('role','alert');detail.append(error);
  if(member){const add=button('addInstead',()=>{member=null;candidate='';render();});actions.append(add);}
  const apply=button(member?'replaceModule':'install',()=>{
   try{if(!candidate)return;const stockIndex=stock.indexOf(candidate);if(source==='stock'&&stockIndex<0)throw Error('noStock');
    let removed;if(member)removed=replaceModule(draft,member,slot,candidate,data,forced);else installModule(draft,slot,candidate,data,forced);
    if(source==='stock')stock.splice(stockIndex,1);if(removed)stock.push(removed);member=null;candidate='';render();
   }catch(e){error.textContent=t(e.message);}
  },'primary');apply.id='install-module';actions.append(apply);
  if(member){const remove=button('uninstall',()=>{draft.moduleInstances.splice(draft.moduleInstances.indexOf(member),1);stock.push(member.module);member=null;candidate='';render();},'danger');remove.id='uninstall-module';remove.disabled=slot.fixed&&!forced;actions.append(remove);}
  const remaining=()=>({moduleInstances:draft.moduleInstances.filter(m=>m!==member)});
  function details(){detail.replaceChildren(error);error.textContent='';apply.disabled=!candidate;for(const tile of list.children)tile.setAttribute('aria-pressed',String(tile.dataset.name===candidate));
   if(!candidate){detail.append(el('span',t(member?'replaceHint':'inventoryHint')));return;}
   const info=data.modules[candidate];detail.append(el('strong',label(candidate)),el('span',t('moduleSize')+': '+info.size+'×'+(info.height??1)+' · '+t('mass')+': '+fmt(info.stats.mass)));
   if(info.armor)detail.append(el('span',t(info.armor.type)+' +'+info.armor.rating));if(info.optics)detail.append(el('span',t('visionRange')+': '+fmt(info.optics.range)+' · '+fmt(info.optics.fov)+'°'));
   const reasons=fitReasons(remaining(),slot,candidate,data);apply.disabled=!!reasons.length&&!forced;if(reasons.length)detail.append(el('span',reasons.map(t).join(' · ')+' · '+t('forceShort'),'fit-warning'));
  }
  function filter(){searchText=search.value;list.replaceChildren();const counts=new Map();stock.forEach(n=>counts.set(n,(counts.get(n)||0)+1));const names=Object.keys(data.modules).sort().filter(n=>(source==='catalog'||counts.has(n))&&(forced||searchText.trim()||!fitReasons(remaining(),slot,n,data).length)&&[label(n),n,data.modules[n].shortName,data.modules[n].moduleShortName].join(' ').toLowerCase().includes(searchText.toLowerCase()));if(!names.includes(candidate))candidate='';
   for(const name of names){const info=data.modules[name],tile=button('install',()=>{candidate=name;details();},'inventory-module '+moduleKind(name,info));tile.replaceChildren();tile.dataset.name=name;tile.style.setProperty('--module-size',info.size);tile.style.setProperty('--module-height',info.height??1);tile.title=label(name)+' · '+info.size+'×'+(info.height??1);tile.setAttribute('aria-label',label(name));tile.append(moduleIcon(name,info),el('span',info.moduleShortName||info.shortName||name),el('small',source==='stock'?'×'+counts.get(name):'+','stock-count'));tile.ondblclick=()=>{candidate=name;apply.click();};list.append(tile);}
   for(const tile of list.querySelectorAll('[data-name]'))draggable(tile,{name:tile.dataset.name,source});
   if(!names.length)list.append(el('p',t(slot.fixed&&!forced?'fixedHelp':source==='stock'?'noCompatibleStock':'slotFullHelp'),'catalog-empty'));details();
  }search.oninput=filter;filter();
 }
 render();
}

