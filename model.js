export const copy = value => structuredClone(value);
export class SaveModel {
  constructor(text) {
    this.root = JSON.parse(text.replace(/^\uFEFF/, ''), (key, value) => {
      if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) throw Error('unsafeNumber');
      return value;
    });
    this.history = []; this.dirty = false; this.validate();
  }
  get data() { return this.root.gameData; }
  vehicles() { return ['playerSquad', 'motorPool'].flatMap(key => this.data[key].map(value => ({ value, owner: this.data[key], location: key }))); }
  crew() {
    const result = ['crewBarracks','crewAidbay','crewTraining','crewInstructor'].flatMap(key => this.data[key].map(value => ({ value, owner: this.data[key], location: key })));
    for (const v of this.vehicles()) for (const value of v.value.crew.crewMembers) result.push({value, owner:v.value.crew.crewMembers, location:v.location, vehicle:v.value.unitCallsign || v.value.unitTypeName || v.value.unitType});
    return result;
  }
  validate() {
    if (!this.root || this.root.gameVersion !== '0.6.3' || !this.data) throw Error('invalidSave');
    for (const key of ['playerSquad','motorPool','crewBarracks','crewAidbay','crewTraining','crewInstructor','moduleStorage']) if (!Array.isArray(this.data[key])) throw Error('invalidSave');
    for (const v of [...this.data.playerSquad,...this.data.motorPool]) {
      if (!v || typeof v.unitType !== 'string' || !Array.isArray(v.crew?.crewMembers) || !Array.isArray(v.moduleInstances)) throw Error('invalidSave');
      if (v.moduleInstances.some(m => typeof m?.module !== 'string')) throw Error('invalidSave');
    }
    const ids = new Set();
    for (const {value} of [...this.vehicles(),...this.crew()]) {
      if (!value || !Number.isInteger(value.id) || value.id < -2147483648 || value.id > 2147483647 || ids.has(value.id)) throw Error('invalidIds');
      ids.add(value.id);
    }
    if (this.data.moduleStorage.some(v => typeof v !== 'string')) throw Error('invalidSave');
  }
  change(fn) {
    const snapshot = copy(this.root);
    try { fn(); this.validate(); } catch (e) { this.root = snapshot; throw e; }
    this.history.push(snapshot); if (this.history.length > 40) this.history.shift(); this.dirty = true;
  }
  undo() { if (this.history.length) { this.root = this.history.pop(); this.dirty = true; } }
  unreferenced(entry) {
    const id = entry.value.id;
    const scan = node => {
      if (node === entry.value) return false;
      if (node && typeof node === 'object') return Object.values(node).some(scan);
      return node === id || node === String(id);
    };
    if (scan(this.root)) throw Error('referenced');
  }
  remove(entry) { const i = entry.owner.indexOf(entry.value); if (i < 0) throw Error('selection'); entry.owner.splice(i,1); }
  dismiss(entry) { this.unreferenced(entry); this.remove(entry); }
  unassign(entry) { if(entry.owner === this.data.crewBarracks) return; this.unreferenced(entry); this.remove(entry); entry.value.crewRole=5; this.data.crewBarracks.push(entry.value); }
  park(entry) { if(entry.owner === this.data.motorPool) return; if(entry.owner.length<=1) throw Error('lastVehicle'); this.unreferenced(entry); this.remove(entry); this.data.motorPool.push(entry.value); }
  removeVehicle(entry) {
    if(entry.owner === this.data.playerSquad && entry.owner.length<=1) throw Error('lastVehicle');
    this.unreferenced(entry);
    for(const crew of entry.value.crew.crewMembers) { crew.crewRole=5; this.data.crewBarracks.push(crew); }
    this.data.moduleStorage.push(...entry.value.moduleInstances.map(m=>m.module)); this.remove(entry);
  }
  add(kind, template) {
    if(kind==='modules') { this.data.moduleStorage.push(template); return; }
    const value=copy(template), ids=new Set([...this.vehicles(),...this.crew()].map(e=>e.value.id));
    let id; do { id=crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff; } while(!id || ids.has(id));
    value.id=id;
    if(kind==='vehicles') { value.faction=this.data.playerFaction; value.crew.crewMembers=[]; this.data.motorPool.push(value); }
    else { value.crewRole=5; this.data.crewBarracks.push(value); }
  }
  quantity(name,count) { if(!Number.isInteger(count)||count<0||count>10000) throw Error('invalidNumber'); this.data.moduleStorage=this.data.moduleStorage.filter(m=>m!==name); this.data.moduleStorage.push(...Array(count).fill(name)); }
  serialize() { this.validate(); return JSON.stringify(this.root,null,2); }
}
