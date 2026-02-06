import React, { useState, useMemo } from 'react';
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

  const entropy = useMemo(() => {
    if (!passphrase) return 0;
    let score = 0;
    if (passphrase.length > 8) score += 25;
    if (/[A-Z]/.test(passphrase)) score += 25;
    if (/[0-9]/.test(passphrase)) score += 25;
    if (/[^A-Za-z0-9]/.test(passphrase)) score += 25;
    return score;
  }, [passphrase]);

  const entropyColor = useMemo(() => {
    if (entropy < 40) return 'var(--color-security-low)';
    if (entropy < 75) return 'var(--color-security-mid)';
    return 'var(--color-security-high)';
  }, [entropy]);

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

  const StrategyCard = ({ filter, icon, label, description }: { filter: PrivacyFilter, icon: string, label: string, description: string }) => (
    <button
      type="button"
      onClick={() => setDefaultFilter(filter)}
      className={`relative p-5 rounded-2xl border transition-all duration-500 text-left group overflow-hidden ${defaultFilter === filter
        ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(19,127,236,0.2)]'
        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
        }`}
    >
      <div className={`size-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 ${defaultFilter === filter ? 'bg-primary text-white' : 'bg-white/5 text-gray-400'
        }`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <h4 className={`text-sm font-bold mb-1 transition-colors ${defaultFilter === filter ? 'text-primary' : 'text-gray-200'}`}>
        {label}
      </h4>
      <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider">{description}</p>
      {defaultFilter === filter && (
        <div className="absolute top-3 right-3">
          <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
        </div>
      )}
    </button>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 selection:bg-primary/30 relative overflow-hidden bg-background">
      {/* Immersive Background Elements */}
      <div className="fixed top-[-10%] right-[-10%] size-[600px] bg-primary/10 blur-[150px] rounded-full animate-pulse-glow"></div>
      <div className="fixed bottom-[-10%] left-[-10%] size-[500px] bg-accent/5 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-3xl animate-sentient-in relative z-10 flex flex-col gap-8">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-gray-500 hover:text-white transition-all group w-fit"
        >
          <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back_ios</span>
          <span className="font-bold tracking-[.25em] text-[10px] uppercase">返回主页</span>
        </button>

        <div className="surgical-card">
          <div className="scanline-overlay"></div>

          <div className="p-8 md:p-14 lg:p-14 relative z-10">
            {/* 标题区域 */}
            <header className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black tracking-[.4em] text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  节点配置协议
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent"></div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 italic text-white flex items-baseline gap-4">
                配置主权节点
                <span className="text-sm font-normal not-italic text-gray-500 tracking-wider">v2.0.s</span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base max-w-xl font-medium leading-relaxed">
                在建立端到端加密频道前，请初始化本地节点标识与链路校验凭证。所有密钥派生流程均在本地进行。
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-12">
              {/* 核心标识 */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[.3em] flex items-center gap-2">
                    <span className="size-1 rounded-full bg-primary animate-pulse"></span>
                    频道标识符
                  </label>
                  <input
                    required
                    autoComplete="off"
                    className="premium-input font-mono uppercase tracking-[.2em] text-lg"
                    placeholder="例如：ALPHA-9"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[.3em] flex items-center gap-2">
                    <span className="size-1 rounded-full bg-gray-600"></span>
                    节点名称
                  </label>
                  <input
                    required
                    autoComplete="off"
                    className="premium-input placeholder:text-gray-700"
                    placeholder="请输入显示名称"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
              </section>

              {/* 安全层级 */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[.3em] flex items-center gap-2">
                    <span className="size-1 rounded-full bg-accent"></span>
                    端到端加密口令
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">熵值强度</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 w-6 rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: entropy >= i * 25 ? entropyColor : 'var(--color-border)',
                            opacity: entropy >= i * 25 ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative group">
                  <input
                    required
                    type="password"
                    className="premium-input text-lg pr-12 focus:ring-1 focus:ring-accent/20"
                    placeholder="输入口令以初始化加密链路"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-600 select-none">
                    fingerprint
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-600 italic font-medium">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  口令即密钥：基于 PBKDF2 本地派生，服务器对您的原始口令「零感知，零存储」。
                </div>
              </section>

              {/* 隐私策略 */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-lg">shield_with_heart</span>
                  <h3 className="text-xs font-black uppercase tracking-[.25em] text-gray-400">
                    隐私防御策略
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StrategyCard
                    filter={PrivacyFilter.NONE}
                    icon="visibility"
                    label="原始"
                    description="明文链路"
                  />
                  <StrategyCard
                    filter={PrivacyFilter.BLUR}
                    icon="blur_on"
                    label="模糊"
                    description="高斯滤镜"
                  />
                  <StrategyCard
                    filter={PrivacyFilter.MOSAIC}
                    icon="grid_view"
                    label="像素"
                    description="像素脱敏"
                  />
                  <StrategyCard
                    filter={PrivacyFilter.BLACK}
                    icon="全蔽"
                    label="屏蔽"
                    description="物理阻断"
                  />
                </div>
              </section>

              {/* 动作按钮 */}
              <div className="pt-8 flex flex-col gap-8">
                <button
                  type="submit"
                  disabled={!userName || !passphrase || !roomName}
                  className="group relative w-full h-18 lg:h-20 bg-primary rounded-2xl font-black text-lg shadow-[0_20px_40px_-10px_rgba(19,127,236,0.3)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white uppercase tracking-[.3em] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="relative flex items-center justify-center gap-phi-sm">
                    初始化主权链路
                    <span className="material-symbols-outlined">bolt</span>
                  </span>
                </button>

                <footer className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-8">
                  <div className="flex items-center gap-4 bg-white/5 border border-white/5 py-2 px-5 rounded-full">
                    <span className="size-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--color-accent)]"></span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-[.3em] font-black">
                      端到端加密 • 零元数据节点
                    </span>
                  </div>

                  {onViewDesign && (
                    <button
                      type="button"
                      onClick={onViewDesign}
                      className="flex items-center gap-2 text-gray-600 hover:text-primary transition-all group"
                    >
                      <span className="material-symbols-outlined text-base">architecture</span>
                      <span className="text-[10px] font-bold uppercase tracking-[.15em] border-b border-transparent group-hover:border-primary">
                        技术细节：PBKDF2 与 AES-256-GCM 架构
                      </span>
                    </button>
                  )}
                </footer>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
