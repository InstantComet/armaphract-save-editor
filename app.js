import {loadoutDialog} from './equipment-ui.js?v=card-select-1';
import {SaveModel,copy} from './model.js';
import {strings} from './i18n.js';
const $=s=>document.querySelector(s), el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let lang='en';try{lang=localStorage.getItem('armaphract-language')==='zh'?'zh':'en';}catch{}
let model=null,equipment=null,catalog=null,original=null,fileName='',tab='crew',selected=new Set(),visible=[],downloaded=false;
const t=k=>strings[lang][k]||k;
const label=s=>lang==='zh'&&catalog?.translations[s]&&catalog.translations[s]!==s?`${catalog.translations[s]} / ${s}`:s;
const dialog=$('#dialog'),body=$('#dialog-body');let submit=null;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6500);}
function guard(fn){try{return fn();}catch(e){toast(t(e.message));}}
function button(key,fn,cls){const b=el('button',t(key),cls);b.type='button';b.addEventListener('click',()=>guard(fn));return b;}
function modal(title,fn){dialog.classList.remove('equipment-dialog');$('#dialog-title').textContent=title;body.replaceChildren();$('#dialog-error').textContent='';$('#apply').textContent=t('apply');submit=fn;dialog.showModal();}
function close(){dialog.close();submit=null;}
$('#form').addEventListener('submit',e=>{e.preventDefault();try{if(submit)submit();close();}catch(err){$('#dialog-error').textContent=t(err.message);}});
$('#cancel').onclick=close;$('#close').onclick=close;dialog.addEventListener('cancel',()=>{submit=null;});
function confirmAction(key,fn){modal(t('confirm'),fn);body.append(el('p',t(key),'help'));$('#apply').textContent=t('confirm');}
function change(fn){try{model.change(fn);}catch(e){selected.clear();render();throw e;}selected.clear();downloaded=false;render();toast(t('changed'));}
function entries(){if(tab==='crew')return model.crew();if(tab==='vehicles')return model.vehicles();const counts=new Map();for(const name of model.data.moduleStorage)counts.set(name,(counts.get(name)||0)+1);return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>({name,count}));}
const keyOf=e=>tab==='modules'?e.name:e.value.id;
function location(e){return `${t(e.location)}${e.vehicle?' · '+e.vehicle:''}`;}
function render(){
 document.documentElement.lang=lang==='zh'?'zh-CN':'en';for(const n of document.querySelectorAll('[data-i]'))n.textContent=t(n.dataset.i);
 $('#search').placeholder=t('search');$('#close').ariaLabel=t('close');$('#filename').textContent=fileName||t('noFile');$('#file-state').textContent=!model?t('ready'):model.dirty?t('dirty'):downloaded?t('exported'):t('loaded');
 $('#welcome').hidden=!!model;$('#editor').hidden=!model;$('#download').disabled=!model;$('#backup').disabled=!model;$('#undo').disabled=!model?.history.length;
 if(!model)return;
 const counts={crew:model.crew().length,vehicles:model.vehicles().length,modules:model.data.moduleStorage.length};$('#tabs').replaceChildren();
 for(const name of ['crew','vehicles','modules']){const b=button(name,()=>{tab=name;selected.clear();$('#search').value='';render();},name===tab?'active':'');b.setAttribute('aria-current',name===tab?'page':'false');b.append(el('span',String(counts[name]),'badge'));$('#tabs').append(b);}
 const q=$('#search').value.toLocaleLowerCase();visible=entries().filter(e=>[e.name,e.value?.name,e.value?.crewTemplate,e.value?.unitType,e.value?.unitTypeName,e.value?.unitCallsign,e.value?.id,e.location,e.location&&location(e)].filter(x=>x!==undefined).map(x=>label(String(x))).join(' ').toLocaleLowerCase().includes(q));
 $('#actions').replaceChildren(button('add',addDialog,'primary'));
 const acts=tab==='crew'?[['unassign',()=>{const es=chosen();change(()=>es.forEach(e=>model.unassign(e)));}],['dismiss',()=>{const es=chosen();confirmAction('confirmDismiss',()=>change(()=>es.forEach(e=>model.dismiss(e))));}]]:tab==='vehicles'?[['clone',()=>{const es=chosen();change(()=>es.forEach(e=>{const c=copy(e.value);c.unitCallsign=(c.unitCallsign||c.unitTypeName||c.unitType)+' COPY';model.add('vehicles',c);}));}],['park',()=>{const es=chosen();change(()=>es.forEach(e=>model.park(e)));}],['remove',()=>{const es=chosen();confirmAction('confirmRemove',()=>change(()=>es.forEach(e=>model.removeVehicle(e))));}]]:[['remove',()=>{const es=chosen();confirmAction('confirmModules',()=>change(()=>es.forEach(e=>model.quantity(e.name,0))));}]];
 for(const [name,fn]of acts){const b=button(name,fn,['dismiss','remove'].includes(name)?'danger':'');b.disabled=!selected.size;$('#actions').append(b);}
 $('#selection').textContent=`${selected.size} ${t('selected')}`;
 const cols=tab==='crew'?['name','location','gunnery','loading','driving','command']:tab==='vehicles'?['type','callsign','location','crew','modules','damaged']:['modules','quantity'];
 const hr=el('tr'),th=el('th'),all=el('input');all.type='checkbox';all.ariaLabel=t('selectAll');all.checked=visible.length>0&&visible.every(e=>selected.has(keyOf(e)));all.indeterminate=visible.some(e=>selected.has(keyOf(e)))&&!all.checked;all.onchange=()=>{visible.forEach(e=>all.checked?selected.add(keyOf(e)):selected.delete(keyOf(e)));render();};th.append(all);hr.append(th);cols.forEach(c=>hr.append(el('th',t(c))));hr.append(el('th',''));$('#thead').replaceChildren(hr);$('#tbody').replaceChildren();
 for(const e of visible){const row=el('tr',undefined,selected.has(keyOf(e))?'selected':''),cell=el('td'),check=el('input');check.type='checkbox';check.checked=selected.has(keyOf(e));check.ariaLabel=String(e.name||e.value.name||e.value.unitTypeName||e.value.unitType);check.onchange=()=>{check.checked?selected.add(keyOf(e)):selected.delete(keyOf(e));render();};cell.append(check);row.append(cell);
  const v=e.value;let values=tab==='crew'?[label(v.name||v.crewTemplate),location(e),...['gunnery','loading','driving','command'].map(k=>v[k+'Proficiency']?.level??0)]:tab==='vehicles'?[label(v.unitTypeName||v.unitType),v.unitCallsign||'—',location(e),v.crew.crewMembers.length,v.moduleInstances.length,t(v.isHeavilyDamaged?'yes':'no')]:[label(e.name),e.count];
  values.forEach((value,i)=>{const td=el('td',String(value),i===0?'name':typeof value==='number'?'num':'');if(i===0&&tab==='crew'&&v.name!==v.crewTemplate)td.append(el('span',label(v.crewTemplate),'sub'));row.append(td);});const editCell=el('td');editCell.append(button('edit',()=>editDialog(e),'row-edit'));if(tab==='vehicles'){const loadout=button('loadout',()=>{if(!equipment)throw Error('equipmentUnavailable');loadoutDialog(e,equipment,{el,t,label,button,modal,body,change,model});},'row-edit loadout-button');loadout.disabled=!equipment;editCell.append(loadout);}row.append(editCell);$('#tbody').append(row);
 }
 $('#empty').hidden=visible.length>0;$('#counts').textContent=`${visible.length} ${t('shown')} · ${counts.crew} ${t('crew')} / ${counts.vehicles} ${t('vehicles')} / ${counts.modules} ${t('modules')}`;
}
function chosen(){const es=entries().filter(e=>selected.has(keyOf(e)));if(!es.length)throw Error('selection');return es;}
function field(parent,key,value,options={}){const wrap=el('label',undefined,'field');wrap.append(el('span',t(key)));const input=el('input');input.type=options.type||'text';if(input.type==='checkbox')input.checked=!!value;else input.value=value??'';if(input.type==='number'){input.min=options.min??0;input.max=Math.max(options.max??1000000,Number(value)||0);input.step=options.step??1;}if(input.type==='text')input.maxLength=120;wrap.append(input);parent.append(wrap);return input;}
function number(input){const n=Number(input.value);if(!input.value.trim()||!Number.isFinite(n)||!input.checkValidity())throw Error('invalidNumber');return n;}
function editDialog(entry){
 const kind=tab;
 if(kind==='modules'){let count;modal(label(entry.name),()=>change(()=>model.quantity(entry.name,number(count))));count=field(body,'quantity',entry.count,{type:'number',max:10000});return;}
 const v=entry.value,draft=copy(v),reads=[];modal(t('edit')+' · '+label(v.name||v.unitTypeName||v.unitType),()=>{reads.forEach(fn=>fn());change(()=>{Object.assign(v,draft);});});
 if(kind==='crew'){
  const name=field(body,'name',v.name);reads.push(()=>{if(!name.value.trim())throw Error('emptyName');draft.name=name.value.trim();});const healing=field(body,'healing',v.numHealingRemaining??0,{type:'number'});reads.push(()=>draft.numHealingRemaining=number(healing));const grid=el('div',undefined,'fields');body.append(grid);
  for(const key of ['gunnery','loading','driving','command']){grid.append(el('div',t(key),'group-title'));const p=v[key+'Proficiency']||{level:0,XP:0};const level=field(grid,'level',p.level,{type:'number',max:100}),xp=field(grid,'xp',p.XP,{type:'number',step:'any'});reads.push(()=>{draft[key+'Proficiency']={...p,level:number(level),XP:number(xp)};});}
  body.append(el('div',t('skills'),'group-title'));const box=el('div',undefined,'skills'),skillChecks=[];for(const name of [...new Set([...catalog.skills,...(v.crewSkills||[])])].sort()){const l=el('label'),check=el('input');check.type='checkbox';check.checked=(v.crewSkills||[]).includes(name);l.append(check,el('span',label(name)));box.append(l);skillChecks.push([name,check]);}body.append(box);reads.push(()=>draft.crewSkills=skillChecks.filter(([,c])=>c.checked).map(([n])=>n));
 }else{
  const callsign=field(body,'callsign',v.unitCallsign??'');reads.push(()=>draft.unitCallsign=callsign.value.trim()||null);const damage=field(body,'damaged',v.isHeavilyDamaged,{type:'checkbox'});reads.push(()=>draft.isHeavilyDamaged=damage.checked);const supply=field(body,'supply',v.supplyRepair??0,{type:'number',step:'any'});reads.push(()=>draft.supplyRepair=number(supply));const grid=el('div',undefined,'fields');grid.append(el('div',t('color'),'group-title'));body.append(grid);for(const key of ['r','g','b','a']){const color=field(grid,key,v.unitColorOverride?.[key]??1,{type:'number',max:1,step:'any'});reads.push(()=>{draft.unitColorOverride??={};draft.unitColorOverride[key]=number(color);});}
 }
}
function addDialog(){
 if(!catalog)throw Error('noCatalog');const kind=tab;let list,quantity;modal(t('add')+' · '+t(kind),()=>{const name=list.value,count=number(quantity);if(!name)throw Error('selection');const template=kind==='modules'?name:catalog[kind].find(e=>e.name===name)?.template;if(!template)throw Error('selection');change(()=>{for(let i=0;i<count;i++)model.add(kind,template);});});
 body.append(el('p',t({crew:'catalogCrew',vehicles:'catalogVehicles',modules:'catalogModules'}[kind]),'help'));const search=el('input');search.type='search';search.placeholder=t('search');search.style.width='100%';body.append(search);list=el('select',undefined,'catalog-list');list.size=8;list.ariaLabel=t(kind);body.append(list);const names=kind==='modules'?catalog.modules:catalog[kind].map(e=>e.name);
 const filter=()=>{list.replaceChildren();for(const name of [...names].sort())if(label(name).toLowerCase().includes(search.value.toLowerCase())){const option=el('option',label(name));option.value=name;list.append(option);}if(list.options.length)list.selectedIndex=0;};search.oninput=filter;filter();quantity=field(body,'quantity',1,{type:'number',min:1,max:500});
}
async function openFile(file){
 try{if(!file)return;if(file.size>20*1024*1024)throw Error('tooLarge');const candidate=new SaveModel(await file.text());const accept=()=>{model=candidate;original=file;fileName=file.name;downloaded=false;selected.clear();$('#search').value='';render();};if(model?.dirty){confirmAction('discard',accept);}else accept();}catch(e){toast(e instanceof SyntaxError?t('invalidSave'):t(e.message));}finally{$('#file').value='';}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('#file').onchange=e=>openFile(e.target.files[0]);$('#open').onclick=$('#choose').onclick=()=>$('#file').click();
$('#backup').onclick=()=>{if(original){download(original,'savedata-original-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');toast(t('originalDownloaded'));}};
$('#download').onclick=()=>guard(()=>{if(!model)return;download(new Blob([model.serialize()],{type:'application/json'}),'savedata.json');model.dirty=false;downloaded=true;render();toast(t('downloaded'));});
$('#undo').onclick=()=>{model?.undo();selected.clear();downloaded=false;render();};$('#search').oninput=()=>{selected.clear();render();};
$('#language').onclick=()=>{lang=lang==='en'?'zh':'en';try{localStorage.setItem('armaphract-language',lang);}catch{}render();};
window.addEventListener('beforeunload',e=>{if(model?.dirty){e.preventDefault();e.returnValue='';}});
let dragDepth=0;window.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;document.body.classList.add('drag');});window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('dragleave',()=>{if(--dragDepth<=0)document.body.classList.remove('drag');});window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;document.body.classList.remove('drag');openFile(e.dataTransfer.files[0]);});
window.addEventListener('keydown',e=>{if(dialog.open||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();$('#undo').click();}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('#download').click();}});
render();try{const response=await fetch('./catalog.json');if(!response.ok)throw Error();catalog=await response.json();render();}catch{toast(t('noCatalog'));}

try{const response=await fetch('./equipment.json');if(!response.ok)throw Error();equipment=await response.json();render();}catch{toast(t('equipmentUnavailable'));}
