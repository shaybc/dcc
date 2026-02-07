import { createArrayEditor } from "../components/arrayEditor.js";

export function createContextForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", context: [], headers: [] };
  const mk=(label,key)=>{const l=document.createElement('label');l.className='editor-field';l.innerHTML=`<span>${label}</span>`;const i=document.createElement('input');i.type='text';i.addEventListener('input',()=>{state[key]=i.value;onChange();});l.append(i);mount.append(l);return i;};
  const name=mk('name','name');const description=mk('description','description');const version=mk('version','version');
  const context=createArrayEditor({mount,label:'context',fields:[{name:'value',label:'Context'}],onChange:(v)=>{state.context=v;onChange();}});
  const headers=createArrayEditor({mount,label:'headers',fields:[{name:'key',label:'Key'},{name:'value',label:'Value'}],onChange:(v)=>{state.headers=v;onChange();}});
  return {getState(){return {...state,context:context.getItems(),headers:headers.getItems()}},setState(next){Object.assign(state,next||{});name.value=state.name||'';description.value=state.description||'';version.value=state.version||'';context.setItems(state.context||[]);headers.setItems(state.headers||[]);}};
}
