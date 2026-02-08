import { createArrayEditor } from "../components/arrayEditor.js";

export function createRuleForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", tags: [], body: "" };
  const row = (label, key) => { const l=document.createElement('label'); l.className='editor-field'; l.innerHTML=`<span>${label}</span>`; const i=document.createElement('input'); i.type='text'; i.addEventListener('input',()=>{state[key]=i.value;onChange();}); l.append(i); mount.append(l); return i; };
  const name=row('name','name'); const description=row('description','description'); const version=row('version','version');
  const tags=createArrayEditor({ mount, label:'tags', fields:[{name:'value',label:'Tag'}], onChange:(v)=>{state.tags=v;onChange();} });
  const bodyWrap=document.createElement('label'); bodyWrap.className='editor-field'; bodyWrap.innerHTML='<span>body</span>'; const body=document.createElement('textarea'); body.className='rule-body-textarea'; body.addEventListener('input',()=>{state.body=body.value;onChange();}); bodyWrap.append(body); mount.append(bodyWrap);
  return { getState(){return { ...state, tags: tags.getItems()};}, setState(next){Object.assign(state,next||{}); name.value=state.name||''; description.value=state.description||''; version.value=state.version||''; body.value=state.body||''; tags.setItems(state.tags||[]);} };
}
