# 上传构建产物到腾讯云 COS

`upload-dist-to-cos.mjs` 会递归上传 Vite 构建产物，保留目录结构，并覆盖 COS 中的同名文件。它不会删除 COS 中已有的其他文件。

本项目当前的 Vite 输出目录是 `h5/`，因此脚本默认上传 `h5/`。如需上传其他目录，可通过 `--dir` 或 `COS_SOURCE_DIR` 指定。

## 配置

脚本会自动读取项目根目录的 `.env`，也支持终端或 CI Secret。终端和 CI 中的同名环境变量优先于 `.env`。

在项目根目录的 `.env` 中增加：

```dotenv
COS_BUCKET=chat-web-1250000000
COS_REGION=ap-guangzhou
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_PREFIX=chat-services/prod
```

不要把包含真实密钥的 `.env` 提交到仓库。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `COS_BUCKET` | 是 | Bucket 完整名称，例如 `chat-web-1250000000` |
| `COS_REGION` | 是 | Bucket 地域，例如 `ap-guangzhou` |
| `COS_SECRET_ID` | 是 | 腾讯云 SecretId |
| `COS_SECRET_KEY` | 是 | 腾讯云 SecretKey |
| `COS_SECURITY_TOKEN` | 否 | 使用临时密钥时的 Token |
| `COS_PREFIX` | 否 | COS 中的目标目录，例如 `chat-services/prod` |
| `COS_SOURCE_DIR` | 否 | 本地产物目录，默认 `h5` |
| `COS_UPLOAD_CONCURRENCY` | 否 | 并发上传数，默认 `5`，最大 `20` |
| `COS_USE_ACCELERATE` | 否 | 设置为 `1` 时启用全球加速域名 |

也可以临时通过 PowerShell 覆盖 `.env` 中的配置：

```powershell
$env:COS_BUCKET='chat-web-1250000000'
$env:COS_REGION='ap-guangzhou'
$env:COS_SECRET_ID='你的 SecretId'
$env:COS_SECRET_KEY='你的 SecretKey'
$env:COS_PREFIX='chat-services/prod'
pnpm deploy:cos
```

## 命令

```powershell
# 构建并上传
pnpm deploy:cos

# 仅上传现有 h5 产物
pnpm upload:cos

# 只检查待上传文件，不连接 COS
pnpm upload:cos -- --dry-run

# 指定其他产物目录和远端目录
pnpm upload:cos -- --dir dist --prefix chat-services/test
```

脚本会为 `index.html` 设置禁止缓存，为 Vite 的 `assets/` 文件设置长期缓存。
