require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'localhost';

// ===================== 中间件 =====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ===================== Clash 规则集数据 =====================
const RULE_SETS = {
  google: {
    name: 'Google 服务',
    description: 'Google 搜索、邮箱、云盘、地图等全部服务',
    rules: [
      'DOMAIN-SUFFIX,google.com',
      'DOMAIN-SUFFIX,google.com.hk',
      'DOMAIN-SUFFIX,google.co.jp',
      'DOMAIN-SUFFIX,google.co.uk',
      'DOMAIN-SUFFIX,google.ca',
      'DOMAIN-SUFFIX,google.de',
      'DOMAIN-SUFFIX,google.fr',
      'DOMAIN-SUFFIX,google.com.au',
      'DOMAIN-SUFFIX,googleapis.com',
      'DOMAIN-SUFFIX,googleadservices.com',
      'DOMAIN-SUFFIX,google-analytics.com',
      'DOMAIN-SUFFIX,googlevideo.com',
      'DOMAIN-SUFFIX,gstatic.com',
      'DOMAIN-SUFFIX,googleusercontent.com',
      'DOMAIN-SUFFIX,googleapis.cn',
      'DOMAIN-SUFFIX,gmail.com',
      'DOMAIN-SUFFIX,mail.google.com',
      'DOMAIN-SUFFIX,drive.google.com',
      'DOMAIN-SUFFIX,photos.google.com',
      'DOMAIN-SUFFIX,calendar.google.com',
      'DOMAIN-SUFFIX,google.drive.com',
      'DOMAIN-SUFFIX,youtube.com',
      'DOMAIN-SUFFIX,ytimg.com',
      'DOMAIN-SUFFIX,youtu.be',
      'DOMAIN-SUFFIX,yt3.ggpht.com',
      'DOMAIN-KEYWORD,youtube',
      'DOMAIN-KEYWORD,google',
    ]
  },
  github: {
    name: 'GitHub',
    description: 'GitHub 代码托管、Actions、Pages 等服务',
    rules: [
      'DOMAIN-SUFFIX,github.com',
      'DOMAIN-SUFFIX,github.io',
      'DOMAIN-SUFFIX,githubusercontent.com',
      'DOMAIN-SUFFIX,githubassets.com',
      'DOMAIN-SUFFIX,githubstatus.com',
      'DOMAIN-SUFFIX,githubapp.com',
      'DOMAIN-SUFFIX,github.dev',
      'DOMAIN-SUFFIX,githubcopilot.com',
      'DOMAIN-SUFFIX,github.blog',
      'DOMAIN-SUFFIX,raw.githubusercontent.com',
      'DOMAIN-SUFFIX,gist.github.com',
      'DOMAIN-SUFFIX,api.github.com',
      'DOMAIN-SUFFIX,objects.githubusercontent.com',
      'DOMAIN-SUFFIX,pages.github.com',
      'DOMAIN-SUFFIX,github.community',
      'DOMAIN-KEYWORD,github',
    ]
  },
  telegram: {
    name: 'Telegram',
    description: 'Telegram 即时通讯及 Bot API',
    rules: [
      'DOMAIN-SUFFIX,telegram.org',
      'DOMAIN-SUFFIX,t.me',
      'DOMAIN-SUFFIX,telegram.me',
      'DOMAIN-SUFFIX,telegra.ph',
      'DOMAIN-SUFFIX,telesco.pe',
      'DOMAIN-SUFFIX,cdn-telegram.org',
      'DOMAIN-SUFFIX,api.telegram.org',
      'DOMAIN-SUFFIX,tx.me',
      'DOMAIN-SUFFIX,tg.dev',
      'DOMAIN-SUFFIX,gramshift.com',
      'DOMAIN-SUFFIX,tdesktop.com',
      'IP-CIDR,91.108.4.0/22,no-resolve',
      'IP-CIDR,91.108.8.0/22,no-resolve',
      'IP-CIDR,91.108.12.0/22,no-resolve',
      'IP-CIDR,91.108.16.0/22,no-resolve',
      'IP-CIDR,91.108.56.0/22,no-resolve',
      'IP-CIDR,91.108.56.0/23,no-resolve',
      'IP-CIDR,95.161.64.0/20,no-resolve',
      'IP-CIDR,149.154.160.0/20,no-resolve',
      'IP-CIDR,149.154.164.0/22,no-resolve',
      'IP-CIDR,149.154.168.0/22,no-resolve',
      'IP-CIDR,149.154.172.0/22,no-resolve',
      'IP-CIDR,2001:b28:f23f::/48,no-resolve',
      'IP-CIDR,2001:b28:f23d::/48,no-resolve',
      'IP-CIDR,2001:b28:f23e::/48,no-resolve',
    ]
  },
  twitter: {
    name: 'Twitter / X',
    description: 'Twitter/X 社交媒体',
    rules: [
      'DOMAIN-SUFFIX,twitter.com',
      'DOMAIN-SUFFIX,x.com',
      'DOMAIN-SUFFIX,t.co',
      'DOMAIN-SUFFIX,ads-twitter.com',
      'DOMAIN-SUFFIX,twimg.com',
      'DOMAIN-SUFFIX,abs.twimg.com',
      'DOMAIN-SUFFIX,pbs.twimg.com',
      'DOMAIN-SUFFIX,video.twimg.com',
      'DOMAIN-SUFFIX,twitteroauth.com',
      'DOMAIN-SUFFIX,twitterinc.com',
      'DOMAIN-SUFFIX,periscope.tv',
      'DOMAIN-SUFFIX,pscp.tv',
      'DOMAIN-KEYWORD,twitter',
    ]
  },
  microsoft: {
    name: 'Microsoft / Bing',
    description: 'Microsoft 服务、Bing、Windows 更新相关',
    rules: [
      'DOMAIN-SUFFIX,microsoft.com',
      'DOMAIN-SUFFIX,live.com',
      'DOMAIN-SUFFIX,office.com',
      'DOMAIN-SUFFIX,office365.com',
      'DOMAIN-SUFFIX,msn.com',
      'DOMAIN-SUFFIX,bing.com',
      'DOMAIN-SUFFIX,msdn.com',
      'DOMAIN-SUFFIX,visualstudio.com',
      'DOMAIN-SUFFIX,vscode.dev',
      'DOMAIN-SUFFIX,azure.com',
      'DOMAIN-SUFFIX,azureedge.net',
      'DOMAIN-SUFFIX,azurefd.net',
      'DOMAIN-SUFFIX,onedrive.com',
      'DOMAIN-SUFFIX,sharepoint.com',
      'DOMAIN-SUFFIX,office.net',
      'DOMAIN-SUFFIX,skype.com',
      'DOMAIN-SUFFIX,outlook.com',
      'DOMAIN-SUFFIX,hotmail.com',
      'DOMAIN-SUFFIX,teams.microsoft.com',
    ]
  },
  social: {
    name: '社交与媒体',
    description: '常见社交与流媒体服务',
    rules: [
      'DOMAIN-SUFFIX,instagram.com',
      'DOMAIN-SUFFIX,cdninstagram.com',
      'DOMAIN-SUFFIX,facebook.com',
      'DOMAIN-SUFFIX,fbcdn.net',
      'DOMAIN-SUFFIX,messenger.com',
      'DOMAIN-SUFFIX,whatsapp.com',
      'DOMAIN-SUFFIX,whatsapp.net',
      'DOMAIN-SUFFIX,reddit.com',
      'DOMAIN-SUFFIX,redditmedia.com',
      'DOMAIN-SUFFIX,redditstatic.com',
      'DOMAIN-SUFFIX,imgur.com',
      'DOMAIN-SUFFIX,medium.com',
      'DOMAIN-SUFFIX,quora.com',
      'DOMAIN-SUFFIX,stackoverflow.com',
      'DOMAIN-SUFFIX,stackexchange.com',
      'DOMAIN-SUFFIX,stackoverflow.blog',
      'DOMAIN-SUFFIX,notion.so',
      'DOMAIN-SUFFIX,notion-static.com',
      'DOMAIN-SUFFIX,figma.com',
      'DOMAIN-SUFFIX,discord.com',
      'DOMAIN-SUFFIX,discordapp.com',
      'DOMAIN-SUFFIX,discord.gg',
      'DOMAIN-SUFFIX,spotify.com',
      'DOMAIN-SUFFIX,scdn.co',
      'DOMAIN-SUFFIX,netflix.com',
      'DOMAIN-SUFFIX,nflxvideo.net',
      'DOMAIN-SUFFIX,nflximg.com',
      'DOMAIN-SUFFIX,disneyplus.com',
      'DOMAIN-SUFFIX,chatgpt.com',
      'DOMAIN-SUFFIX,openai.com',
      'DOMAIN-SUFFIX,oaistatic.com',
      'DOMAIN-SUFFIX,oaiusercontent.com',
      'DOMAIN-SUFFIX,claude.ai',
      'DOMAIN-SUFFIX,anthropic.com',
    ]
  },
  common_tools: {
    name: '开发工具与CDN',
    description: '常用开发工具、CDN、包管理器',
    rules: [
      'DOMAIN-SUFFIX,gitlab.com',
      'DOMAIN-SUFFIX,gitlab.io',
      'DOMAIN-SUFFIX,bitbucket.org',
      'DOMAIN-SUFFIX,atlassian.com',
      'DOMAIN-SUFFIX,jetbrains.com',
      'DOMAIN-SUFFIX,docker.com',
      'DOMAIN-SUFFIX,docker.io',
      'DOMAIN-SUFFIX,dev.to',
      'DOMAIN-SUFFIX,npmjs.org',
      'DOMAIN-SUFFIX,npmjs.com',
      'DOMAIN-SUFFIX,unpkg.com',
      'DOMAIN-SUFFIX,jsdelivr.net',
      'DOMAIN-SUFFIX,cdnjs.cloudflare.com',
      'DOMAIN-SUFFIX,cloudflare.com',
      'DOMAIN-SUFFIX,vercel.com',
      'DOMAIN-SUFFIX,netlify.com',
      'DOMAIN-SUFFIX,zeit.co',
      'DOMAIN-SUFFIX,fly.io',
      'DOMAIN-SUFFIX,heroku.com',
      'DOMAIN-SUFFIX,railway.app',
      'DOMAIN-SUFFIX,supabase.co',
      'DOMAIN-SUFFIX,mongodb.com',
      'DOMAIN-SUFFIX,redis.io',
      'DOMAIN-SUFFIX,postman.com',
      'DOMAIN-SUFFIX,insomnia.rest',
    ]
  }
};

// ===================== 辅助函数 =====================
function buildClashConfig(options = {}) {
  const {
    mode = 'rule',
    selectedServices = Object.keys(RULE_SETS),
    customProxies = '',
    subscriptionUrl = '',
    port = 7890,
    socksPort = 7891,
    allowLan = true,
    logLevel = 'warning',
  } = options;

  // 构建规则
  const rules = [];
  for (const [key, set] of Object.entries(RULE_SETS)) {
    if (selectedServices.includes(key)) {
      for (const rule of set.rules) {
        // 每条规则末尾追加 PROXY 策略
        rules.push(rule.endsWith(',no-resolve') ? `${rule}` : `${rule}`);
      }
    }
  }

  // 生成完整的 Clash 配置
  const config = {
    port,
    'socks-port': socksPort,
    'allow-lan': allowLan,
    mode,
    'log-level': logLevel,
    'external-controller': '127.0.0.1:9090',
    'secret': '',
    'dns': {
      enabled: true,
      'enable-doh': true,
      'ipv6': false,
      'default-nameserver': ['223.5.5.5', '119.29.29.29'],
      'nameserver': [
        'https://doh.pub/dns-query',
        'https://dns.alidns.com/dns-query',
      ],
      'fallback': [
        'https://doh.dns.sb/dns-query',
        'https://dns.cloudflare.com/dns-query',
        'https://dns.twnic.tw/dns-query',
      ],
      'fallback-filter': {
        geoip: true,
        'geoip-code': 'CN',
        'ipcidr': ['240.0.0.0/4', '0.0.0.0/32'],
      },
    },
  };

  // 代理节点部分
  if (subscriptionUrl) {
    config['proxy-providers'] = {
      Provider: {
        type: 'http',
        url: subscriptionUrl,
        'interval': 3600,
        'health-check': {
          enable: true,
          url: 'http://www.gstatic.com/generate_204',
          interval: 300,
        },
      },
    };
  } else {
    // 使用示例节点（用户需替换为真实节点）
    config.proxies = [
      {
        name: '示例节点1',
        type: 'ss',
        server: 'example-server.com',
        port: 443,
        cipher: 'chacha20-ietf-poly1305',
        password: 'your-password-here',
        udp: true,
      },
      {
        name: '示例节点2',
        type: 'ss',
        server: 'example-server2.com',
        port: 8443,
        cipher: 'aes-256-gcm',
        password: 'your-password-here',
        udp: true,
      },
    ];
    if (customProxies && customProxies.trim()) {
      try {
        const extraProxies = yaml.load(customProxies);
        if (Array.isArray(extraProxies)) {
          config.proxies = [...extraProxies];
        }
      } catch (e) {
        // 无效的 YAML，忽略
      }
    }
  }

  // 代理组
  config['proxy-groups'] = [
    {
      name: '🚀 节点选择',
      type: 'select',
      proxies: ['♻️ 自动选择', '🎯 直连', '🔰 全球直连'],
    },
    {
      name: '♻️ 自动选择',
      type: 'url-test',
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      proxies: [],
    },
    {
      name: '🎯 直连',
      type: 'select',
      proxies: ['DIRECT', '🚀 节点选择', '♻️ 自动选择'],
    },
    {
      name: '🔰 全球直连',
      type: 'select',
      proxies: ['DIRECT', '🚀 节点选择', '♻️ 自动选择'],
    },
    {
      name: '🐟 漏网之鱼',
      type: 'select',
      proxies: ['🚀 节点选择', '🎯 直连', '♻️ 自动选择'],
    },
  ];

  // 填充代理组中的节点列表
  const proxyNames = config.proxies
    ? config.proxies.map(p => p.name)
    : [];
  const groupProxyRefs = ['🚀 节点选择', '♻️ 自动选择', '🎯 直连', '🔰 全球直连', '🐟 漏网之鱼', ...proxyNames];

  config['proxy-groups'].forEach(g => {
    if (g.name === '🚀 节点选择') {
      g.proxies = [...proxyNames, ...g.proxies];
    } else if (g.name === '♻️ 自动选择') {
      g.proxies = [...proxyNames, 'DIRECT'];
    } else if (g.name === '🔰 全球直连') {
      g.proxies = ['DIRECT', ...proxyNames];
    }
  });

  // 规则
  // 先加入用户选择的服务规则
  const allRules = [];
  for (const key of selectedServices) {
    if (RULE_SETS[key]) {
      for (const rule of RULE_SETS[key].rules) {
        const strategy = key === 'microsoft' ? '🎯 直连' : '🚀 节点选择';
        allRules.push(rule + ',' + strategy);
      }
    }
  }

  // 基础规则
  allRules.push(
    'DOMAIN-SUFFIX,cn,DIRECT',
    'DOMAIN-SUFFIX,baidu.com,DIRECT',
    'DOMAIN-SUFFIX,zhihu.com,DIRECT',
    'DOMAIN-SUFFIX,bilibili.com,DIRECT',
    'DOMAIN-SUFFIX,weibo.com,DIRECT',
    'DOMAIN-SUFFIX,qq.com,DIRECT',
    'DOMAIN-SUFFIX,tencent.com,DIRECT',
    'DOMAIN-SUFFIX,aliyun.com,DIRECT',
    'DOMAIN-SUFFIX,taobao.com,DIRECT',
    'DOMAIN-SUFFIX,jd.com,DIRECT',
    'DOMAIN-SUFFIX,163.com,DIRECT',
    'DOMAIN-SUFFIX,126.com,DIRECT',
    'DOMAIN-SUFFIX,sina.com.cn,DIRECT',
    'DOMAIN-SUFFIX,sinaimg.cn,DIRECT',
    'DOMAIN-SUFFIX,cnblogs.com,DIRECT',
    'DOMAIN-SUFFIX,csdn.net,DIRECT',
    'DOMAIN-SUFFIX,oschina.net,DIRECT',
    'DOMAIN-SUFFIX,gitee.com,DIRECT',
    'DOMAIN-SUFFIX,mozilla.org,DIRECT',
    'DOMAIN-SUFFIX,moegirl.org.cn,DIRECT',
    'DOMAIN-SUFFIX,cloud.tencent.com,DIRECT',
    'DOMAIN-SUFFIX,myqcloud.com,DIRECT',
    'DOMAIN-SUFFIX,cn,DIRECT',
    'GEOIP,CN,DIRECT',
    'MATCH,🐟 漏网之鱼'
  );

  config.rules = allRules;

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    quotingType: "'",
    forceQuotes: false,
    noRefs: true,
  });
}

// ===================== API 路由 =====================

// 规则集列表
app.get('/api/rulesets', (req, res) => {
  const sets = {};
  for (const [key, set] of Object.entries(RULE_SETS)) {
    sets[key] = {
      name: set.name,
      description: set.description,
      count: set.rules.length,
    };
  }
  res.json(sets);
});

// 获取单个规则集详情
app.get('/api/rulesets/:name', (req, res) => {
  const set = RULE_SETS[req.params.name];
  if (!set) return res.status(404).json({ error: '规则集不存在' });
  res.json(set);
});

// 生成 Clash 配置
app.post('/api/config', (req, res) => {
  try {
    const options = req.body || {};
    const yamlContent = buildClashConfig(options);
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="config.yaml"');
    res.send(yamlContent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取订阅链接（GET 方式下载配置）
app.get('/api/subscribe', (req, res) => {
  try {
    const selectedParam = req.query.services || '';
    const selectedServices = selectedParam
      ? selectedParam.split(',').filter(s => RULE_SETS[s])
      : Object.keys(RULE_SETS);

    const options = {
      selectedServices,
      subscriptionUrl: req.query.subscription || process.env.PROXY_SUBSCRIPTION_URL || '',
      mode: req.query.mode || 'rule',
      allowLan: req.query.allow_lan !== 'false',
      customProxies: req.query.proxies || '',
    };

    const yamlContent = buildClashConfig(options);
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="clash-config.yaml"');
    res.send(yamlContent);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取单个规则文件（用于 rule-provider）
app.get('/api/rules/:name', (req, res) => {
  const set = RULE_SETS[req.params.name];
  if (!set) return res.status(404).json({ error: '规则集不存在' });

  const ruleContent = set.rules
    .map(r => r.endsWith(',no-resolve') ? `${r},🚀 节点选择` : `${r},🚀 节点选择`)
    .join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(ruleContent);
});

// 服务器状态
app.get('/api/status', (req, res) => {
  res.json({
    service: 'ClashNet 配置中心',
    version: '1.0.0',
    domain: DOMAIN,
    rulesets: Object.keys(RULE_SETS).length,
    total_rules: Object.values(RULE_SETS).reduce((sum, s) => sum + s.rules.length, 0),
    uptime: process.uptime(),
  });
});

// ===================== 前端页面路由 =====================
// 所有静态文件由 express.static 处理
// 但为 SPA 友好，设一个通配回退

// ===================== 启动服务 =====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ⚡ ClashNet 配置中心已启动`);
  console.log(`  📡 本地地址: http://localhost:${PORT}`);
  console.log(`  🌐 订阅地址: http://localhost:${PORT}/api/subscribe`);
  console.log(`  📋 规则集数: ${Object.keys(RULE_SETS).length}`);
  console.log(`  🔢 规则总数: ${Object.values(RULE_SETS).reduce((s, v) => s + v.rules.length, 0)}\n`);
});
