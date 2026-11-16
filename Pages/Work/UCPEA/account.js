'use strict';

// UCPEA member accounts: emailed-code sign-in, sign-up, and the Account view.
//
// The Supabase library (~220 KB) only loads when it is needed: when someone
// opens the Account view, or when this device already has a signed-in session.
// Visitors who never sign in never download it. The site build copies the
// library from node_modules into Pages/Updates/vendor/ (scripts/build-site.mjs).
(() => {
  const SUPABASE_URL = 'https://bjfrwucqfurlunhdhlis.supabase.co';
  // Publishable keys are meant to be public; the database's row-level security
  // policies decide what each person can read or change.
  const SUPABASE_KEY = 'sb_publishable_KyvEUUu_ydn7r1ulscV4hw_O7Rxu7sI';
  const SESSION_KEY = 'sb-bjfrwucqfurlunhdhlis-auth-token';
  const PROFILE_KEY = 'ucpea-account-profile';
  const MEMBER_CACHE_PREFIX = 'ucpea-member-';
  const LIBRARY_URL = new URL('../../Updates/vendor/supabase.js', document.baseURI).href;
  const RESEND_SECONDS = 60;

  const view = document.getElementById('account');
  if (!view) return;

  const $ = id => document.getElementById(id);
  const els = {
    steps: Array.from(view.querySelectorAll('[data-account-step]')),
    notice: $('account-notice'),
    error: $('account-error'),
    headerButton: $('account-button'),
    menu: $('account-menu'),
    menuButton: $('account-menu-button'),
    menuPanel: $('account-menu-panel'),
    menuFirstName: $('account-menu-first-name'),
    menuFullName: $('account-menu-full-name'),
    menuEmail: $('account-menu-email'),
    menuView: $('account-menu-view'),
    menuSignOut: $('account-menu-sign-out'),
    sidebarLink: $('sidebar-account'),
    signInForm: $('account-sign-in'),
    signInEmail: $('sign-in-email'),
    signUpForm: $('account-sign-up'),
    signUpFirstName: $('sign-up-first-name'),
    signUpLastName: $('sign-up-last-name'),
    signUpEmail: $('sign-up-email'),
    signUpArea: $('sign-up-area'),
    codeForm: $('account-code'),
    codeEmail: $('account-code-email'),
    codeInput: $('account-code-input'),
    resend: $('account-resend'),
    badge: $('account-badge'),
    name: $('account-name'),
    email: $('account-email'),
    role: $('account-role'),
    areasLabel: $('account-areas-label'),
    areas: $('account-areas'),
    pendingNote: $('account-pending-note'),
    suspendedNote: $('account-suspended-note'),
    offlineNote: $('account-offline-note'),
    detailsForm: $('account-details-form'),
    firstNameInput: $('account-first-name'),
    lastNameInput: $('account-last-name'),
    areaField: $('account-area-field'),
    areaInput: $('account-area-input'),
    signOut: $('account-sign-out'),
  };

  const state = {
    step: 'loading',
    pending: null, // { email, createUser, firstName, lastName, areaId } while waiting for a code
    profile: null,
    areas: null,
    resendTimer: 0,
    resendUntil: 0,
    loaded: false,
  };

  // ---------------------------------------------------------------------------
  // Storage helpers (all optional: private browsing can block storage)
  // ---------------------------------------------------------------------------
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function writeStorage(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Saving for offline use is a convenience, not a requirement.
    }
  }

  function hasStoredSession() {
    return Boolean(readStorage(SESSION_KEY));
  }

  function readCachedProfile() {
    try { return JSON.parse(readStorage(PROFILE_KEY)) || null; } catch { return null; }
  }

  // ---------------------------------------------------------------------------
  // Supabase client, loaded on demand
  // ---------------------------------------------------------------------------
  let clientPromise;

  function getClient() {
    clientPromise ??= new Promise((resolve, reject) => {
      const create = () => window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storageKey: SESSION_KEY,
          persistSession: true,
          autoRefreshToken: true,
          // Lets an emailed sign-in *link* work too, on devices that open it in this browser.
          detectSessionInUrl: true,
        },
      });
      if (window.supabase?.createClient) {
        resolve(create());
        return;
      }
      const script = document.createElement('script');
      script.src = LIBRARY_URL;
      script.async = true;
      script.onload = () => {
        if (window.supabase?.createClient) resolve(create());
        else reject(new Error('Supabase library did not load.'));
      };
      script.onerror = () => reject(new Error('Supabase library did not load.'));
      document.head.append(script);
    }).then(client => {
      client.auth.onAuthStateChange((event, session) => {
        // Another tab signed out, or the session could not be refreshed.
        if (event === 'SIGNED_OUT' && state.profile) {
          setTimeout(() => clearLocalAccount().then(() => {
            if (!view.hidden) showStep('sign-in');
          }));
        }
        if (event === 'SIGNED_IN' && session && !state.profile) {
          setTimeout(() => refreshProfile(client, session.user));
        }
      });
      return client;
    }).catch(error => {
      clientPromise = undefined;
      throw error;
    });
    return clientPromise;
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

  function clearMessages() {
    showError('');
    showNotice('');
  }

  function friendlyError(error) {
    const code = error?.code || '';
    const message = error?.message || '';
    if (!navigator.onLine) return "You're offline. Connect to the internet and try again.";
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit|security purposes/i.test(message)) {
      return 'Too many sign-in emails were requested just now. Wait a minute and try again.';
    }
    if (code === 'otp_disabled' || /signups not allowed/i.test(message)) {
      return "We couldn't find an account for that email. Check the spelling, or create an account.";
    }
    if (code === 'otp_expired' || /expired|invalid.*(token|otp)|token.*invalid/i.test(message)) {
      return "That code didn't work. Check the most recent email, or send a new code.";
    }
    if (code === 'email_address_not_authorized' || /not authorized/i.test(message)) {
      return "Sign-in emails can't be sent to that address yet. UCPEA is still setting up email delivery.";
    }
    if (code === 'email_address_invalid' || /email.*invalid|invalid.*email/i.test(message)) {
      return "That email address doesn't look right.";
    }
    if (/library did not load|failed to fetch|network/i.test(message)) {
      return "Couldn't reach the sign-in service. Check your connection and try again.";
    }
    return 'Something went wrong. Please try again.';
  }

  // ---------------------------------------------------------------------------
  // Header and sidebar indicator
  // ---------------------------------------------------------------------------
  function setIndicator(profile) {
    const status = profile ? profile.status : 'signed-out';
    const label = profile ? 'Your account' : 'Sign in';
    document.body.dataset.account = status;
    els.headerButton?.setAttribute('aria-label', label);
    if (els.headerButton) els.headerButton.title = label;
    if (els.sidebarLink) {
      els.sidebarLink.title = profile ? 'Account' : 'Sign in';
      els.sidebarLink.querySelector('.sidebar-label').textContent = profile ? 'Account' : 'Sign in';
    }
    // Signed in: the header shows the account menu (icon and first name) in
    // place of the plain sign-in link.
    if (els.menu) {
      const signedIn = Boolean(profile);
      if (!signedIn) setMenuOpen(false);
      els.menu.hidden = !signedIn;
      els.headerButton.hidden = signedIn;
      if (signedIn) {
        const firstName = (profile.firstName ?? splitName(profile.displayName).firstName) || '';
        els.menuFirstName.textContent = firstName || 'Account';
        els.menuButton.setAttribute('aria-label', firstName ? `Account menu for ${firstName}` : 'Account menu');
        els.menuFullName.textContent = profile.displayName || firstName || 'Your account';
        els.menuEmail.textContent = profile.email || '';
      }
    }
    document.dispatchEvent(new CustomEvent('ucpea-account', { detail: { profile } }));
  }

  // ---------------------------------------------------------------------------
  // Header account menu: View Account and Sign Out
  // ---------------------------------------------------------------------------
  let menuWatcher = null;

  function setMenuOpen(open, { focus = false } = {}) {
    if (!els.menu) return;
    els.menuPanel.hidden = !open;
    els.menuButton.setAttribute('aria-expanded', String(open));
    // Android back closes the menu instead of leaving the page.
    if (!open) {
      menuWatcher?.destroy();
      menuWatcher = null;
    } else if (!menuWatcher && typeof UCPEAWatchClose === 'function') {
      menuWatcher = UCPEAWatchClose(() => {
        menuWatcher = null;
        if (els.menuPanel.hidden) return;
        setMenuOpen(false);
        els.menuButton.focus({ preventScroll: true });
      });
    }
    if (open && focus) els.menuView.focus();
  }

  els.menuButton?.addEventListener('click', () => {
    const open = els.menuPanel.hidden;
    // Opened from the keyboard, focus lands on the first item.
    setMenuOpen(open, { focus: open && els.menuButton.matches(':focus-visible') });
  });

  els.menuView?.addEventListener('click', () => setMenuOpen(false));

  els.menuSignOut?.addEventListener('click', async () => {
    setMenuOpen(false);
    await signOut();
    // The plain sign-in icon is back in the menu's place; keep focus there.
    els.headerButton.focus({ preventScroll: true });
  });

  // Close on Escape (focus back to the button), a click elsewhere, or tabbing out.
  els.menu?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || els.menuPanel.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);
    els.menuButton.focus();
  });

  document.addEventListener('click', event => {
    if (els.menu && !els.menuPanel.hidden && !els.menu.contains(event.target)) setMenuOpen(false);
  });

  els.menu?.addEventListener('focusout', event => {
    if (event.relatedTarget && !els.menu.contains(event.relatedTarget)) setMenuOpen(false);
  });

  // ---------------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------------
  function showStep(step, { focus = true } = {}) {
    state.step = step;
    for (const element of els.steps) element.hidden = element.dataset.accountStep !== step;
    if (!focus || view.hidden) return;
    const target = view.querySelector(`[data-account-step="${step}"] h2`);
    target?.focus({ preventScroll: true });
  }

  function setBusy(form, busy) {
    for (const control of form.querySelectorAll('button, input, select')) control.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
    if (!busy && form === els.codeForm) updateResendButton();
  }

  // ---------------------------------------------------------------------------
  // Areas (public list, used by the sign-up form and pending accounts)
  // ---------------------------------------------------------------------------
  function areaLabel(area) {
    const description = (area.description || '').replace(/\s+/g, ' ').trim();
    const short = description.length > 64 ? description.slice(0, 62).replace(/[\s,;:.]+\S*$/, '') + '…' : description;
    return short ? `${area.name}: ${short}` : area.name;
  }

  async function loadAreas() {
    if (state.areas) return state.areas;
    const client = await getClient();
    const { data, error } = await client.from('areas').select('id, name, description').eq('is_active', true).order('id');
    if (error) throw error;
    state.areas = data;
    return data;
  }

  function fillAreaSelect(select, areas, selected) {
    const current = selected ?? select.value;
    select.replaceChildren(new Option('Not sure', ''));
    for (const area of areas) select.append(new Option(areaLabel(area), String(area.id)));
    select.value = current == null ? '' : String(current);
  }

  async function prepareSignUp() {
    try {
      fillAreaSelect(els.signUpArea, await loadAreas());
    } catch {
      // The form still works without the list; staff can set the area later.
    }
  }

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------
  function cleanName(value) {
    return value.trim().replace(/\s+/g, ' ');
  }

  // Profiles saved before first and last names were split hold one full name:
  // the last word is the last name, as the database migration splits it.
  function splitName(fullName) {
    const name = cleanName(fullName || '');
    const space = name.lastIndexOf(' ');
    return space === -1
      ? { firstName: name, lastName: '' }
      : { firstName: name.slice(0, space), lastName: name.slice(space + 1) };
  }

  async function fetchProfile(client, user) {
    const [profileResult, rolesResult] = await Promise.all([
      // Every column, so this keeps working whether or not the first/last
      // name migration has run yet.
      client.from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
      client.from('area_roles')
        .select('area_id, role, areas(name)')
        .eq('user_id', user.id)
        .order('area_id'),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (!profileResult.data) {
      const missing = new Error('No profile for this account.');
      missing.code = 'profile_missing';
      throw missing;
    }

    const profile = profileResult.data;
    let requestedAreaName = '';
    if (profile.requested_area_id != null) {
      try {
        const areas = await loadAreas();
        requestedAreaName = areas.find(area => area.id === profile.requested_area_id)?.name || '';
      } catch {
        requestedAreaName = `Area ${profile.requested_area_id}`;
      }
    }

    return {
      id: profile.id,
      email: profile.email || user.email || '',
      displayName: profile.display_name || '',
      ...('first_name' in profile
        ? { firstName: profile.first_name || '', lastName: profile.last_name || '' }
        : splitName(profile.display_name)),
      role: profile.role,
      status: profile.status,
      requestedAreaId: profile.requested_area_id,
      requestedAreaName,
      areas: (rolesResult.data || []).map(row => ({
        id: row.area_id,
        name: row.areas?.name || `Area ${row.area_id}`,
        role: row.role,
      })),
      savedAt: new Date().toISOString(),
    };
  }

  function setProfile(profile) {
    state.profile = profile;
    writeStorage(PROFILE_KEY, profile ? JSON.stringify(profile) : null);
    setIndicator(profile);
  }

  async function refreshProfile(client, user) {
    const profile = await fetchProfile(client, user);
    setProfile(profile);
    if (!view.hidden && ['loading', 'profile', 'code'].includes(state.step)) renderProfile({ offline: false });
    return profile;
  }

  function roleText(profile) {
    const stewardAreas = profile.areas.filter(area => area.role === 'steward').map(area => area.name);
    const base = { admin: 'Administrator', staff: 'UCPEA staff', member: 'Member' }[profile.role] || 'Member';
    return stewardAreas.length ? `${base}, steward for ${stewardAreas.join(', ')}` : base;
  }

  function renderProfile({ offline = false, focus = true } = {}) {
    const profile = state.profile;
    if (!profile) return;
    const status = profile.status;
    const badges = { active: 'Approved member', pending: 'Waiting for approval', suspended: 'Account paused' };

    els.badge.textContent = badges[status] || status;
    els.badge.dataset.status = status;
    els.name.textContent = profile.displayName || 'Welcome';
    els.email.textContent = profile.email;
    els.role.textContent = roleText(profile);

    if (profile.areas.length) {
      els.areasLabel.textContent = profile.areas.length > 1 ? 'Areas' : 'Area';
      els.areas.textContent = profile.areas
        .map(area => area.role === 'steward' ? `${area.name} (steward)` : area.name)
        .join(', ');
    } else if (status === 'pending') {
      els.areasLabel.textContent = 'Requested area';
      els.areas.textContent = profile.requestedAreaName || 'Not chosen yet';
    } else {
      els.areasLabel.textContent = 'Area';
      els.areas.textContent = 'None yet';
    }

    els.pendingNote.hidden = status !== 'pending';
    if (status === 'pending') {
      els.pendingNote.textContent = profile.requestedAreaName
        ? `UCPEA staff or a steward for ${profile.requestedAreaName} will review your request. Members-only pages open here once you're approved.`
        : "UCPEA staff will review your request. Choosing your area below helps the right steward find it. Members-only pages open here once you're approved.";
    }
    els.suspendedNote.hidden = status !== 'suspended';
    els.offlineNote.hidden = !offline;

    // A profile saved on this device before the split has only displayName.
    const { firstName, lastName } = profile.firstName == null ? splitName(profile.displayName) : profile;
    els.firstNameInput.value = firstName;
    els.lastNameInput.value = lastName;
    els.areaField.hidden = status !== 'pending';
    if (status === 'pending') {
      if (state.areas) fillAreaSelect(els.areaInput, state.areas, profile.requestedAreaId);
      else loadAreas().then(areas => fillAreaSelect(els.areaInput, areas, profile.requestedAreaId)).catch(() => {});
    }
    setBusy(els.detailsForm, offline);
    els.signOut.disabled = false;

    if (state.step !== 'profile') showStep('profile', { focus: false });
    if (focus && !view.hidden) els.name.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------
  // Loading the account when the view opens
  // ---------------------------------------------------------------------------
  function readLinkResult() {
    const params = new URLSearchParams(location.hash.slice(1));
    return {
      signingIn: params.has('access_token'),
      error: params.get('error_description') || params.get('error') || '',
    };
  }

  async function loadAccount() {
    clearMessages();
    const link = readLinkResult();
    if (link.error) {
      // An expired or already-used emailed link lands here with an error in the URL.
      history.replaceState(history.state, '', location.pathname + location.search);
      setProfile(null);
      showStep('sign-in');
      showError('That sign-in link has expired or was already used. Enter your email to get a new code.');
      return;
    }
    if (!hasStoredSession() && !link.signingIn) {
      setProfile(null);
      showStep('sign-in');
      getClient().catch(() => {}); // warm up for the next step
      return;
    }

    const cached = state.profile || readCachedProfile();
    if (cached) {
      state.profile = cached;
      renderProfile({ offline: !navigator.onLine });
    } else {
      showStep('loading', { focus: false });
    }

    try {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        await clearLocalAccount();
        showStep('sign-in');
        return;
      }
      await refreshProfile(client, data.session.user);
      renderProfile({ offline: false, focus: !cached });
    } catch (error) {
      if (error?.code === 'profile_missing') {
        showError("Your sign-in worked, but your member profile wasn't found. Please contact UCPEA.");
        showStep('unavailable');
        return;
      }
      if (state.profile) {
        renderProfile({ offline: true, focus: false });
      } else {
        showStep('unavailable');
      }
    }
  }

  async function clearLocalAccount() {
    setProfile(null);
    state.pending = null;
    writeStorage(SESSION_KEY, null);
    // Members-only pages cached for offline use belong to the signed-in person.
    try {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith(MEMBER_CACHE_PREFIX)).map(name => caches.delete(name)));
    } catch {
      // Cache Storage is unavailable outside secure contexts.
    }
  }

  // ---------------------------------------------------------------------------
  // Sending and checking codes
  // ---------------------------------------------------------------------------
  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function sendCode(request, form) {
    clearMessages();
    setBusy(form, true);
    try {
      const client = await getClient();
      const dashboard = new URL('index.html', document.baseURI);
      dashboard.searchParams.set('view', 'account');
      const { error } = await client.auth.signInWithOtp({
        email: request.email,
        options: {
          shouldCreateUser: request.createUser,
          emailRedirectTo: dashboard.href,
          // display_name is the full name, for a database that hasn't had
          // the first/last name migration yet.
          data: request.createUser
            ? {
              first_name: request.firstName,
              last_name: request.lastName,
              display_name: `${request.firstName} ${request.lastName}`,
              requested_area_id: request.areaId || '',
            }
            : undefined,
        },
      });
      if (error) throw error;
      state.pending = request;
      els.codeEmail.textContent = request.email;
      els.codeInput.value = '';
      startResendCooldown();
      showStep('code');
      els.codeInput.focus();
      showNotice(`We sent a sign-in email to ${request.email}. It can take a minute to arrive.`);
    } catch (error) {
      showError(friendlyError(error));
    } finally {
      setBusy(form, false);
    }
  }

  function startResendCooldown() {
    state.resendUntil = Date.now() + RESEND_SECONDS * 1000;
    clearInterval(state.resendTimer);
    state.resendTimer = setInterval(updateResendButton, 1000);
    updateResendButton();
  }

  function updateResendButton() {
    const remaining = Math.ceil((state.resendUntil - Date.now()) / 1000);
    if (remaining > 0) {
      els.resend.disabled = true;
      els.resend.textContent = `Send a new code (${remaining}s)`;
    } else {
      clearInterval(state.resendTimer);
      els.resend.disabled = false;
      els.resend.textContent = 'Send a new code';
    }
  }

  els.signInForm.addEventListener('submit', event => {
    event.preventDefault();
    const email = els.signInEmail.value.trim().toLowerCase();
    if (!validEmail(email)) {
      showError('Enter the email address you signed up with.');
      els.signInEmail.focus();
      return;
    }
    sendCode({ email, createUser: false }, els.signInForm);
  });

  els.signUpForm.addEventListener('submit', event => {
    event.preventDefault();
    const firstName = cleanName(els.signUpFirstName.value);
    const lastName = cleanName(els.signUpLastName.value);
    const email = els.signUpEmail.value.trim().toLowerCase();
    if (!firstName || !lastName) {
      showError('Enter your first and last name so UCPEA can recognize your request.');
      (firstName ? els.signUpLastName : els.signUpFirstName).focus();
      return;
    }
    if (!validEmail(email)) {
      showError("That email address doesn't look right.");
      els.signUpEmail.focus();
      return;
    }
    sendCode({ email, createUser: true, firstName, lastName, areaId: els.signUpArea.value }, els.signUpForm);
  });

  els.resend.addEventListener('click', () => {
    if (state.pending) sendCode(state.pending, els.codeForm);
  });

  els.codeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const token = els.codeInput.value.replace(/\D/g, '');
    if (token.length < 6) {
      showError('Enter the full code from the email.');
      els.codeInput.focus();
      return;
    }
    clearMessages();
    setBusy(els.codeForm, true);
    try {
      const client = await getClient();
      const { data, error } = await client.auth.verifyOtp({ email: state.pending.email, token, type: 'email' });
      if (error) throw error;
      clearInterval(state.resendTimer);
      const wasNew = state.pending.createUser;
      state.pending = null;
      const profile = await refreshProfile(client, data.user);
      renderProfile();
      showNotice(profile.status === 'pending'
        ? (wasNew ? "You're signed in. Your account is waiting for approval." : "You're signed in. Your account is still waiting for approval.")
        : "You're signed in.");
    } catch (error) {
      if (error?.code === 'profile_missing') {
        showError("Your sign-in worked, but your member profile wasn't found. Please contact UCPEA.");
      } else {
        showError(friendlyError(error));
      }
      els.codeInput.select();
    } finally {
      setBusy(els.codeForm, false);
    }
  });

  // Typing or pasting a code: keep digits only.
  els.codeInput.addEventListener('input', () => {
    const digits = els.codeInput.value.replace(/\D/g, '');
    if (digits !== els.codeInput.value) els.codeInput.value = digits;
  });

  view.addEventListener('click', event => {
    const go = event.target.closest('[data-account-go]');
    if (go) {
      clearMessages();
      const target = go.dataset.accountGo;
      if (target === 'back') {
        clearInterval(state.resendTimer);
        const previous = state.pending;
        state.pending = null;
        if (previous?.createUser) {
          els.signUpEmail.value = previous.email;
          showStep('sign-up');
        } else {
          els.signInEmail.value = previous?.email || '';
          showStep('sign-in');
        }
        return;
      }
      // Carry the email across so nobody types it twice.
      if (target === 'sign-up') {
        els.signUpEmail.value ||= els.signInEmail.value.trim();
        prepareSignUp();
      } else {
        els.signInEmail.value ||= els.signUpEmail.value.trim();
      }
      showStep(target);
      return;
    }
    if (event.target.closest('[data-account-retry]')) loadAccount();
  });

  // ---------------------------------------------------------------------------
  // Editing details and signing out
  // ---------------------------------------------------------------------------
  els.detailsForm.addEventListener('submit', async event => {
    event.preventDefault();
    const profile = state.profile;
    if (!profile) return;
    const firstName = cleanName(els.firstNameInput.value);
    const lastName = cleanName(els.lastNameInput.value);
    if (!firstName || !lastName) {
      showError('Enter both your first and last name.');
      (firstName ? els.lastNameInput : els.firstNameInput).focus();
      return;
    }
    const changes = {};
    if (firstName !== profile.firstName) changes.first_name = firstName;
    if (lastName !== profile.lastName) changes.last_name = lastName;
    if (profile.status === 'pending') {
      const areaId = els.areaInput.value ? Number(els.areaInput.value) : null;
      if (areaId !== profile.requestedAreaId) changes.requested_area_id = areaId;
    }
    clearMessages();
    if (!Object.keys(changes).length) {
      showNotice('Nothing to save. Your details are up to date.');
      return;
    }
    setBusy(els.detailsForm, true);
    try {
      const client = await getClient();
      const { data, error } = await client.from('profiles').update(changes).eq('id', profile.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('No rows updated.');
      const { data: sessionData } = await client.auth.getSession();
      await refreshProfile(client, sessionData.session.user);
      renderProfile({ focus: false });
      showNotice('Your details were saved.');
    } catch (error) {
      showError(friendlyError(error));
    } finally {
      setBusy(els.detailsForm, false);
    }
  });

  // Used by the Account page's Sign out button and the header menu.
  async function signOut() {
    els.signOut.disabled = true;
    clearMessages();
    const client = await getClient().catch(() => null);
    await window.UCPEANotifications?.disconnect(client);
    try {
      // Local scope: signs out this device only, and works offline.
      await client?.auth.signOut({ scope: 'local' });
    } catch {
      // Even if the library can't load, forget the session on this device.
    }
    await clearLocalAccount();
    els.signInEmail.value = '';
    showStep('sign-in', { focus: false });
    showNotice("You're signed out on this device.");
    els.signOut.disabled = false;
  }

  els.signOut.addEventListener('click', async () => {
    await signOut();
    showStep('sign-in');
  });

  // ---------------------------------------------------------------------------
  // Shared with other members-only views (members.js). They listen for the
  // 'ucpea-account' event, which fires whenever the signed-in profile changes.
  // ---------------------------------------------------------------------------
  window.UCPEAAccount = {
    // Public values (see the note on SUPABASE_KEY above), for lightweight
    // read-only requests that don't need the full library.
    config: { url: SUPABASE_URL, key: SUPABASE_KEY },
    getClient,
    get profile() { return state.profile; },
    async refresh() {
      const client = await getClient();
      const { data } = await client.auth.getSession();
      return data.session ? refreshProfile(client, data.session.user) : null;
    },
  };

  // ---------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------
  // The dashboard shows and hides views with the hidden attribute.
  new MutationObserver(() => {
    if (view.hidden) return;
    if (!state.loaded || state.step === 'loading' || state.step === 'unavailable') {
      state.loaded = true;
      loadAccount();
    } else if (state.step === 'profile') {
      renderProfile({ offline: !navigator.onLine, focus: false });
    }
  }).observe(view, { attributes: true, attributeFilter: ['hidden'] });

  const cached = hasStoredSession() ? readCachedProfile() : null;
  if (!cached) writeStorage(PROFILE_KEY, null);
  state.profile = cached;
  setIndicator(cached);

  if (!view.hidden) {
    state.loaded = true;
    loadAccount();
  } else if (hasStoredSession() || /[#&]access_token=/.test(location.hash)) {
    // Refresh the saved profile quietly so approvals show up without a visit to Account.
    const refresh = () => getClient()
      .then(async client => {
        const { data } = await client.auth.getSession();
        if (data.session) await refreshProfile(client, data.session.user);
        else await clearLocalAccount();
      })
      .catch(() => {});
    if ('requestIdleCallback' in window) requestIdleCallback(refresh, { timeout: 4000 });
    else setTimeout(refresh, 1500);
  }
})();
