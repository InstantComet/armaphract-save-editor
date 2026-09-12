// IDs outside the chassis's real slots bypass native fit validation. Encode the
// chosen mount so this editor can still group forced modules after reloading.
const EXTRA_SLOT_BASE=1000000, EXTRA_SLOT_STRIDE=10000;
export function mountId(instance){const id=instance.originalSlotID;return id>=EXTRA_SLOT_BASE?Math.floor((id-EXTRA_SLOT_BASE)/EXTRA_SLOT_STRIDE):id;}
export function slotModules(vehicle,slot){return vehicle.moduleInstances.filter(m=>mountId(m)===slot.id);}
export function fitReasons(vehicle,slot,name,data){
 const mod=data.modules[name];if(!mod||!slot)return ['unknownEquipment'];
 const installed=slotModules(vehicle,slot), reasons=[];
 if(slot.fixed)reasons.push('fixedSlot');
 if(!slot.allowed.includes(name)&&!slot.fixed)reasons.push('incompatible');
 if(installed.reduce((n,m)=>n+(data.modules[m.module]?.size??0),0)+mod.size>slot.size)reasons.push('noSpace');
 if(mod.gun&&installed.filter(m=>data.modules[m.module]?.gun).length>=slot.maxGuns)reasons.push('gunLimit');
 if(mod.engine&&installed.filter(m=>data.modules[m.module]?.engine).length>=slot.maxEngines)reasons.push('engineLimit');
 return reasons;
}
export function installModule(vehicle,slot,name,data,force=false){
 if(!data.modules[name]||!slot)throw Error('unknownEquipment');
 if(!force&&fitReasons(vehicle,slot,name,data).length)throw Error('incompatible');
 let id=slot.id;
 if(force&&fitReasons(vehicle,slot,name,data).length){
  const used=new Set(vehicle.moduleInstances.map(m=>m.originalSlotID));
  id=EXTRA_SLOT_BASE+slot.id*EXTRA_SLOT_STRIDE;
  while(used.has(id))id++;
  if(id>=EXTRA_SLOT_BASE+(slot.id+1)*EXTRA_SLOT_STRIDE||id>2147483647)throw Error('noSpace');
 }
 vehicle.moduleInstances.push({module:name,side:slot.side,originalSlotID:id,isPrimaryWeapon:slot.primary});
}
export function replaceModule(vehicle,instance,slot,name,data,force=false){
 const index=vehicle.moduleInstances.indexOf(instance);if(index<0)throw Error('selection');
 const candidate={moduleInstances:vehicle.moduleInstances.filter((_,i)=>i!==index)};
 installModule(candidate,slot,name,data,force);
 const added=candidate.moduleInstances.pop();
 vehicle.moduleInstances.splice(index,1,added);
 return instance.module;
}
export function equipmentStats(vehicle,data){
 const base=data.vehicles[vehicle.unitType];if(!base)return null;
 const modules=vehicle.moduleInstances.map(m=>({instance:m,info:data.modules[m.module]}));
 const armor=base.baseArmor.map((value,side)=>({side,base:value,builtIn:base.addonArmor[side],contributions:modules.filter(m=>m.info?.armor&&(m.instance.side===side||m.instance.side===7)).map(m=>({name:m.instance.module,...m.info.armor}))}));
 const optics=modules.filter(m=>m.info?.optics).map(m=>({name:m.instance.module,...m.info.optics}));
 const best=optics.reduce((a,b)=>b.range>a.range?b:a,{...base.bareVision,name:null});
 const peripheralAdded=modules.reduce((n,m)=>n+(m.info?.stats.rangeSurroundVision??0),0);
 return {armor,optics,best,peripheralBase:base.bareVision.peripheral,peripheralAdded,thermal:optics.some(m=>m.thermal),activeIR:optics.some(m=>m.activeIR),passiveIR:optics.some(m=>m.passiveIR),sensors:modules.filter(m=>m.info?.sensor).map(m=>({name:m.instance.module,...m.info.sensor})),massBase:base.baseMass+base.stats.mass,massAdded:modules.reduce((n,m)=>n+(m.info?.stats.mass??0),0),unknown:modules.filter(m=>!m.info).map(m=>m.instance.module)};
}
