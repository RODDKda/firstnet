/**
 * ClashNet Proxy Worker
 *
 * Cloudflare Worker 作为 HTTP/S 代理出口
 * 配合 Clash 客户端使用，无需自建代理服务器和机场
 *
 * 部署方式：
 *   1. 安装 wrangler: npm install -g wrangler
 *   2. 登录: wrangler login
 *   3. 部署: wrangler deploy
 *   4. 在 Dashboard 设置 ACCESS_TOKEN secret
 *
 * 工作流程：
 *   手机/电脑 Clash → proxy.你的域名 → Worker → 目标网站
 *
 * 注意：CONNECT 隧道需要 Workers Paid 计划（$5/月）以使用 TCP Socket API
 * 免费版只能转发 HTTP 请求。如需免费用 HTTPS 代理，推荐搭配 Cloudflare WARP 使用
 */

// 访问令牌，部署后通过 wrangler secret put ACCESS_TOKEN 设置
// 或者从 env 读取
let ACCESS_TOKEN = 'b017e17b12b652680775c1906f89fdf0';

export default {
  async fetch(request, env, ctx) {
    // 从环境变量读取 Token（优先级高于硬编码）
    ACCESS_TOKEN = env.ACCESS_TOKEN || ACCESS_TOKEN;

    const url = new URL(request.url);

    // ===== 健康检查 =====
    if (url.pathname === '/health' || url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'ClashNet Proxy',
        version: '1.0.0',
        usage: '在 Clash 中配置此地址为 HTTP 代理',
        note: '免费版支持 HTTP 转发；HTTPS(CONNECT) 需要 Workers Paid 计划',
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ===== 根据 token 参数设置代理请求中的 Token（供订阅 API 使用） =====
    // 如果请求的是 /api/subscribe，转发到后端 ClashNet 服务
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = url.searchParams.get('backend') || 'http://localhost:3000';
      const forwardUrl = backendUrl + url.pathname + url.search;
      return await fetch(forwardUrl);
    }

    // ===== Token 鉴权 =====
    const token = url.searchParams.get('token') || request.headers.get('X-Proxy-Token');
    if (token !== ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'Forbidden: invalid token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ===== 处理 CONNECT 请求（HTTPS 隧道） =====
    if (request.method === 'CONNECT') {
      return handleConnect(request, url);
    }

    // ===== 处理普通 HTTP 代理请求 =====
    return handleHttpProxy(request);
  },
};

/**
 * 处理 HTTP 代理请求
 * Clash 发送的 HTTP 请求：GET http://github.com/path HTTP/1.1
 */
async function handleHttpProxy(request) {
  try {
    const url = new URL(request.url);

    // 构造目标 URL
    let targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      // 尝试从请求行提取完整 URL
      targetUrl = url.pathname + url.search;
    }

    // 确保有协议前缀
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 构造转发请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    // 移除代理相关头部
    proxyRequest.headers.delete('Proxy-Connection');
    proxyRequest.headers.delete('Proxy-Authorization');
    proxyRequest.headers.delete('X-Proxy-Token');

    // 发送请求到目标服务器
    const response = await fetch(proxyRequest);

    // 构造响应
    const proxyResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // 跨域支持
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');

    return proxyResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 处理 CONNECT 请求（HTTPS 隧道）
 * Clash 发送：CONNECT github.com:443 HTTP/1.1
 *
 * 需要 Workers Paid 计划支持 TCP Socket API
 * 免费版会返回提示信息
 */
async function handleConnect(request) {
  try {
    const url = new URL(request.url);
    const hostPort = url.pathname;

    if (!hostPort || !hostPort.includes(':')) {
      return new Response('Bad Request: invalid CONNECT target', { status: 400 });
    }

    const [hostname, portStr] = hostPort.split(':');
    const port = parseInt(portStr) || 443;

    // 尝试使用 connect() API 创建 TCP 隧道
    // 注意：此功能需要 Workers Paid 计划
    let tcpSocket;
    try {
      tcpSocket = connect({
        hostname: hostname,
        port: port,
      });
    } catch (e) {
      // connect() 不可用（免费计划），返回提示
      return new Response(
        JSON.stringify({
          error: 'CONNECT not available on free plan',
          solution: '升级到 Workers Paid ($5/mo) 或使用 Cloudflare WARP',
        }),
        {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 使用 WebSocket 对建立双向隧道
    const webSocketPair = new WebSocketPair();
    const [clientWS, serverWS] = Object.values(webSocketPair);

    // 已接受的 WebSocket 连接
    serverWS.accept();

    // TCP → WebSocket：将 TCP 数据转发到 WebSocket
    tcpSocket.readable.pipeTo(
      new WritableStream({
        write(chunk) {
          // chunk 是 Uint8Array，WebSocket.send 接受 ArrayBuffer
          if (chunk instanceof ArrayBuffer || chunk instanceof Uint8Array) {
            serverWS.send(chunk.buffer ? chunk.buffer : chunk);
          } else {
            serverWS.send(chunk);
          }
        },
        close() {
          try { serverWS.close(); } catch (_) {}
        },
        abort(err) {
          try { serverWS.close(1011, err.message); } catch (_) {}
        },
      })
    );

    // WebSocket → TCP：将 WebSocket 数据写入 TCP 连接
    serverWS.addEventListener('message', (event) => {
      const writer = tcpSocket.writable.getWriter();
      writer.write(event.data);
      writer.releaseLock();
    });

    serverWS.addEventListener('close', () => {
      try { tcpSocket.close(); } catch (_) {}
    });

    serverWS.addEventListener('error', () => {
      try { tcpSocket.close(); } catch (_) {}
    });

    // 返回 101 Switching Protocols，Clash 会通过这个 WebSocket 传输数据
    return new Response(null, {
      status: 101,
      webSocket: clientWS,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'CONNECT failed: ' + error.message }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
