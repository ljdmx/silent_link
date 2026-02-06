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
      className={`relative p-4 md:p-5 rounded-2xl border transition-all duration-700 text-left group overflow-hidden ${defaultFilter === filter
        ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(19,127,236,0.2)]'
        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
        }`}
    >
      <div className={`size-10 rounded-xl flex items-center justify-center mb-3 md:mb-4 transition-all duration-700 group-hover:scale-110 ${defaultFilter === filter ? 'bg-primary text-white shadow-[0_0_15px_rgba(19,127,236,0.5)]' : 'bg-white/5 text-gray-500'
        }`}>
        {icon === '全蔽' ? (
          <span className="material-symbols-outlined text-xl">block</span>
        ) : (
          <span className="material-symbols-outlined text-xl">{icon}</span>
        )}
      </div>
      <h4 className={`text-sm font-bold mb-1 transition-colors duration-500 ${defaultFilter === filter ? 'text-primary' : 'text-gray-300'}`}>
        {label}
      </h4>
      <p className="text-[9px] md:text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider font-medium">{description}</p>

      {/* 活跃状态光效 */}
      {defaultFilter === filter && (
        <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 pointer-events-none"></div>
      )}
    </button>
  );

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 md:p-12 selection:bg-primary/30 relative overflow-hidden bg-background">
      {/* 高端弥散光球 - 针对移动端优化位置 */}
      <div className="fixed top-[-5%] right-[-5%] size-[300px] md:size-[600px] bg-primary/10 blur-[100px] md:blur-[150px] rounded-full animate-pulse-glow"></div>
      <div className="fixed bottom-[-5%] left-[-5%] size-[250px] md:size-[500px] bg-accent/5 blur-[80px] md:blur-[120px] rounded-full"></div>

      <div className="w-full max-w-2xl md:max-w-3xl animate-sentient-in relative z-10 flex flex-col gap-6 md:gap-8">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-all group w-fit"
        >
          <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_left_alt</span>
          <span className="font-bold tracking-[.3em] text-[10px] uppercase">返回主页</span>
        </button>

        <div className="surgical-card">
          {/* 实时动态扫描线 */}
          <div className="absolute inset-0 pointer-events-none opacity-20 z-20">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scanline"></div>
          </div>

          <div className="p-6 md:p-14 relative z-10">
            {/* 视觉头部 */}
            <header className="mb-8 md:mb-12">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <span className="text-[10px] font-black tracking-[.4em] text-primary uppercase bg-primary/15 px-3 py-1 rounded-full border border-primary/20 shadow-[0_0_15px_rgba(19,127,236,0.15)]">
                  节点配置协议
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 italic text-white flex flex-wrap items-baseline gap-2 md:gap-4 leading-none">
                配置主权节点
                <span className="text-xs md:text-sm font-no-italic text-gray-500 tracking-[.4em] not-italic opacity-50">v2.0.s</span>
              </h1>
              <p className="text-gray-400 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
                在建立加密频道前，请初始化节点标识。所有密钥派生流程均在
                <span className="text-primary/80 font-bold px-1">本地沙盒</span>
                内通过 PBKDF2 算法完成，确保绝对的主权自主。
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10 md:space-y-12">
              {/* 核心标识区域 */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[.4em] flex items-center gap-2">
                    <span className="size-1 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]"></span>
                    频道标识符
                  </label>
                  <div className="relative group">
                    <input
                      required
                      autoComplete="off"
                      className="premium-input font-mono uppercase tracking-[.25em] text-base md:text-lg"
                      placeholder="例如：ALPHA-9"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
                    <div className="absolute bottom-0 inset-x-0 h-[2px] bg-primary/40 scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700 origin-left"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[.4em] flex items-center gap-2">
                    <span className="size-1 rounded-full bg-gray-600"></span>
                    节点代称
                  </label>
                  <input
                    required
                    autoComplete="off"
                    className="premium-input placeholder:text-gray-700"
                    placeholder="请输入显示代称"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
              </section>

              {/* 安全层级 - 针对移动端优化交互 */}
              <section className="space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[.4em] flex items-center gap-2">
                    <span className="size-1 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]"></span>
                    端到端加密口令
                  </label>
                  <div className="flex items-center gap-3 bg-white/5 py-1 px-3 rounded-full border border-white/5 self-start">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">熵值强度</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 w-5 md:w-6 rounded-full transition-all duration-700"
                          style={{
                            backgroundColor: entropy >= i * 25 ? entropyColor : 'var(--color-border)',
                            opacity: entropy >= i * 25 ? 1 : 0.2,
                            boxShadow: entropy >= i * 25 ? `0 0 10px ${entropyColor}` : 'none'
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
                    className="premium-input text-lg pr-12 focus:ring-1 focus:ring-accent/10"
                    placeholder="输入口令以初始化加密链路"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-600 select-none group-focus-within:text-accent transition-colors">
                    fingerprint
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-600 italic font-medium">
                  <span className="material-symbols-outlined text-[14px] opacity-70">info</span>
                  密钥自主：口令在
                  <span className="text-white/40 not-italic px-1">本地内存</span>
                  即时派生，绝不驻留任何云端镜像。
                </div>
              </section>

              {/* 隐私防御策略 - 移动端网格优化 */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-lg">shield_with_heart</span>
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[.3em] text-gray-400">
                    隐私防御策略
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <StrategyCard
                    filter={PrivacyFilter.NONE}
                    icon="visibility"
                    label="原始"
                    description="明文"
                  />
                  <StrategyCard
                    filter={PrivacyFilter.BLUR}
                    icon="blur_on"
                    label="模糊"
                    description="高斯"
                  />
                  <StrategyCard
                    filter={PrivacyFilter.MOSAIC}
                    icon="grid_view"
                    label="像素"
                    description="脱敏"
                  />
                  <StrategyCard
                    filter={PrivacyFilter.BLACK}
                    icon="block"
                    label="屏蔽"
                    description="闭合"
                  />
                </div>
              </section>

              {/* 动作域 */}
              <div className="pt-6 md:pt-8 flex flex-col gap-6 md:gap-8">
                <button
                  type="submit"
                  disabled={!userName || !passphrase || !roomName}
                  className="group relative w-full h-16 md:h-20 bg-primary/95 rounded-2xl font-black text-base md:text-lg shadow-[0_20px_40px_-10px_rgba(19,127,236,0.25)] hover:scale-[1.01] hover:bg-primary active:scale-95 transition-all duration-500 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white uppercase tracking-[.4em] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                  <span className="relative flex items-center justify-center gap-2 md:gap-3">
                    初始化主权链路
                    <span className="material-symbols-outlined text-xl">security</span>
                  </span>
                </button>

                <footer className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-8">
                  <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 py-2 px-5 rounded-full backdrop-blur-md">
                    <span className="size-2 rounded-full bg-accent animate-pulse shadow-[0_0_12px_var(--color-accent)]"></span>
                    <span className="text-[8px] md:text-[9px] text-gray-500 uppercase tracking-[.3em] font-black">
                      端到端加密 • 零元数据节点
                    </span>
                  </div>

                  {onViewDesign && (
                    <button
                      type="button"
                      onClick={onViewDesign}
                      className="flex items-center gap-2 text-gray-600 hover:text-primary transition-all group px-4"
                    >
                      <span className="material-symbols-outlined text-sm">architecture</span>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[.2em] border-b border-transparent group-hover:border-primary transition-all">
                        技术细节：主权安全架构
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
