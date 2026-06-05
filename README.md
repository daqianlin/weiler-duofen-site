# 威尔多芬指标静态网站

这是威尔多芬指标网站的第一版静态原型。它不需要后端、数据库、登录系统或运行时密钥，适合先部署到阿里云 OSS、腾讯云 COS、CloudBase 静态托管或任何普通静态网站服务。

## 目录

```text
weiler-duofen-site/
  index.html
  public/
    app.js
    styles.css
    data/site-data.json
    assets/daily-signal.png
  scripts/
    generate_site_data.py
```

## 本地预览

在本目录运行：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:4173/
```

## 更新数据

网站数据来自 Excel：

```text
/Users/daqianlinn/Documents/个人/威尔多芬指标/自如系统净值走势(2026-05-29).xlsx
```

更新 Excel 后运行：

```bash
python3 scripts/generate_site_data.py
```

脚本会刷新：

```text
public/data/site-data.json
```

## 国内部署建议

### 阿里云 OSS + CDN

1. 在阿里云创建 OSS Bucket。
2. 开启静态网站托管，默认首页填 `index.html`。
3. 上传 `weiler-duofen-site` 目录下的 `index.html` 和 `public/`。
4. 绑定 CDN 域名。
5. 配置 HTTPS 证书。
6. 如果使用中国大陆节点和自己的域名，需要完成 ICP 备案。

### 腾讯云 COS + CDN

1. 在腾讯云创建 COS 存储桶。
2. 开启静态网站功能，默认首页填 `index.html`。
3. 上传 `index.html` 和 `public/`。
4. 绑定 CDN 或 EdgeOne。
5. 配置 HTTPS 证书。
6. 如果使用中国大陆节点和自己的域名，需要完成 ICP 备案。

### 腾讯云 CloudBase 静态托管

CloudBase 更适合以后继续加云函数、登录或后台上传 Excel。第一版也可以直接把本目录作为静态资源上传。

## 安全边界

第一版是只读静态网站，攻击面很小。上线时建议：

- GitHub、云平台、域名账号开启两步验证。
- 不在前端放任何账号、密钥、API token。
- 暂时不做评论、登录、上传和后台。
- 数据更新通过本地 Excel 生成 JSON 后再上传。

## 已包含功能

- 最新威尔/多芬多空信号。
- 交互式净值曲线。
- 威尔/多芬指标切换。
- 累计收益、胜率、模拟净值、最大回撤等统计。
- 历史交易表和移动端交易卡片。
- 盈亏、年份筛选。
- 桌面端和移动端响应式布局。
