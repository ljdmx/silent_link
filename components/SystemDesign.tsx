import React from 'react';

interface SystemDesignProps {
    onBack: () => void;
}

const SystemDesign: React.FC<SystemDesignProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-background p-4 md:p-10 lg:p-20 overflow-y-auto selection:bg-primary/30 custom-scrollbar relative">
            {/* 动态背景装饰 */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-[0.05] z-0 overflow-hidden">
                <div className="absolute top-[-15%] left-[-10%] w-[100%] lg:w-[40%] aspect-square bg-primary blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[80%] lg:w-[30%] aspect-square bg-accent blur-[100px] rounded-full"></div>
            </div>

            <div className="max-w-7xl mx-auto space-y-12 lg:space-y-32 relative z-10">
                {/* 导航与大标题 */}
                <div className="space-y-8 animate-in slide-in-from-top duration-700">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-primary/90 font-bold hover:text-primary transition-all group px-4 py-2 rounded-xl border border-primary/20 bg-primary/5 active:scale-95 w-fit"
                    >
                        <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        <span className="uppercase tracking-[0.2em] text-[9px] font-black">返回会话</span>
                    </button>

                    <div className="space-y-4 lg:space-y-6">
                        <div className="flex items-center gap-3">
                            <span className="h-px w-6 lg:w-12 bg-primary/40"></span>
                            <span className="text-primary font-mono text-[9px] lg:text-[11px] uppercase tracking-[0.4em] font-black">主权协议修订版 v1.2</span>
                        </div>
                        {/* 增加上下间距：py-6 lg:py-10 */}
                        <h1 className="text-[2.8rem] md:text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.9] lg:leading-[0.85] py-6 lg:py-10 text-white">
                            零信任<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-accent">加固架构设计</span>
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-500 font-mono text-[8px] lg:text-[10px] uppercase tracking-[0.2em] pt-1">
                            <div className="flex items-center gap-2">编号: <span className="text-gray-300">SC-A-25</span></div>
                            <span className="opacity-20 hidden xs:inline">•</span>
                            <div className="flex items-center gap-2">级别: <span className="text-gray-300">E2EE</span></div>
                            <span className="opacity-20 hidden xs:inline">•</span>
                            <div className="flex items-center gap-2">状态: <span className="text-accent font-bold">已就绪</span></div>
                        </div>
                    </div>
                </div>

                {/* 蓝图核心：节点流向图 */}
                <section className="space-y-6 lg:space-y-10">
                    <div className="flex items-center gap-2.5">
                        <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(19,127,236,0.6)]"></span>
                        <h2 className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-gray-500">拓扑结构与加密载荷流向</h2>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 via-white/5 to-accent/30 rounded-[2rem] lg:rounded-[3rem] opacity-30 blur-md transition-opacity"></div>

                        <div className="relative glass rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-24 overflow-hidden border-white/10 shadow-3xl bg-black/40">
                            {/* 网格底纹 */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-8 items-center relative z-10">
                                {/* 节点 A */}
                                <div className="w-full lg:col-span-4 flex flex-col items-center lg:items-end text-center lg:text-right space-y-6">
                                    <div className="w-full max-w-[240px] lg:max-w-none aspect-square rounded-[2rem] bg-[#0a0f16] border border-primary/20 flex flex-col items-center justify-center relative p-6 shadow-[inset_0_0_30px_rgba(19,127,236,0.05)]">
                                        <div className="absolute -top-3 px-3 py-1 bg-primary text-[8px] font-black rounded-lg uppercase tracking-widest text-white">Initiator 发起者</div>
                                        <span className="material-symbols-outlined text-5xl text-primary mb-3 animate-float">terminal</span>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">PBKDF2 密钥衍生层</p>
                                            <div className="flex gap-1 justify-center lg:justify-end opacity-40">
                                                {[1, 2, 3, 4].map(i => <div key={i} className="size-1 bg-primary rounded-full"></div>)}
                                            </div>
                                        </div>
                                        <div className="absolute bottom-3 font-mono text-[7px] text-primary/30">AES-256-GCM READY</div>
                                    </div>
                                    <div className="space-y-2 max-w-[280px]">
                                        <h4 className="text-sm font-black uppercase text-white tracking-widest">物理隔离与预处理</h4>
                                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">数据在离开 Web Worker 前完成数学加密。原始明文永不触碰 IO 缓冲区之外的任何持久化媒介。</p>
                                    </div>
                                </div>

                                {/* 连接件 */}
                                <div className="w-full lg:col-span-4 flex flex-col lg:flex-row items-center justify-center py-4 lg:py-0">
                                    {/* 移动端连接线 */}
                                    <div className="lg:hidden flex flex-col items-center gap-2 mb-4">
                                        <div className="w-px h-10 bg-gradient-to-b from-primary/60 to-transparent"></div>
                                        <span className="material-symbols-outlined text-primary/40 text-sm animate-pulse">keyboard_double_arrow_down</span>
                                    </div>

                                    <div className="p-6 lg:p-10 glass rounded-[2rem] border-white/10 text-center space-y-4 relative w-full max-w-[200px] lg:max-w-none bg-black/60 shadow-xl border-dashed">
                                        <div className="size-12 lg:size-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto transition-colors">
                                            <span className="material-symbols-outlined text-gray-400 text-2xl">hub</span>
                                        </div>
                                        <div className="space-y-1">
                                            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-white">端到端加密流</h5>
                                            <p className="text-[8px] text-gray-500 uppercase font-bold leading-tight">ICE / DTLS / SRTP<br /><span className="text-primary/60">数据已物理脱钩</span></p>
                                        </div>
                                    </div>

                                    <div className="lg:hidden flex flex-col items-center gap-2 mt-4">
                                        <span className="material-symbols-outlined text-accent/40 text-sm animate-pulse">keyboard_double_arrow_down</span>
                                        <div className="w-px h-10 bg-gradient-to-t from-accent/60 to-transparent"></div>
                                    </div>
                                </div>

                                {/* 节点 B */}
                                <div className="w-full lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
                                    <div className="w-full max-w-[240px] lg:max-w-none aspect-square rounded-[2rem] bg-[#0a110d] border border-accent/20 flex flex-col items-center justify-center relative p-6 shadow-[inset_0_0_30px_rgba(34,197,94,0.05)]">
                                        <div className="absolute -top-3 px-3 py-1 bg-accent text-[8px] font-black rounded-lg uppercase tracking-widest text-black">目标接收节点</div>
                                        <span className="material-symbols-outlined text-5xl text-accent mb-3 animate-float" style={{ animationDelay: '1s' }}>security</span>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">流式硬件解码</p>
                                            <div className="flex gap-1 justify-center lg:justify-start opacity-40">
                                                {[1, 2, 3, 4].map(i => <div key={i} className="size-1 bg-accent rounded-full"></div>)}
                                            </div>
                                        </div>
                                        <div className="absolute bottom-3 font-mono text-[7px] text-accent/30">VERIFIED-E2EE</div>
                                    </div>
                                    <div className="space-y-2 max-w-[280px]">
                                        <h4 className="text-sm font-black uppercase text-white tracking-widest">安全渲染与销毁</h4>
                                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">采用 AES-NI 实时分片解密。处理后的视频帧在屏幕渲染后即刻从内存物理抹除。</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 核心技术特性网格 */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
                    <TechnicalCard
                        title="易失性生命周期"
                        icon="key"
                        desc="基于 Web Crypto API。密钥瞬时产生并在会话窗关闭时物理抹除，拒绝任何形式的“前向破解”。"
                    />
                    <TechnicalCard
                        title="分布式分片背压"
                        icon="splitscreen"
                        desc="基于 SCTP 通道的流式负载均衡。二进制分片经硬件加速加解密，提供极低延迟的超大文件点对点闪传。"
                    />
                    <TechnicalCard
                        title="WebGL 实时流脱敏"
                        icon="filter_center_focus"
                        desc="在 MediaStream 原生流捕获阶段即注入着色器进行脱敏，确保流经网络封包的数据已被原始脱钩。"
                    />
                </div>

                {/* 页脚规格 */}
                <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 opacity-50 pb-12">
                    <div className="flex gap-6 items-center">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-white">底层加密标准</p>
                            <p className="text-[7px] font-mono text-gray-400">PBKDF2-HMAC-SHA256 / AES-256-GCM</p>
                        </div>
                        <div className="h-6 w-px bg-white/20"></div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-white">隐私传输协议</p>
                            <p className="text-[7px] font-mono text-gray-400">Sovereign Zero-Trust / WebRTC</p>
                        </div>
                    </div>
                    <p className="text-[7px] font-mono text-center md:text-right max-w-[240px] leading-relaxed">
                        本协议版本经由密码学完整性验证。数据主权严格属于物理通信端，算法完全隔离任何第三方机构。
                    </p>
                </div>
            </div>
        </div>
    );
};

const TechnicalCard = ({ title, desc, icon }: { title: string; desc: string; icon: string }) => (
    <div className="group p-6 lg:p-10 bg-[#0d1117]/60 border border-white/5 rounded-3xl space-y-4 hover:bg-white/[0.02] transition-all duration-500 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <span className="material-symbols-outlined text-[80px]">{icon}</span>
        </div>
        <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div className="space-y-1.5">
            <h4 className="text-xs font-black uppercase text-white tracking-wide">{title}</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{desc}</p>
        </div>
    </div>
);

export default SystemDesign;
