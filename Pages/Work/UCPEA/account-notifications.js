'use strict';

(() => {
  const panel = document.getElementById('account-notifications');
  const account = window.UCPEAAccount;
  if (!panel || !account) return;

  const view = document.getElementById('account');
  const field = name => document.getElementById(`account-notifications-${name}`);
  const status = field('status');
  const enable = field('enable');
  const test = field('test');
  const disable = field('disable');
  const retry = field('retry');
  const buttons = [enable, test, disable, retry];
  const supported = window.top === window && window.isSecureContext &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const scope = new URL('./', location.href).href;
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let generation = 0;
  let device;
  let pendingAction;
  let signingOut = false;

  function show(message, ...actions) {
    status.textContent = message;
    for (const button of buttons) button.hidden = !actions.includes(button);
    enable.parentElement.hidden = !actions.length;
  }

  async function pushFunction(client, subscriptionId) {
    return client.functions.invoke('ucpea-push-test', {
      method: subscriptionId ? 'POST' : 'GET',
      body: subscriptionId ? { subscriptionId } : undefined,
      signal: AbortSignal.timeout(12000),
    });
  }

  async function dashboardRegistration() {
    const registration = await navigator.serviceWorker.getRegistration(scope);
    if (registration?.scope === scope) return registration;
  }

  async function refresh(message) {
    const profile = account.profile;
    panel.hidden = profile?.status !== 'active';
    if (view.hidden || panel.hidden || pendingAction || signingOut) return;
    const current = ++generation;
    const wasReady = Boolean(device);
    device = undefined;

    if (isAppleMobile && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches) {
      show('On iPhone or iPad, add the dashboard to your Home Screen and open it from its icon to enable notifications.');
      return;
    }
    if (!supported) {
      show('This browser does not support dashboard notifications.');
      return;
    }
    if (!navigator.onLine) {
      show('Connect to the internet to manage notifications on this device.');
      return;
    }
    if (Notification.permission === 'denied') {
      show('Notifications are blocked. Allow them in your browser or device settings, then try again.', retry);
      return;
    }

    if (!wasReady) show('Checking notifications on this device…');
    try {
      const registration = await dashboardRegistration();
      if (!registration?.active) {
        if (current === generation) show('The dashboard is getting this device ready for notifications.', retry);
        return;
      }
      const client = await account.getClient();
      const subscription = await registration.pushManager.getSubscription();
      let subscriptionId;
      if (subscription && Notification.permission === 'granted') {
        const { data, error } = await client.from('push_subscriptions').select('id')
          .eq('endpoint', subscription.endpoint).eq('user_id', profile.id)
          .abortSignal(AbortSignal.timeout(5000)).maybeSingle();
        if (error) throw error;
        subscriptionId = data?.id;
      }

      let publicKey;
      if (!subscriptionId) {
        const { data, error } = await pushFunction(client);
        if (error || !/^[A-Za-z0-9_-]{87}$/.test(data?.publicKey || '')) throw error || new Error('Missing public key');
        publicKey = Uint8Array.from(atob(data.publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0));
      }
      if (current !== generation || account.profile?.id !== profile.id || account.profile?.status !== 'active') return;
      device = { client, registration, subscription, subscriptionId, publicKey, userId: profile.id };
      if (subscriptionId) show(message || 'Notifications are on for this device.', test, disable);
      else show(message || 'Notifications are off for this device.', enable);
    } catch {
      if (current === generation) show('Notifications are unavailable right now.', retry);
    }
  }

  function run(action, failureMessage) {
    if (!device || pendingAction || signingOut || account.profile?.status !== 'active' ||
        account.profile.id !== device.userId) return;
    ++generation;
    for (const button of buttons) button.disabled = true;
    // Start immediately so a permission request still has the click's user activation.
    pendingAction = action(device).catch(() => failureMessage).then(message => {
      pendingAction = undefined;
      for (const button of buttons) button.disabled = false;
      return refresh(message);
    });
  }

  async function removeSubscription(client, subscription, userId) {
    const deletion = client && userId && navigator.onLine
      ? client.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        .eq('user_id', userId).abortSignal(AbortSignal.timeout(4000)).then(result => !result.error, () => false)
      : Promise.resolve(false);
    // The browser may have already dropped the subscription when its permission was revoked.
    const unsubscribe = subscription.unsubscribe().then(() => true, () => false);
    const result = await Promise.all([deletion, unsubscribe]);
    return result.some(Boolean);
  }

  enable.addEventListener('click', () => run(async ({ client, registration, publicKey, userId }) => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
    if (signingOut || account.profile?.id !== userId || account.profile?.status !== 'active') return;
    const { keys } = subscription.toJSON();
    const { error } = await client.rpc('register_push_subscription', {
      p_endpoint: subscription.endpoint,
      p_p256dh: keys.p256dh,
      p_auth: keys.auth,
    }).abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
  }, 'Could not turn on notifications. Try again.'));

  test.addEventListener('click', () => run(async ({ client, subscriptionId, subscription }) => {
    const { data, error } = await pushFunction(client, subscriptionId);
    if (data?.sent === true) return 'Test sent. Look for it in your device’s notifications.';
    if (error?.context?.status === 429) return 'Please wait a minute before sending another test.';
    if (error?.context?.status === 422) return 'The push service for this browser is unsupported.';
    if (error?.context?.status === 410) {
      await subscription.unsubscribe().catch(() => {});
      return 'This subscription expired. Enable notifications again to get a new one.';
    }
    throw error || new Error('The test was not accepted');
  }, 'Could not send the test notification. Try again.'));

  disable.addEventListener('click', () => run(async ({ client, registration, subscription, userId }) => {
    if (!await removeSubscription(client, subscription, userId)) throw new Error('Could not remove subscription');
    const notifications = await registration.getNotifications().catch(() => []);
    notifications.forEach(notification => notification.close());
  }, 'Could not turn off notifications. Try again.'));

  retry.addEventListener('click', () => refresh());
  document.addEventListener('ucpea-account', () => { ++generation; refresh(); });
  new MutationObserver(() => refresh()).observe(view, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('online', () => refresh());
  window.addEventListener('offline', () => refresh());
  if (supported) navigator.serviceWorker.addEventListener('controllerchange', () => refresh());
  refresh();

  window.UCPEANotifications = {
    async disconnect(client) {
      if (!supported) return;
      signingOut = true;
      ++generation;
      const userId = account.profile?.id;
      try {
        await pendingAction;
        const registration = await dashboardRegistration();
        if (!registration) return;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await removeSubscription(client, subscription, userId);
        const notifications = await registration.getNotifications();
        notifications.forEach(notification => notification.close());
      } catch {
        // Signing out still works if push or the network is unavailable.
      } finally {
        signingOut = false;
        device = undefined;
      }
    },
  };
})();
