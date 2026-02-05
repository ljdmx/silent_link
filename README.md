# SilentLink | 主权级隐私通讯协议 (Sovereign Tier)


SilentLink 是一款专为极致主权设计的点对点（P2P）通信协议实现。基于 **WebRTC 原始隧道** 与 **AES-256-GCM 硬件加解密**，我们为您构建了一个绝对的“数字孤岛”。

**核心理念：密码学主权属于用户。数据仅存在于易失性内存，消亡即物理终结。**

---

## 🌟 核心特性 (Divine Features)

- **🔒 零信任端到端加密 (E2EE)**
  - 采用 **AES-256-GCM** 算法，密钥由 PBKDF2 离线派生，服务器仅作为盲信令通道，无权解密任何内容。
  - **前向安全性**：每次会话生成全新密钥，历史记录无法被回溯破解。

- **⚡ 秒级自动信令 (Supabase Realtime)**
  - 告别繁琐的手动复制粘贴，通过 Postgres Changes 实现毫秒级信令同步。
  - **智能自愈**：独创的幽灵清理与状态自愈算法，断网重连仅需 1 秒。

- **🚀 工业级性能优化**
  - **P2P 文件闪传**：基于 `onbufferedamountlow` 的智能背压调度，大文件传输跑满带宽，稳定不崩溃。
  - **移动端优先**：针对 iOS/Android 深度适配的触控 UI，支持刘海屏安全区域与全屏沉浸体验。

- **🛡️ 隐私防护体系**
  - **WebGL 实时脱敏**：在数据发出前即完成本地马赛克/模糊处理，物理阻断隐私泄露。
  - **反截屏干扰**：动态噪声背景与窗口失焦自动模糊，干扰 OCR 识别与窥屏。

- **🎨 世界级交互设计**
  - **电影级美学**：全站采用高级玻璃拟态 (Glassmorphism) 与平滑微交互。
  - **泰勒级响应**：基于 Tailwind v4 构建的现代 CSS 架构，0 运行时开销。

---

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: React 18, Vite 6, TypeScript
- **Styling**: Tailwind CSS v4, PostCSS
- **Signaling**: Supabase Realtime (PostgreSQL)
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2)
- **Protocol**: WebRTC (RTCDataChannel, RTCPeerConnection)

---

## 🚀 快速开始 (Quick Start)

### 1. 环境准备

确保您已安装 Node.js 18+。

### 2. 获取源码

```bash
git clone https://github.com/your-repo/SilentLink.git
cd SilentLink
npm install
```

### 3. 配置 Supabase

1. 创建 Supabase 项目。
2. 在 SQL 编辑器中运行 `init_supabase.sql` 初始化信令表。
3. 创建 `.env` 文件并填入您的 Supabase 凭证：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

---

## 📖 使用指南

1. **创建节点**：输入任意房间 ID 与 **强通信口令**。
2. **分享频道**：将相同的房间 ID 与口令告知对方（口令是唯一的加密凭证，请通过安全渠道传递）。
3. **自动握手**：双方进入房间后，系统自动完成 P2P 握手与密钥交换。
4. **安全通讯**：还可以发送加密文件，开启隐私滤镜。
5. **销毁**：点击“销毁会话”或关闭页面，所有密钥与数据立即物理销毁。

---

## ⚖️ 法律声明

SilentLink 仅作为隐私保护技术的研究验证项目。使用者需遵守当地法律法规，严禁用于任何非法用途。

---

**Crafted with ❤️ for Privacy Sovereignty.**
