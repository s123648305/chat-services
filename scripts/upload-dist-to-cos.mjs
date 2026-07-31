import COS from 'cos-nodejs-sdk-v5';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { loadEnv } from 'vite';

const scriptName = 'upload-dist-to-cos';
const projectDirectory = process.cwd();
const fileEnv = loadEnv(
  process.env.NODE_ENV ?? 'production',
  projectDirectory,
  '',
);
const env = {
  ...fileEnv,
  ...process.env,
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function fail(message) {
  console.error(`[${scriptName}] ${message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`
上传 Vite 构建产物到腾讯云 COS。

用法:
  pnpm upload:cos [--dir <目录>] [--prefix <远端目录>] [--dry-run]

参数:
  --dir       本地产物目录，默认读取 .env 的 COS_SOURCE_DIR，未配置时使用 h5
  --prefix    COS 远端目录，默认读取 .env 的 COS_PREFIX；留空表示 Bucket 根目录
  --dry-run   仅检查并展示待上传文件，不连接 COS
  --help      显示帮助

必需环境变量:
  COS_BUCKET
  COS_REGION
  COS_SECRET_ID
  COS_SECRET_KEY

可选环境变量:
  COS_SECURITY_TOKEN
  COS_SOURCE_DIR
  COS_PREFIX
  COS_UPLOAD_CONCURRENCY
  COS_USE_ACCELERATE=1
  COS_DRY_RUN=1
`.trim());
}

function readOption(args, name) {
  const optionIndex = args.indexOf(name);
  if (optionIndex >= 0) {
    const value = args[optionIndex + 1];
    if (!value || value.startsWith('--')) {
      fail(`${name} 缺少参数值`);
    }
    return value;
  }

  const inlineOption = args.find(argument => argument.startsWith(`${name}=`));
  return inlineOption?.slice(name.length + 1);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePrefix(value) {
  return value.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async entry => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }
      return entry.isFile() ? [entryPath] : [];
    }),
  );

  return nestedFiles.flat();
}

function toObjectKey(sourceDirectory, filePath, prefix) {
  const relativePath = relative(sourceDirectory, filePath).split(sep).join('/');
  return prefix ? `${prefix}/${relativePath}` : relativePath;
}

function getContentType(filePath) {
  return contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function getCacheControl(objectKey) {
  if (objectKey === 'index.html' || objectKey.endsWith('/index.html')) {
    return 'no-cache, no-store, must-revalidate';
  }

  if (/(^|\/)assets\//.test(objectKey)) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=3600';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function runLimited(items, concurrency, worker) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await worker(items[currentIndex], currentIndex);
      }
    },
  );

  await Promise.all(workers);
}

function uploadFile(cos, options) {
  const {
    bucket,
    filePath,
    objectKey,
    region,
    size,
  } = options;

  return new Promise((resolveUpload, rejectUpload) => {
    cos.putObject(
      {
        Body: createReadStream(filePath),
        Bucket: bucket,
        CacheControl: getCacheControl(objectKey),
        ContentLength: size,
        ContentType: getContentType(filePath),
        Key: objectKey,
        Region: region,
      },
      (error, data) => {
        if (error) {
          rejectUpload(error);
          return;
        }
        resolveUpload(data);
      },
    );
  });
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const sourceDirectory = resolve(
  readOption(args, '--dir') ?? env.COS_SOURCE_DIR ?? 'h5',
);
const prefix = normalizePrefix(
  readOption(args, '--prefix') ?? env.COS_PREFIX ?? '',
);
const dryRun = args.includes('--dry-run') || env.COS_DRY_RUN === '1';
const concurrency = Math.min(
  parsePositiveInteger(env.COS_UPLOAD_CONCURRENCY, 5),
  20,
);
const bucket = env.COS_BUCKET;
const region = env.COS_REGION;
const secretId = env.COS_SECRET_ID
  ?? env.TENCENTCLOUD_SECRET_ID;
const secretKey = env.COS_SECRET_KEY
  ?? env.TENCENTCLOUD_SECRET_KEY;
const securityToken = env.COS_SECURITY_TOKEN
  ?? env.TENCENTCLOUD_SESSION_TOKEN;

let sourceStats;
try {
  sourceStats = await stat(sourceDirectory);
} catch {
  fail(`找不到构建产物目录：${sourceDirectory}，请先执行 pnpm build`);
}

if (!sourceStats.isDirectory()) {
  fail(`产物路径不是目录：${sourceDirectory}`);
}

const filePaths = (await collectFiles(sourceDirectory)).sort();
if (filePaths.length === 0) {
  fail(`构建产物目录为空：${sourceDirectory}`);
}

const files = await Promise.all(
  filePaths.map(async filePath => ({
    filePath,
    objectKey: toObjectKey(sourceDirectory, filePath, prefix),
    size: (await stat(filePath)).size,
  })),
);
const totalSize = files.reduce((sum, file) => sum + file.size, 0);

console.log(`[${scriptName}] 本地目录：${sourceDirectory}`);
console.log(`[${scriptName}] 远端目录：${prefix || '(Bucket 根目录)'}`);
console.log(`[${scriptName}] 文件数量：${files.length}，总大小：${formatBytes(totalSize)}`);

if (dryRun) {
  files.forEach(file => {
    console.log(`[${scriptName}] dry run ${file.objectKey} (${formatBytes(file.size)})`);
  });
  console.log(`[${scriptName}] 检查完成，未上传任何文件。`);
  process.exit(0);
}

if (!bucket) fail('缺少环境变量 COS_BUCKET');
if (!region) fail('缺少环境变量 COS_REGION');
if (!secretId) fail('缺少环境变量 COS_SECRET_ID');
if (!secretKey) fail('缺少环境变量 COS_SECRET_KEY');

const cos = new COS({
  ChunkParallelLimit: concurrency,
  SecretId: secretId,
  SecretKey: secretKey,
  SecurityToken: securityToken,
  UseAccelerate: env.COS_USE_ACCELERATE === '1',
});

let uploadedCount = 0;
try {
  await runLimited(files, concurrency, async file => {
    await uploadFile(cos, {
      bucket,
      region,
      ...file,
    });
    uploadedCount += 1;
    console.log(
      `[${scriptName}] [${uploadedCount}/${files.length}] 已上传 ${file.objectKey}`,
    );
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(`上传失败：${message}`);
}

console.log(
  `[${scriptName}] 上传完成：cos://${bucket}/${prefix ? `${prefix}/` : ''}`,
);
