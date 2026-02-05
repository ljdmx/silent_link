import React, { useState } from 'react';
import { RoomConfig, PrivacyFilter } from '../types';

interface SetupProps {
  onBack: () => void;
  onStart: (config: RoomConfig) => void;
  onViewDesign?: () => void;
}

const Setup: React.FC<SetupProps> = ({ onBack, onStart, onViewDesign }) => {
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [defaultFilter, setDefaultFilter] = useState<PrivacyFilter>(PrivacyFilter.MOSAIC);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      roomId: roomName.trim().toUpperCase(),
      passphrase,
      userName,
      recordingProtection: true,
      ephemeralSession: true,
      defaultFilter,
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 lg:p-6 overflow-y-auto selection:bg-primary/30 text-white font-sans relative">
      {/* Background Glow */}
      <div className="fixed top-0 right-0 size-[600px] bg-primary/5 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 size-[500px] bg-accent/3 blur-[100px] -ml-48 -mb-48 rounded-full pointer-events-none"></div>

      <div className="w-full max-w-2xl animate-sentient-in duration-700 relative z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-phi-sm text-gray-500 hover:text-white mb-phi-lg transition-all group px-phi-md py-phi-xs rounded-xl hover:bg-white/5 w-fit active:scale-95"
        >
          <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-black uppercase tracking-[0.2em] text-[10px]">返回主页</span>
        </button>

        <div className="surgical-card p-6 md:p-12 lg:p-16">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span className="material-symbols-outlined text-8xl lg:text-9xl rotate-12">settings_input_antenna</span>
          </div>

          <div className="space-y-phi-xs mb-phi-xl relative z-10">
            <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-white italic">
              配置主权节点
            </h1>
            <p className="text-gray-500 font-medium text-sm lg:text-base leading-phi-md">
              在建立端到端加密频道前，请初始化本地节点标识与链路校验凭证
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-phi-xl relative z-10 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-phi-lg">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(19,127,236,0.6)]"></span>
                  频道 ID (Room ID)
                </label>
                <div className="relative group">
                  <input
                    required
                    autoComplete="off"
                    className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 focus:ring-2 focus:ring-primary focus:bg-white/10 outline-none transition-all placeholder:text-gray-700 text-white font-mono uppercase tracking-[0.2em] text-lg"
                    placeholder="输入目标频道标识"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity">
                    <span className="material-symbols-outlined">numbers</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-gray-600"></span>
                  节点别名 (Nickname)
                </label>
                <input
                  required
                  autoComplete="off"
                  className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-6 focus:ring-2 focus:ring-primary focus:bg-white/10 outline-none transition-all placeholder:text-gray-700 text-white text-lg font-medium"
                  placeholder="请输入您的显示名称"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-phi-sm">
              <label className="text-[10px] font-black text-accent uppercase tracking-[0.3em] ml-1 flex items-center gap-phi-sm">
                <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                端到端加密口令 (Sovereign Key)
              </label>
              <div className="relative group">
                <input
                  required
                  type="password"
                  className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl px-phi-lg focus:ring-2 focus:ring-accent focus:bg-white/10 outline-none transition-all placeholder:text-gray-700 text-white text-lg"
                  placeholder="用于生成本地 AES 密钥的原始口令"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
                <div className="absolute right-phi-md top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity">
                  <span className="material-symbols-outlined">vibration</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 ml-1 italic font-medium">口令即密钥：仅在本地执行 PBKDF2 派生，绝对不上传至任何服务器。</p>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-xl fill-1">shield</span>
                <h3 className="text-xs lg:text-sm font-black uppercase tracking-[0.25em] text-gray-400">
                  初始隐私防御策略
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-white/5 rounded-[1.5rem] p-5 border border-white/5 border-l-4 border-l-primary flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex gap-4 items-center">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined">blur_circular</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs lg:text-sm">实时视觉脱敏</h4>
                      <p className="text-[9px] text-gray-500 uppercase tracking-tighter">本地 WebGL 滤镜</p>
                    </div>
                  </div>
                  <select
                    className="bg-card border border-white/10 rounded-xl text-[11px] px-4 py-2 outline-none font-black text-primary appearance-none cursor-pointer hover:border-primary/40 transition-all"
                    value={defaultFilter}
                    onChange={(e) => setDefaultFilter(e.target.value as PrivacyFilter)}
                  >
                    <option value={PrivacyFilter.NONE}>无 (原始传输)</option>
                    <option value={PrivacyFilter.BLUR}>高斯模糊</option>
                    <option value={PrivacyFilter.MOSAIC}>马赛克</option>
                    <option value={PrivacyFilter.BLACK}>物理屏蔽</option>
                  </select>
                </div>

                <div className="bg-white/5 rounded-[1.5rem] p-5 border border-white/5 flex gap-4 items-center opacity-40 grayscale group cursor-not-allowed">
                  <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500">
                    <span className="material-symbols-outlined">lock_reset</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs lg:text-sm text-gray-400">零元数据架构</h4>
                    <p className="text-[9px] text-gray-600 uppercase tracking-tighter">强制主权验证</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={!userName || !passphrase || !roomName}
                className="w-full h-16 lg:h-20 bg-primary rounded-2xl lg:rounded-3xl font-black text-lg lg:text-xl shadow-[0_20px_40px_-10px_rgba(19,127,236,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white uppercase tracking-[0.2em]"
              >
                连接主权链路
              </button>

              <div className="flex flex-col items-center gap-6 mt-10">
                <div className="flex items-center gap-4 py-2 px-6 bg-white/5 border border-white/5 rounded-full">
                  <span className="size-1.5 rounded-full bg-accent animate-pulse"></span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-[0.3em] font-black">
                    Zero Metadata • End-to-End Encryption
                  </span>
                </div>

                {onViewDesign && (
                  <button
                    type="button"
                    onClick={onViewDesign}
                    className="flex items-center gap-2 text-primary/60 hover:text-primary transition-all group"
                  >
                    <span className="material-symbols-outlined text-lg">architecture</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest border-b border-primary/20 group-hover:border-primary transition-all">
                      底层技术架构：如何实现真正的 E2EE？
                    </span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Setup;
