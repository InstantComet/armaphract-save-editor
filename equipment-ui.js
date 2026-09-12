import {copy} from './model.js';
import {fitReasons,installModule,equipmentStats,slotModules,mountId} from './equipment.js';
const sides=['Frontal','Left','Right','Rear','TopFrontal','TopRear','None','All'];
const fmt=n=>Number(n.toFixed(2)).toLocaleString();
export function loadoutDialog(entry,data,ui){
 const {el,t,label,button,modal,body,change,model}=ui;
 const draft=copy(entry.value),returned=[];let forced=false,slotId,searchText='';
 const definition=data.vehicles[draft.unitType];if(!definition)throw Error('unknownEquipment');
 slotId=(definition.slots.find(s=>!s.fixed&&s.allowed.some(name=>!fitReasons(draft,s,name,data).length))||definition.slots.find(s=>!s.fixed)||definition.slots[0])?.id;
 modal(t('loadout')+' · '+label(draft.unitTypeName||draft.unitType),()=>change(()=>{entry.value.moduleInstances=draft.moduleInstances;model.data.moduleStorage.push(...returned);}));
 document.querySelector('#dialog').classList.add('equipment-dialog');
 body.append(el('p',t('equipmentHint'),'help'));
 const toggle=el('label',undefined,'force-toggle'),check=el('input');check.type='checkbox';check.id='force-install';toggle.append(check,el('span',t('force')));body.append(toggle,el('p',t('forceHint'),'help'));
 const layout=el('div',undefined,'equipment-layout'),left=el('section'),right=el('section',undefined,'equipment-stats');body.append(layout);layout.append(left,right);
 check.onchange=()=>{forced=check.checked;render();};
 function render(){
 left.replaceChildren(el('h3',t('slots')));right.replaceChildren(el('h3',t('overview')));
 for(const slot of definition.slots){
 const members=slotModules(draft,slot),used=members.reduce((n,m)=>n+(data.modules[m.module]?.size??0),0);
 const card=el('section',undefined,'slot-card'+(slot.id===slotId?' chosen':''));
 const head=button('slot',()=>{slotId=slot.id;render();},'slot-heading');head.textContent=`#${slot.id} · ${t(sides[slot.side])} · ${t(slot.fixed?'fixedSlot':slot.hardpoint?'hardpoint':'generalSlot')}`;card.append(head);
 card.append(el('div',`${used} / ${slot.size} ${t('used')} · ${slot.maxGuns} ${t('guns')} · ${slot.maxEngines} ${t('engines')}`,used>slot.size?'capacity exceeded':'capacity'));
 if(!members.length)card.append(el('p',t('emptySlot'),'help'));
 for(const member of members){const row=el('div',undefined,'installed-row'),text=el('span',label(member.module));const remaining={moduleInstances:draft.moduleInstances.filter(m=>m!==member)},reasons=fitReasons(remaining,slot,member.module,data).filter(r=>!(slot.fixed&&slot.defaults.includes(member.module)&&r==='fixedSlot'));
 if(member.originalSlotID!==slot.id)text.append(el("small",t("extraMount"),"fit-warning"));
 if(reasons.length)text.append(el('small',reasons.map(t).join(' · '),'fit-warning'));
 const remove=button('uninstall',()=>{draft.moduleInstances.splice(draft.moduleInstances.indexOf(member),1);returned.push(member.module);render();},'row-edit');remove.disabled=slot.fixed&&!forced;row.append(text,remove);card.append(row);}
 left.append(card);
 }
 for(const member of draft.moduleInstances.filter(m=>!definition.slots.some(s=>s.id===mountId(m)))){const row=el('div',undefined,'slot-card installed-row');row.append(el('span',`${label(member.module)} · ${t('unknownSlot')} ${member.originalSlotID}`));const remove=button('uninstall',()=>{draft.moduleInstances.splice(draft.moduleInstances.indexOf(member),1);returned.push(member.module);render();});remove.disabled=!forced;row.append(remove);left.append(row);}
 const picker=el('section',undefined,'module-picker');picker.append(el('h3',t('install')));
 const slotLabel=el('label',undefined,'field');slotLabel.append(el('span',t('slotChoice')));const slotSelect=el('select');slotSelect.id='equipment-slot';for(const s of definition.slots){const o=el('option',`#${s.id} · ${t(sides[s.side])} · ${s.size}`);o.value=s.id;slotSelect.append(o);}slotSelect.value=slotId;slotSelect.onchange=()=>{slotId=Number(slotSelect.value);render();};slotLabel.append(slotSelect);picker.append(slotLabel);
 const search=el('input');search.type='search';search.id='equipment-search';search.placeholder=t('moduleSearch');search.value=searchText;picker.append(search);
 const moduleLabel=el('label',undefined,'field');moduleLabel.append(el('span',t('moduleChoice')));const select=el('select');select.id='equipment-module';moduleLabel.append(select);picker.append(moduleLabel);
 const detail=el('p',undefined,'help'),install=button('install',()=>{const s=definition.slots.find(s=>s.id===slotId);installModule(draft,s,select.value,data,forced);render();},'primary');install.id='install-module';picker.append(detail,install);left.prepend(picker);
 const filter=()=>{searchText=search.value;select.replaceChildren();const s=definition.slots.find(s=>s.id===slotId);for(const name of Object.keys(data.modules).sort()){const reasons=fitReasons(draft,s,name,data);if((forced||!reasons.length)&&label(name).toLowerCase().includes(searchText.toLowerCase())){const o=el('option',`${label(name)} · ${data.modules[name].size}${reasons.length?' ⚠':''}`);o.value=name;select.append(o);}}update();};
 const update=()=>{install.disabled=!select.value;detail.textContent=select.value?fitReasons(draft,definition.slots.find(s=>s.id===slotId),select.value,data).map(t).join(' · '):t('noResults');};select.onchange=update;search.oninput=filter;filter();
 const stats=equipmentStats(draft,data);right.append(el('p',t('statsHint'),'help'));
 if(stats.unknown.length)right.append(el('p',t('unknownStats')+' '+stats.unknown.join(', '),'fit-warning'));
 right.append(el('h4',t('armor')));const wrap=el('div',undefined,'stats-table-wrap'),table=el('table'),head=el('tr');['','baseArmor','builtInArmor','moduleArmor'].forEach(k=>head.append(el('th',k?t(k):'')));table.append(head);
 for(const a of stats.armor){const row=el('tr');row.append(el('td',t(sides[a.side])),el('td',fmt(a.base)),el('td',fmt(a.builtIn)));const td=el('td');if(!a.contributions.length)td.textContent='—';for(const m of a.contributions){const line=el('div',`${t(m.type)} +${fmt(m.rating)}`);line.title=label(m.name);td.append(line);}row.append(td);table.append(row);}wrap.append(table);right.append(wrap,el('p',t('armorHint'),'help'));
 right.append(el('h4',t('vision')));const values=el('dl',undefined,'stat-list');const stat=(key,value)=>values.append(el('dt',t(key)),el('dd',value));stat('selectedOptics',stats.best.name?label(stats.best.name):t('none'));stat('visionRange',fmt(stats.best.range));stat('visionFov',fmt(stats.best.fov)+'°');stat('visionId',fmt(stats.best.id));stat('peripheral',`${fmt(stats.peripheralBase)} + ${fmt(stats.peripheralAdded)} = ${fmt(stats.peripheralBase+stats.peripheralAdded)}`);for(const k of ['thermal','activeIR','passiveIR'])stat(k,t(stats[k]?'yes':'no'));stat('mass',`${fmt(stats.massBase)} + ${fmt(stats.massAdded)} = ${fmt(stats.massBase+stats.massAdded)}`);right.append(values);
 for(const sensor of stats.sensors){right.append(el('h4',label(sensor.name)),el('p',`${t('sensorRange')}: ${fmt(sensor.range)} · ${t('sensorPower')}: ${fmt(sensor.power)} · ${t('advancedSensor')}: ${t(sensor.advanced?'yes':'no')}`,'help'));}
 }
 render();
}
