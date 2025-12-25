# apps/admin

- 部署目标：Cloudflare Pages
- 关键：构建输出根目录必须包含 `_headers`（安全头/CSP）

## Gate1 验收要点
- `_headers` 生效（HSTS/CSP/Referrer-Policy 等）
- 不允许把 token 存 localStorage（见 semgrep 规则/CI）

## 证据归档
- `evidence/M1/Pages/`：Pages 配置截图 + curl -I 结果
