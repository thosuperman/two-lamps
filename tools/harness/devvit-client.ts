// Local stand-in for @devvit/web/client, for the visual harness only.
const params = new URLSearchParams(location.search);
export const context = { postData: { day: params.get('day') ?? new Date().toISOString().slice(0, 10) }, postId: 't3_local' };
export const showToast = (t: string | { text: string }) => {
  const el = document.createElement('div');
  el.textContent = typeof t === 'string' ? t : t.text;
  el.setAttribute('data-toast', '1');
  el.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:12px;font:600 14px system-ui;z-index:99';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
};
export const showShareSheet = async (o: { text?: string }) => showToast(`share sheet: ${o.text ?? ''}`);
export const showLoginPrompt = () => showToast('login prompt');
export const requestExpandedMode = () => (location.href = `index.html${location.search}`);
