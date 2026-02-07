import { createArrayEditor } from "../components/arrayEditor.js";

export function createWorkflowForm({ mount, onChange }) {
  const state = { name: "", description: "", version: "", models: [], context: [], mcpServers: [], rules: [], override: { roles: [] } };
  const mk=(label,key)=>{const l=document.createElement('label');l.className='editor-field';l.innerHTML=`<span>${label}</span>`;const i=document.createElement('input');i.type='text';i.addEventListener('input',()=>{state[key]=i.value;onChange();});l.append(i);mount.append(l);return i;};
  const name=mk('name','name');const description=mk('description','description');const version=mk('version','version');
  const models=createArrayEditor({mount,label:'models',fields:[{name:'value',label:'Model'}],onChange:(v)=>{state.models=v;onChange();}});
  const roles=createArrayEditor({mount,label:'override.roles',fields:[{name:'value',label:'Role'}],onChange:(v)=>{state.override={...(state.override||{}),roles:v};onChange();}});
  const context=createArrayEditor({mount,label:'context',fields:[{name:'value',label:'Context'}],onChange:(v)=>{state.context=v;onChange();}});
  const mcpServers=createArrayEditor({mount,label:'mcpServers',fields:[{name:'value',label:'MCP Server'}],onChange:(v)=>{state.mcpServers=v;onChange();}});
  const rules=createArrayEditor({mount,label:'rules',fields:[{name:'value',label:'Rule'}],onChange:(v)=>{state.rules=v;onChange();}});
  return {getState(){return {...state,models:models.getItems(),context:context.getItems(),mcpServers:mcpServers.getItems(),rules:rules.getItems(),override:{...(state.override||{}),roles:roles.getItems()}};},setState(next){Object.assign(state,next||{});name.value=state.name||'';description.value=state.description||'';version.value=state.version||'';models.setItems(state.models||[]);context.setItems(state.context||[]);mcpServers.setItems(state.mcpServers||[]);rules.setItems(state.rules||[]);roles.setItems(state.override?.roles||[]);}};
}
