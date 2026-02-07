import { createArrayEditor } from "../components/arrayEditor.js";

export function createModelForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", tags: [], models: [], roles: [] };
  const mk=(label,key)=>{const l=document.createElement('label');l.className='editor-field';l.innerHTML=`<span>${label}</span>`;const i=document.createElement('input');i.type='text';i.addEventListener('input',()=>{state[key]=i.value;onChange();});l.append(i);mount.append(l);return i;};
  const name=mk('name','name');const description=mk('description','description');const version=mk('version','version');
  const tags=createArrayEditor({mount,label:'tags',fields:[{name:'value',label:'Tag'}],onChange:(v)=>{state.tags=v;onChange();}});
  const models=createArrayEditor({mount,label:'models',fields:[{name:'model',label:'model'},{name:'provider',label:'provider'}],onChange:(v)=>{state.models=v;onChange();}});
  const roles=createArrayEditor({mount,label:'roles',fields:[{name:'value',label:'Role'}],onChange:(v)=>{state.roles=v;onChange();}});
  return {getState(){return {...state,tags:tags.getItems(),models:models.getItems(),roles:roles.getItems()}},setState(next){Object.assign(state,next||{});name.value=state.name||'';description.value=state.description||'';version.value=state.version||'';tags.setItems(state.tags||[]);models.setItems(state.models||[]);roles.setItems(state.roles||[]);}};
}
