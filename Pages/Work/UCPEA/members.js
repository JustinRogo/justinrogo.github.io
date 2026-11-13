'use strict';

// UCPEA Members view: approvals, the staff FYI list, and member management.
//
// What each person sees and can change is decided by the database's row-level
// security and triggers (Pages/Work/UCPEA/supabase/migrations). This file only
// hides controls that would be refused anyway, so the screen stays honest.
//   Stewards: pending sign-ups and members in their own areas; can approve.
//   Staff:    everyone; approve, decline, suspend, and manage areas/stewards.
//   Admins:   staff abilities plus changing roles (never their own).
(() => {
  const view = document.getElementById('members');
  if (!view || !window.UCPEAAccount) return;

  const $ = id => document.getElementById(id);
  const els = {
    notice: $('members-notice'),
    error: $('members-error'),
    gate: $('members-gate'),
    gateText: $('members-gate-text'),
    gateLink: $('members-gate-link'),
    retry: $('members-retry'),
    app: $('members-app'),
    pendingCount: $('members-pending-count'),
    pendingHelp: $('members-pending-help'),
    pendingEmpty: $('members-pending-empty'),
    pendingList: $('members-pending-list'),
    fyiBlock: $('members-fyi-block'),
    fyiCount: $('members-fyi-count'),
    fyiAll: $('members-fyi-all'),
    fyiList: $('members-fyi-list'),
    allTitle: $('members-all-title'),
    search: $('members-search'),
    status: $('members-status'),
    areaFilter: $('members-area'),
    count: $('members-count'),
    list: $('members-list'),
    navLink: $('sidebar-members'),
    navCount: $('members-nav-count'),
  };

  const ROLE_NAMES = { member: 'Member', staff: 'UCPEA staff', admin: 'Administrator' };
  const STATUS_NAMES = { active: 'Approved', pending: 'Waiting for approval', suspended: 'Paused' };
  const PAGE_SIZE = 1000; // the Data API returns at most 1,000 rows per request

  const state = {
    me: null,
    areas: [],
    areaById: new Map(),
    people: [],
    expanded: new Set(),
    loading: false,
    loadedOnce: false,
    confirmTimer: 0,
  };

  // ---------------------------------------------------------------------------
  // Who is looking at this page
  // ---------------------------------------------------------------------------
  function access(profile) {
    const active = profile?.status === 'active';
    const isAdmin = active && profile.role === 'admin';
    const isStaff = active && (profile.role === 'staff' || isAdmin);
    const stewardAreas = active ? profile.areas.filter(area => area.role === 'steward').map(area => area.id) : [];
    return { isAdmin, isStaff, stewardAreas, canView: isStaff || stewardAreas.length > 0 };
  }

  function updateNav(profile) {
    const { canView } = access(profile);
    els.navLink.hidden = !canView;
    if (!canView) els.navCount.hidden = true;
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------
  function showError(message) {
    els.error.textContent = message || '';
    els.error.hidden = !message;
  }

  function showNotice(message) {
    els.notice.textContent = message || '';
  }

  function friendlyError(error) {
    // Messages raised by the database's own checks are written for people.
    if (error?.code === 'P0001' && error.message) return error.message;
    if (error?.code === '42501' || error?.code === 'no_rows') return "You don't have permission to make that change.";
    if (error?.code === '23505') return 'That person already has that area.';
    if (!navigator.onLine) return "You're offline. Connect to the internet and try again.";
    return 'Something went wrong. Please try again.';
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  async function fetchAll(build) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < PAGE_SIZE) return rows;
    }
  }

  async function loadData() {
    const client = await UCPEAAccount.getClient();
    const [areas, profiles, roles] = await Promise.all([
      state.areas.length ? state.areas : fetchAll(() => client.from('areas').select('id, name').order('id')),
      fetchAll(() => client.from('profiles')
        .select('id, email, display_name, role, status, requested_area_id, approved_at, approved_by, approved_via, staff_acknowledged_at, created_at')
        .order('created_at')),
      fetchAll(() => client.from('area_roles').select('user_id, area_id, role').order('area_id')),
    ]);

    if (!state.areas.length) {
      state.areas = areas;
      state.areaById = new Map(areas.map(area => [area.id, area]));
      for (const area of areas) els.areaFilter.append(new Option(area.name, String(area.id)));
    }

    const rolesByUser = new Map();
    for (const row of roles) {
      if (!rolesByUser.has(row.user_id)) rolesByUser.set(row.user_id, []);
      rolesByUser.get(row.user_id).push({ id: row.area_id, role: row.role });
    }
    const names = new Map(profiles.map(person => [person.id, person.display_name || person.email]));
    state.people = profiles.map(person => ({
      ...person,
      areas: rolesByUser.get(person.id) || [],
      approvedByName: person.approved_by ? names.get(person.approved_by) || '' : '',
    }));
  }

  async function load({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    if (!quiet) showError('');
    try {
      await loadData();
      state.loadedOnce = true;
      render();
    } catch (error) {
      if (!state.loadedOnce) showGate(friendlyError(error), { retry: true });
      else showError(friendlyError(error));
    } finally {
      state.loading = false;
    }
  }

  async function updateNavCount() {
    if (!access(state.me).canView) return;
    try {
      const client = await UCPEAAccount.getClient();
      const { count, error } = await client.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if (error) throw error;
      els.navCount.textContent = String(count || '');
      els.navCount.hidden = !count;
      els.navLink.title = count ? `Members (${count} waiting for approval)` : 'Members';
    } catch {
      els.navCount.hidden = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Gate: signed out, not allowed, or unavailable
  // ---------------------------------------------------------------------------
  function showGate(message, { signIn = false, retry = false } = {}) {
    els.app.hidden = true;
    els.gate.hidden = false;
    els.gateText.textContent = message;
    els.gateLink.hidden = !signIn;
    els.retry.hidden = !retry;
  }

  function enter() {
    showNotice('');
    showError('');
    const me = UCPEAAccount.profile;
    state.me = me;
    if (!me) {
      showGate('Sign in to see members.', { signIn: true });
      return;
    }
    if (!access(me).canView) {
      showGate('This page is for UCPEA staff and area stewards.');
      return;
    }
    if (!state.loadedOnce) showGate('Loading members…');
    load();
  }

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(label, action, id, { primary = false, extra = {} } = {}) {
    const node = el('button', primary ? 'account-primary' : 'account-secondary', label);
    node.type = 'button';
    node.dataset.action = action;
    node.dataset.id = id;
    for (const [key, value] of Object.entries(extra)) node.dataset[key] = value;
    return node;
  }

  function areaName(id) {
    return state.areaById.get(id)?.name || `Area ${id}`;
  }

  function areasText(person) {
    if (person.areas.length) {
      return person.areas.map(area => area.role === 'steward' ? `${areaName(area.id)} (steward)` : areaName(area.id)).join(', ');
    }
    if (person.status === 'pending') {
      return person.requested_area_id != null ? `Asked for ${areaName(person.requested_area_id)}` : 'Area not chosen';
    }
    return 'No area yet';
  }

  function dateText(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function areaSelect(id, selected, { includeNone = false, placeholder = '', exclude = [] } = {}) {
    const select = el('select');
    select.id = id;
    if (includeNone) select.append(new Option('No area', ''));
    else if (placeholder) select.append(new Option(placeholder, ''));
    for (const area of state.areas) {
      if (!exclude.includes(area.id)) select.append(new Option(area.name, String(area.id)));
    }
    select.value = selected == null ? '' : String(selected);
    return select;
  }

  function field(labelText, control) {
    const wrap = el('div', 'deadline-field');
    const label = el('label', null, labelText);
    label.htmlFor = control.id;
    wrap.append(label, control);
    return wrap;
  }

  function personSummary(person) {
    const isMe = person.id === state.me.id;
    const main = el('div', 'member-main');
    main.append(el('strong', 'member-name', (person.display_name || 'No name given') + (isMe ? ' (you)' : '')));
    main.append(el('span', 'member-email', person.email || ''));

    const meta = el('div', 'member-meta');
    const badge = el('span', 'account-badge', STATUS_NAMES[person.status] || person.status);
    badge.dataset.status = person.status;
    meta.append(badge, el('span', 'member-role', ROLE_NAMES[person.role] || person.role));

    const areas = el('div', 'member-areas', areasText(person));
    return [main, meta, areas];
  }

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------
  function pendingRow(person) {
    const { isStaff, stewardAreas } = access(state.me);
    const row = el('li', 'member-row member-row-pending');
    row.append(...personSummary(person));
    row.append(el('p', 'member-sub', `Signed up ${dateText(person.created_at)}`));

    const actions = el('div', 'member-actions');
    if (isStaff) {
      const select = areaSelect(`approve-area-${person.id}`, person.requested_area_id, { includeNone: true });
      actions.append(field('Approve into', select));
      actions.append(button('Approve', 'approve', person.id, { primary: true }));
      actions.append(button('Decline', 'decline', person.id, { extra: { confirm: 'Decline' } }));
    } else if (stewardAreas.includes(person.requested_area_id)) {
      actions.append(button(`Approve into ${areaName(person.requested_area_id)}`, 'approve', person.id, { primary: true }));
    }
    row.append(actions);
    return row;
  }

  function fyiRow(person) {
    const row = el('li', 'member-row');
    row.append(...personSummary(person));
    const by = person.approvedByName ? ` by ${person.approvedByName}` : '';
    row.append(el('p', 'member-sub', `Approved${by} on ${dateText(person.approved_at)}`));
    const actions = el('div', 'member-actions');
    actions.append(button('Mark as seen', 'seen', person.id));
    row.append(actions);
    return row;
  }

  function memberRow(person) {
    const { isStaff } = access(state.me);
    const row = el('li', 'member-row');
    row.append(...personSummary(person));
    if (person.status !== 'pending' && person.approved_at) {
      const by = person.approvedByName ? ` by ${person.approvedByName}` : '';
      row.append(el('p', 'member-sub', `Approved${by} on ${dateText(person.approved_at)}`));
    }
    if (isStaff) {
      const actions = el('div', 'member-actions');
      const open = state.expanded.has(person.id);
      const toggle = button(open ? 'Close' : 'Manage', 'toggle', person.id);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-controls', `manage-${person.id}`);
      actions.append(toggle);
      row.append(actions);
      if (open) row.append(managePanel(person));
    }
    return row;
  }

  function managePanel(person) {
    const { isAdmin } = access(state.me);
    const isMe = person.id === state.me.id;
    const panel = el('div', 'member-manage');
    panel.id = `manage-${person.id}`;

    // Areas
    const areasGroup = el('div', 'member-manage-group');
    areasGroup.append(el('h3', null, 'Areas'));
    if (person.areas.length) {
      const list = el('ul', 'member-area-list');
      for (const area of person.areas) {
        const item = el('li');
        item.append(el('span', null, `${areaName(area.id)}: ${area.role === 'steward' ? 'Steward' : 'Member'}`));
        const controls = el('div', 'member-area-controls');
        controls.append(area.role === 'steward'
          ? button('Make member', 'area-role', person.id, { extra: { area: area.id, role: 'member' } })
          : button('Make steward', 'area-role', person.id, { extra: { area: area.id, role: 'steward' } }));
        controls.append(button('Remove', 'area-remove', person.id, { extra: { area: area.id, confirm: 'Remove from area' } }));
        item.append(controls);
        list.append(item);
      }
      areasGroup.append(list);
    } else {
      areasGroup.append(el('p', 'member-sub', 'Not in any area yet.'));
    }
    const addRow = el('div', 'member-manage-row');
    const addArea = areaSelect(`add-area-${person.id}`, null, {
      placeholder: 'Choose an area',
      exclude: person.areas.map(area => area.id),
    });
    const addRole = el('select');
    addRole.id = `add-role-${person.id}`;
    addRole.append(new Option('Member', 'member'), new Option('Steward', 'steward'));
    addRow.append(field('Add to area', addArea), field('As', addRole), button('Add', 'area-add', person.id));
    areasGroup.append(addRow);
    panel.append(areasGroup);

    // Account status
    if (!isMe && person.status !== 'pending') {
      const canChange = person.role === 'member' || isAdmin;
      if (canChange) {
        const statusGroup = el('div', 'member-manage-group');
        statusGroup.append(el('h3', null, 'Account'));
        statusGroup.append(person.status === 'active'
          ? button('Pause account', 'suspend', person.id, { extra: { confirm: 'Pause account' } })
          : button('Reactivate account', 'reactivate', person.id));
        panel.append(statusGroup);
      }
    }

    // Role (admins only, never their own)
    if (isAdmin && !isMe) {
      const roleGroup = el('div', 'member-manage-group');
      roleGroup.append(el('h3', null, 'Role'));
      const roleRow = el('div', 'member-manage-row');
      const select = el('select');
      select.id = `role-${person.id}`;
      for (const [value, label] of Object.entries(ROLE_NAMES)) select.append(new Option(label, value));
      select.value = person.role;
      roleRow.append(field('Role', select), button('Save role', 'role', person.id));
      roleGroup.append(roleRow);
      panel.append(roleGroup);
    }
    return panel;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function matchesFilters(person) {
    const query = els.search.value.trim().toLowerCase();
    if (query && !`${person.display_name || ''} ${person.email || ''}`.toLowerCase().includes(query)) return false;
    if (els.status.value && person.status !== els.status.value) return false;
    const area = els.areaFilter.value;
    if (area === 'none' && person.areas.length) return false;
    if (area && area !== 'none' && !person.areas.some(item => String(item.id) === area)) return false;
    return true;
  }

  function render() {
    const me = state.me;
    const { isStaff, stewardAreas } = access(me);
    els.gate.hidden = true;
    els.app.hidden = false;

    // Pending sign-ups (RLS already limits stewards to their own areas).
    const pending = state.people.filter(person => person.status === 'pending');
    els.pendingCount.textContent = pending.length ? `(${pending.length})` : '';
    els.pendingHelp.textContent = isStaff
      ? 'Approving activates the account and adds the person to the area you choose.'
      : `Sign-ups asking to join ${stewardAreas.map(areaName).join(', ')}. Approving adds them to that area; UCPEA staff are notified.`;
    els.pendingEmpty.hidden = pending.length > 0;
    els.pendingList.replaceChildren(...pending.map(pendingRow));

    // Staff FYI list
    const fyi = isStaff ? state.people.filter(person => person.approved_via === 'steward' && !person.staff_acknowledged_at) : [];
    els.fyiBlock.hidden = !fyi.length;
    els.fyiCount.textContent = fyi.length ? `(${fyi.length})` : '';
    els.fyiAll.dataset.ids = fyi.map(person => person.id).join(',');
    els.fyiList.replaceChildren(...fyi.map(fyiRow));

    // Everyone else this person may see
    els.allTitle.textContent = isStaff ? 'All members' : 'Members in your areas';
    const others = state.people.filter(person => isStaff || person.status !== 'pending');
    const shown = others.filter(matchesFilters);
    els.count.textContent = shown.length === others.length
      ? `${others.length} ${others.length === 1 ? 'person' : 'people'}`
      : `Showing ${shown.length} of ${others.length}`;
    els.list.replaceChildren(...shown.map(memberRow));

    const navCount = pending.length;
    els.navCount.textContent = String(navCount || '');
    els.navCount.hidden = !navCount;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  function expectRows(result) {
    if (result.error) throw result.error;
    if (Array.isArray(result.data) && !result.data.length) {
      const error = new Error('No rows changed.');
      error.code = 'no_rows';
      throw error;
    }
  }

  async function run(actionButton, task, success) {
    const row = actionButton.closest('.member-row, .members-block');
    const controls = row ? row.querySelectorAll('button, select, input') : [actionButton];
    for (const control of controls) control.disabled = true;
    showError('');
    showNotice('');
    try {
      const client = await UCPEAAccount.getClient();
      await task(client);
      showNotice(success);
      await load({ quiet: true });
      await UCPEAAccount.refresh().catch(() => {}); // in case you changed your own areas
    } catch (error) {
      showError(friendlyError(error));
      for (const control of controls) control.disabled = false;
    }
  }

  function personName(id) {
    const person = state.people.find(item => item.id === id);
    return person?.display_name || person?.email || 'This person';
  }

  // Destructive actions ask once more, inline, instead of a pop-up dialog.
  function needsConfirmation(target) {
    if (!target.dataset.confirm) return false;
    if (target.dataset.armed === 'true') return false;
    clearTimeout(state.confirmTimer);
    for (const armed of view.querySelectorAll('[data-armed="true"]')) {
      armed.dataset.armed = 'false';
      armed.textContent = armed.dataset.label;
    }
    target.dataset.label = target.textContent;
    target.dataset.armed = 'true';
    target.textContent = `${target.dataset.confirm}? Click again`;
    state.confirmTimer = setTimeout(() => {
      target.dataset.armed = 'false';
      target.textContent = target.dataset.label;
    }, 5000);
    return true;
  }

  view.addEventListener('click', event => {
    const target = event.target.closest('button[data-action]');
    if (!target || target.disabled) return;
    const id = target.dataset.id;
    const name = personName(id);
    const area = target.dataset.area ? Number(target.dataset.area) : null;

    switch (target.dataset.action) {
      case 'toggle':
        if (state.expanded.has(id)) state.expanded.delete(id);
        else state.expanded.add(id);
        render();
        view.querySelector(`button[data-action="toggle"][data-id="${id}"]`)?.focus();
        break;

      case 'approve': {
        const select = $(`approve-area-${id}`);
        const params = { p_user: id };
        if (select) params.p_area = select.value ? Number(select.value) : null;
        run(target, async client => {
          const { error } = await client.rpc('approve_signup', params);
          if (error) throw error;
        }, `${name} is approved.`);
        break;
      }

      case 'decline':
        if (needsConfirmation(target)) break;
        run(target, async client => expectRows(await client.from('profiles').update({ status: 'suspended' }).eq('id', id).select('id')),
          `${name}'s sign-up was declined. You can reactivate it later from All members.`);
        break;

      case 'seen':
        run(target, async client => expectRows(await client.from('profiles')
          .update({ staff_acknowledged_at: new Date().toISOString() }).eq('id', id).select('id')), `Marked ${name} as seen.`);
        break;

      case 'suspend':
        if (needsConfirmation(target)) break;
        run(target, async client => expectRows(await client.from('profiles').update({ status: 'suspended' }).eq('id', id).select('id')),
          `${name}'s account is paused.`);
        break;

      case 'reactivate':
        run(target, async client => expectRows(await client.from('profiles').update({ status: 'active' }).eq('id', id).select('id')),
          `${name}'s account is active again.`);
        break;

      case 'role': {
        const role = $(`role-${id}`).value;
        run(target, async client => expectRows(await client.from('profiles').update({ role }).eq('id', id).select('id')),
          `${name}'s role is now ${ROLE_NAMES[role]}.`);
        break;
      }

      case 'area-add': {
        const addArea = $(`add-area-${id}`);
        const role = $(`add-role-${id}`).value;
        if (!addArea.value) {
          showError('Choose an area to add.');
          addArea.focus();
          break;
        }
        const areaId = Number(addArea.value);
        run(target, async client => expectRows(await client.from('area_roles')
          .insert({ user_id: id, area_id: areaId, role }).select('user_id')),
          `${name} was added to ${areaName(areaId)}${role === 'steward' ? ' as a steward' : ''}.`);
        break;
      }

      case 'area-role': {
        const role = target.dataset.role;
        run(target, async client => expectRows(await client.from('area_roles')
          .update({ role }).eq('user_id', id).eq('area_id', area).select('user_id')),
          `${name} is now ${role === 'steward' ? 'a steward' : 'a member'} in ${areaName(area)}.`);
        break;
      }

      case 'area-remove':
        if (needsConfirmation(target)) break;
        run(target, async client => expectRows(await client.from('area_roles')
          .delete().eq('user_id', id).eq('area_id', area).select('user_id')),
          `${name} was removed from ${areaName(area)}.`);
        break;

      default:
        break;
    }
  });

  els.fyiAll.addEventListener('click', () => {
    const ids = (els.fyiAll.dataset.ids || '').split(',').filter(Boolean);
    if (!ids.length) return;
    run(els.fyiAll, async client => expectRows(await client.from('profiles')
      .update({ staff_acknowledged_at: new Date().toISOString() }).in('id', ids).select('id')),
      `Marked ${ids.length} ${ids.length === 1 ? 'approval' : 'approvals'} as seen.`);
  });

  for (const control of [els.search, els.status, els.areaFilter]) {
    control.addEventListener('input', () => { if (state.loadedOnce) render(); });
  }
  els.retry.addEventListener('click', enter);

  // ---------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------
  document.addEventListener('ucpea-account', event => {
    const profile = event.detail.profile;
    const before = access(state.me);
    state.me = profile;
    updateNav(profile);
    const after = access(profile);
    if (!profile || !after.canView) {
      state.people = [];
      state.loadedOnce = false;
      state.expanded.clear();
    }
    if (!view.hidden && (before.canView !== after.canView || !after.canView)) enter();
    if (after.canView && !before.canView) updateNavCount();
  });

  new MutationObserver(() => {
    if (!view.hidden) enter();
  }).observe(view, { attributes: true, attributeFilter: ['hidden'] });

  state.me = UCPEAAccount.profile;
  updateNav(state.me);
  if (!view.hidden) enter();
  else if (access(state.me).canView) {
    if ('requestIdleCallback' in window) requestIdleCallback(updateNavCount, { timeout: 5000 });
    else setTimeout(updateNavCount, 2000);
  }
})();
