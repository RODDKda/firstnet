// ===================== ClashNet Frontend App =====================

// 工具函数
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function api(path, opts = {}) {
  return fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
}

// Toast 通知
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// 复制到剪贴板
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success'));
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板', 'success');
  }
}

// ===================== 主页 =====================
async function initHomePage() {
  try {
    const res = await api('/status');
    const data = await res.json();

    // 更新统计数据
    document.getElementById('stat-rulesets').textContent = data.rulesets;
    document.getElementById('stat-rules').textContent = data.total_rules;
  } catch (e) {
    console.error('加载状态失败:', e);
  }
}

// ===================== 配置生成器 =====================
async function initConfigPage() {
  const checkboxesContainer = document.getElementById('service-checkboxes');
  const selectAllBtn = document.getElementById('select-all');
  const deselectAllBtn = document.getElementById('deselect-all');
  const generateBtn = document.getElementById('generate-config');
  const downloadBtn = document.getElementById('download-config');
  const copyUrlBtn = document.getElementById('copy-sub-url');
  const previewEl = document.getElementById('config-preview-content');
  const subscribeUrlEl = document.getElementById('subscribe-url-value');

  // 加载规则集列表
  try {
    const res = await api('/rulesets');
    const data = await res.json();

    checkboxesContainer.innerHTML = '';
    for (const [key, set] of Object.entries(data)) {
      const item = document.createElement('label');
      item.className = 'checkbox-item checked';
      item.innerHTML = `
        <input type="checkbox" value="${key}" checked>
        <span class="check-mark">✓</span>
        <span>${set.name}</span>
        <span class="rule-count">${set.count} 条规则</span>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const cb = item.querySelector('input');
          cb.checked = !cb.checked;
          item.classList.toggle('checked', cb.checked);
        }
      });
      checkboxesContainer.appendChild(item);
    }
  } catch (e) {
    checkboxesContainer.innerHTML = '<div class="alert alert-danger">加载规则集失败</div>';
  }

  // 全选/取消
  selectAllBtn?.addEventListener('click', () => {
    $$('.checkbox-item').forEach(el => {
      const cb = el.querySelector('input');
      cb.checked = true;
      el.classList.add('checked');
    });
  });

  deselectAllBtn?.addEventListener('click', () => {
    $$('.checkbox-item').forEach(el => {
      const cb = el.querySelector('input');
      cb.checked = false;
      el.classList.remove('checked');
    });
  });

  // 获取选中服务
  function getSelectedServices() {
    return Array.from($$('.checkbox-item input:checked')).map(cb => cb.value);
  }

  // 实时预览
  async function updatePreview() {
    const selected = getSelectedServices();
    const mode = document.getElementById('config-mode')?.value || 'rule';
    const subscription = document.getElementById('proxy-subscription')?.value || '';
    const proxies = document.getElementById('custom-proxies')?.value || '';
    const allowLan = document.getElementById('allow-lan')?.checked ?? true;

    try {
      const res = await fetch('/api/subscribe?' + new URLSearchParams({
        services: selected.join(','),
        mode,
        subscription,
        proxies,
        allow_lan: allowLan,
      }));
      const yaml = await res.text();
      previewEl.textContent = yaml;
    } catch (e) {
      previewEl.textContent = '# 生成配置失败';
    }
  }

  // 监听变化
  document.getElementById('config-mode')?.addEventListener('change', updatePreview);
  document.getElementById('proxy-subscription')?.addEventListener('input', updatePreview);
  document.getElementById('custom-proxies')?.addEventListener('input', updatePreview);
  document.getElementById('allow-lan')?.addEventListener('change', updatePreview);

  // 服务选择变化时更新预览
  document.addEventListener('change', (e) => {
    if (e.target.closest('#service-checkboxes')) {
      updatePreview();
    }
  });

  // 生成并预览
  generateBtn?.addEventListener('click', updatePreview);

  // 下载配置
  downloadBtn?.addEventListener('click', async () => {
    const selected = getSelectedServices();
    const mode = document.getElementById('config-mode')?.value || 'rule';
    const subscription = document.getElementById('proxy-subscription')?.value || '';

    try {
      const res = await fetch('/api/subscribe?' + new URLSearchParams({
        services: selected.join(','),
        mode,
        subscription,
      }));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clash-config.yaml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('配置文件已下载', 'success');
    } catch (e) {
      showToast('下载失败', 'error');
    }
  });

  // 订阅 URL
  function getSubscribeUrl() {
    const selected = getSelectedServices();
    const base = window.location.origin;
    return `${base}/api/subscribe?services=${selected.join(',')}`;
  }

  subscribeUrlEl.textContent = getSubscribeUrl();

  copyUrlBtn?.addEventListener('click', () => {
    copyToClipboard(getSubscribeUrl());
  });

  // 初始生成
  updatePreview();
}

// ===================== 规则展示页 =====================
async function initRulesPage() {
  const container = document.getElementById('ruleset-container');
  try {
    const res = await api('/rulesets');
    const list = await res.json();

    container.innerHTML = '';
    for (const [key, set] of Object.entries(list)) {
      const card = document.createElement('div');
      card.className = 'ruleset-card';

      const detailRes = await api(`/rulesets/${key}`);
      const detail = await detailRes.json();

      card.innerHTML = `
        <div class="header">
          <h4>${set.name}</h4>
          <span class="badge">${set.count} 条规则</span>
        </div>
        <p>${set.description}</p>
        <div class="rule-preview">${detail.rules.slice(0, 3).map(r => r + ',🚀 节点选择').join('<br>')}${detail.rules.length > 3 ? '<br>...' : ''}</div>
      `;
      container.appendChild(card);
    }
  } catch (e) {
    container.innerHTML = '<div class="alert alert-danger">加载规则集失败</div>';
  }
}

// ===================== 初始化 =====================
document.addEventListener('DOMContentLoaded', () => {
  // 高亮当前导航
  const currentPath = window.location.pathname;
  $$('.navbar-links a').forEach(a => {
    if (a.getAttribute('href') === currentPath || (currentPath === '/' && a.getAttribute('href') === '/')) {
      a.classList.add('active');
    }
  });

  // 根据页面初始化不同模块
  if (document.getElementById('config-preview-content')) {
    initConfigPage();
  }
  if (document.getElementById('stat-rulesets')) {
    initHomePage();
  }
  if (document.getElementById('ruleset-container')) {
    initRulesPage();
  }
});
