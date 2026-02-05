import React from 'react';

interface LandingProps {
  onNavigateToSetup: () => void;
  onViewDesign: () => void;
}

const Landing: React.FC<LandingProps> = ({ onNavigateToSetup, onViewDesign }) => {
  return (
    <div className="flex min-h-[100dvh] w-full bg-background selection:bg-primary/30 text-white overflow-hidden relative font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] size-[600px] bg-primary/10 blur-[180px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] size-[500px] bg-accent/5 blur-[150px] rounded-full"></div>
      </div>

      <div className="flex flex-col lg:flex-row w-full relative z-10">
        {/* Cinematic Brand Pane */}
        <div className="flex flex-col justify-between p-8 lg:p-20 lg:w-[55%] xl:w-[50%] border-b lg:border-b-0 lg:border-r border-white/5">
          <div className="flex items-center gap-3 mb-12 lg:mb-0 animate-in fade-in slide-in-from-left duration-700">
            <div className="size-10 lg:size-12 bg-primary flex items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(19,127,236,0.4)] transition-transform hover:scale-110">
              <span className="material-symbols-outlined text-white text-xl lg:text-2xl fill-1">shield</span>
            </div>
            <span className="font-black text-xl lg:text-2xl tracking-tighter uppercase font-sans">
              Silent<span className="text-primary">Link</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-8 lg:space-y-12 py-12 lg:py-0">
            <div className="space-y-phi-lg">
              <div className="flex items-center gap-phi-sm text-primary/80 font-mono text-[10px] lg:text-xs uppercase tracking-[0.4em] font-black animate-sentient-in">
                <span className="size-1 rounded-full bg-primary animate-ping"></span>
                主权级端对端加密专用网桥
              </div>
              <h1 className="text-4xl md:text-7xl xl:text-8xl font-black leading-[1.1] md:leading-[0.95] tracking-tighter animate-sentient-in delay-100">
                密码学意义的<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent">
                  主权数字孤岛
                </span>
              </h1>
            </div>

            <p className="text-base lg:text-xl text-gray-400 max-w-xl font-medium leading-[1.618] animate-sentient-in delay-200">
              拒绝折衷，拒绝中转。基于 WebRTC 原始隧道与 AES-256-GCM 硬件级实时加解密，确保您的对话仅瞬时存在于参与者的内存区中。真正的数字主权，从此开启。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-phi-xl gap-y-phi-lg pt-phi-lg animate-sentient-in delay-300">
              <Feature icon="memory" title="易失性存储" desc="生命周期随会话窗口销毁，不产生任何持久化物理痕迹。" />
              <Feature icon="encrypted" title="P2P 原始架构" desc="真正意义上的去中心化隧道，数据流绝不触碰中转服务器。" />
              <Feature icon="shield_lock" title="视觉防御系统" desc="WebGL 实时流深度脱敏，即便被第三方窥屏亦无法识别其内容。" />
              <Feature icon="history_edu" title="协议自主化" desc="完全透明的算法细节，代码开源支持全球独立审计。" />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-[10px] font-mono text-gray-600 uppercase tracking-widest pt-8 animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent/40"></span>
              端到端加密认证
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/40"></span>
              零存储架构验证
            </div>
          </div>
        </div>

        {/* Action & Community Pane */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 bg-surface/30 backdrop-blur-md relative overflow-hidden">
          {/* Subtle noise pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

          <div className="w-full max-w-md space-y-phi-xl relative z-10 animate-sentient-in delay-500">
            <div className="text-center space-y-phi-sm">
              <div className="inline-flex px-phi-lg py-phi-xs rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-phi-sm">
                隐私主权 • 零追踪验证
              </div>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white italic capitalize">
                建立您的安全节点
              </h2>
              <p className="text-gray-500 font-medium text-sm lg:text-base">
                初始化本地网桥并建立端到端加密频道
              </p>
            </div>

            <div className="space-y-phi-sm">
              <button
                onClick={onNavigateToSetup}
                className="w-full h-20 bg-primary hover:bg-blue-600 text-white rounded-[2rem] font-black text-lg transition-all shadow-[0_20px_40px_-10px_var(--primary-glow)] flex items-center justify-center gap-phi-md group active:scale-95 cursor-pointer"
              >
                <span>部署安全节点</span>
                <span className="material-symbols-outlined text-2xl transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">north_east</span>
              </button>

              <button
                onClick={onViewDesign}
                className="w-full h-16 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-phi-sm active:scale-95 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">architecture</span>
                <span className="text-sm tracking-widest uppercase">协议白皮书</span>
              </button>
            </div>

            <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="size-10 rounded-full border-4 border-background bg-surface overflow-hidden shadow-2xl">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 42}`} alt="avatar" />
                    </div>
                  ))}
                  <div className="size-10 rounded-full border-4 border-background bg-primary/20 text-primary flex items-center justify-center text-[11px] font-black shadow-2xl">
                    +5k
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em]">
                  已保护超过 50,000+ 次通话
                </p>
              </div>

              <div className="flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">E2EE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">terminal</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">OpenSource</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lock_person</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">WebRTC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="space-y-2 group">
    <div className="flex items-center gap-3 text-primary group-hover:translate-x-1 transition-transform">
      <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <span className="material-symbols-outlined text-[18px] fill-1">{icon}</span>
      </div>
      <h4 className="font-black text-[11px] lg:text-xs uppercase tracking-[0.15em] text-white/90">{title}</h4>
    </div>
    <p className="text-[12px] lg:text-[13px] text-gray-500 leading-relaxed font-medium pl-11">{desc}</p>
  </div>
);

export default Landing;