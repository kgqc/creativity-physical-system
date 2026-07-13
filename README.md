# MotionLab 动画创作前端原型

## 项目简介

这是一个面向 HCI 用户研究的动画创作工具前端原型。本仓库只包含 React 前端，不包含 RunningHub、数据库或后端服务。

前端可在没有网络服务时使用 Mock API 完整演示，也可以通过环境变量切换到合作者实现的真实 API。组件不直接访问后端地址，更不会直接连接 RunningHub。

## 技术栈

- React 19
- Vite 7
- TypeScript
- 浏览器 `localStorage`（仅 Mock 数据）
- ESLint

## 环境要求

- Node.js 20.19+、22.12+ 或更高兼容版本
- npm

本次交付在 Node.js 25.1.0 下完成安装、构建、预览与检查。

## 安装方式

```bash
npm install
```

## 启动 Mock 模式

```bash
cp .env.example .env.local
npm run dev
```

确保 `.env.local` 中为：

```env
VITE_USE_MOCK_API=true
```

Mock 模式不需要后端。任务会依次经历准备、排队、生成和结果处理，约 8 秒后创建版本；刷新页面后状态仍会继续。

清空 Mock 数据可在浏览器控制台执行：

```js
window.resetMotionPrototypeMockData?.();
location.reload();
```

模拟稳定失败时设置 `VITE_MOCK_FORCE_FAILURE=true` 并重启开发服务器。失败是确定性的，不会在演示中随机出现。

## 启动真实 API 模式

在 `.env.local` 中设置：

```env
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://localhost:3000
```

前后端同域部署时，`VITE_API_BASE_URL` 留空即可。接口必须符合 [接口约定](docs/接口约定.md)。前端不会直接连接 RunningHub，RunningHub API Key 只能保存在合作者的后端。

## 构建与预览

```bash
npm run build
npm run preview
```

构建结果位于 `dist/`。最终公共访问、域名、服务器、多用户隔离和 `dist/` 托管由合作者后端负责。

## 项目目录

```text
public/mock/       小体积 Mock 图片和视频
src/api/           ApiService、真实 API、Mock API 和请求客户端
src/types/         稳定的接口、任务、版本、项目和 Gesture 类型
src/hooks/         Session、版本读取和任务轮询
src/mocks/         localStorage Mock Store、时序和内部数据
src/utils/         请求 ID、动画下载和项目 JSON 导出
src/components/    保留的原型组件
docs/              中文接口和交接文档
```

## 环境变量

| 变量名 | 必填 | 默认值 | 用途 |
| --- | --- | --- | --- |
| `VITE_USE_MOCK_API` | 否 | `true` | `false` 时使用真实 API |
| `VITE_API_BASE_URL` | 否 | 空 | 真实后端根地址；同域时留空 |
| `VITE_JOB_POLL_INTERVAL_MS` | 否 | `3000` | 任务状态轮询间隔，单位毫秒 |
| `VITE_MAX_UPLOAD_SIZE_MB` | 否 | `30` | 文件上传的前端预检查上限 |
| `VITE_MOCK_FORCE_FAILURE` | 否 | `false` | 是否让新建 Mock 任务最终失败 |

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Mock 模式说明

- Session、项目、任务、版本、资源元数据和事件保存在带命名空间的 `localStorage` 中。
- Initial、Text Edit、Motion Edit 和 Combined Edit 都通过同一个 `ApiService`。
- 取消任务后状态为 `CANCELLED`；失败不会清空文字、Gesture、Reference 或活动版本。
- Mock 视频只用于演示交互和播放器，不代表真实生成质量。

## 真实后端接入

合作者应先阅读 [前端交接说明](docs/前端交接说明.md) 和 [接口约定](docs/接口约定.md)，按约定实现 Session、上传、任务、版本和事件接口。关闭 Mock 后，业务组件不会读取 Mock Store。

## 安全说明

- 不得在任何 `VITE_` 环境变量中放置 API Key 或服务器密钥。
- 不得在前端代码中写入 RunningHub 凭据、Workflow Secret 或数据库凭据。
- 不得把真实用户研究数据、上传文件或导出结果提交进 Git。
- 前端上传限制只是体验层预检查，真实权限和文件限制必须由后端再次验证。

## 已知限制

- Mock 输出不代表真实生成效果。
- 任务进度目前是状态级，而不是百分比级。
- 本地 Gesture 演示使用归一化示例轨迹，真实摄像头/手势采集可继续接入同一 `GestureData`。
- 跨域结果下载是否可用取决于合作者后端的 CORS 和下载响应头。
