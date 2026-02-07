(function () {
  const TYPE_OPTIONS = [
    { value: 'prompts', label: 'create new Prompt' },
    { value: 'mcp servers', label: 'create new MCP Server' },
    { value: 'agents', label: 'create new Agent' },
    { value: 'rules', label: 'create new Rule' },
    { value: 'models', label: 'create new Model' },
    { value: 'workflows', label: 'create new Workflow' },
    { value: 'context', label: 'create new Context' }
  ];

  function toTags(raw) {
    return String(raw || '').split(',').map((t) => t.trim()).filter(Boolean);
  }

  function joinTags(tags) { return (tags || []).join(', '); }

  function normalizeType(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'prompt' || t === 'prompts') return 'prompts';
    if (t.includes('mcp')) return 'mcp servers';
    if (t === 'agent' || t === 'agents') return 'agents';
    if (t === 'rule' || t === 'rules') return 'rules';
    if (t === 'model' || t === 'models') return 'models';
    if (t === 'workflow' || t === 'workflows') return 'workflows';
    if (t === 'context' || t === 'contexts') return 'context';
    return 'prompts';
  }

  function buildContent(state) {
    const tags = state.tags || [];
    if (state.type === 'agents') {
      return `---\nname: ${state.name || ''}\ndescription: ${state.description || ''}\ntags: ${joinTags(tags)}\ntools: ${state.tools || ''}\nrules: ${state.rules || ''}\n---\n\n${state.body || ''}\n`;
    }
    if (state.type === 'rules') {
      return `---\nname: ${state.name || ''}\ndescription: ${state.description || ''}\ntags: ${joinTags(tags)}\n---\n\n${state.body || ''}\n`;
    }

    const base = [
      `name: ${state.name || ''}`,
      `version: ${state.version || ''}`,
      `schema: ${state.schema || 'v1'}`,
      `description: ${state.description || ''}`,
      `tags: ${joinTags(tags)}`,
      ''
    ];

    if (state.type === 'prompts') {
      base.push('prompts:');
      base.push('  - name: ' + (state.itemName || ''));
      base.push('    description: ' + (state.itemDescription || ''));
      base.push('    prompt: |');
      const lines = String(state.itemBody || '').split('\n');
      lines.forEach((line) => base.push(`      ${line}`));
    } else if (state.type === 'mcp servers') {
      base.push('mcpServers:');
      base.push('  - name: ' + (state.itemName || ''));
      base.push('    command: ' + (state.command || ''));
      base.push('    args:');
      toTags(state.args).forEach((arg) => base.push(`      - ${arg}`));
    } else if (state.type === 'models') {
      base.push('models:');
      base.push('  - name: ' + (state.itemName || ''));
      base.push('    provider: ' + (state.provider || ''));
      base.push('    model: ' + (state.modelId || ''));
      base.push('    apiKey: ' + (state.apiKey || ''));
      base.push('    roles:');
      toTags(state.roles).forEach((role) => base.push(`      - ${role}`));
      base.push('    defaultCompletionOptions:');
      base.push(`      contextLength: ${state.contextLength || ''}`);
    } else if (state.type === 'workflows') {
      base.push('models:');
      base.push(String(state.modelsYaml || '  - uses: '));
      base.push('context:');
      base.push(String(state.contextYaml || '  - uses: '));
      base.push('mcpServers:');
      base.push(String(state.mcpYaml || '  - uses: '));
      base.push('rules:');
      base.push(String(state.rulesYaml || '  - uses: '));
    } else if (state.type === 'context') {
      base.push('context:');
      base.push('  - provider: ' + (state.provider || ''));
      base.push('    params:');
      base.push('      url: "' + (state.url || '') + '"');
      if (state.headersYaml) {
        base.push('      headers:');
        String(state.headersYaml).split('\n').forEach((line) => base.push(`        ${line}`));
      }
    }

    return `${base.join('\n')}\n`;
  }

  function renderTypeFields(container, state) {
    if (state.type === 'prompts') {
      container.innerHTML = `<label>Prompt name<input data-k="itemName" /></label><label>Prompt description<input data-k="itemDescription" /></label><label>Prompt<textarea data-k="itemBody" rows="6"></textarea></label>`;
    } else if (state.type === 'mcp servers') {
      container.innerHTML = `<label>Server name<input data-k="itemName" /></label><label>Command<input data-k="command" /></label><label>Args (comma separated)<input data-k="args" /></label>`;
    } else if (state.type === 'agents') {
      container.innerHTML = `<label>Tools (comma separated)<input data-k="tools" /></label><label>Rules (comma separated)<input data-k="rules" /></label><label>Agent instructions<textarea data-k="body" rows="8"></textarea></label>`;
    } else if (state.type === 'rules') {
      container.innerHTML = `<label>Rule body<textarea data-k="body" rows="8"></textarea></label>`;
    } else if (state.type === 'models') {
      container.innerHTML = `<label>Model name<input data-k="itemName" /></label><label>Provider<input data-k="provider" /></label><label>Model id<input data-k="modelId" /></label><label>API key<input data-k="apiKey" /></label><label>Roles (comma separated)<input data-k="roles" /></label><label>Context length<input data-k="contextLength" /></label>`;
    } else if (state.type === 'workflows') {
      container.innerHTML = `<label>Models YAML block<textarea data-k="modelsYaml" rows="8"></textarea></label><label>Context YAML block<textarea data-k="contextYaml" rows="5"></textarea></label><label>MCP servers YAML block<textarea data-k="mcpYaml" rows="5"></textarea></label><label>Rules YAML block<textarea data-k="rulesYaml" rows="5"></textarea></label>`;
    } else if (state.type === 'context') {
      container.innerHTML = `<label>Provider<input data-k="provider" /></label><label>URL<input data-k="url" /></label><label>Headers YAML list<textarea data-k="headersYaml" rows="5"></textarea></label>`;
    }

    container.querySelectorAll('[data-k]').forEach((el) => {
      const key = el.getAttribute('data-k');
      el.value = state[key] || '';
      el.addEventListener('input', () => {
        state[key] = el.value;
        state.onStateChange();
      });
    });
  }

  window.DefinitionForm = {
    createTypeOptions() { return TYPE_OPTIONS; },
    normalizeType,
    buildContent,
    renderTypeFields,
    toTags
  };
})();
