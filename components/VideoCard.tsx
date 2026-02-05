import React, { useEffect, useRef } from 'react';
import { Participant, PrivacyFilter } from '../types';

interface VideoCardProps {
  participant: Participant;
  filter: PrivacyFilter;
  isLarge?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ participant, filter, isLarge }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => { });
    }
  }, [participant.stream]);

  useEffect(() => {
    if (filter === PrivacyFilter.MOSAIC && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      let animationFrame: number;

      const render = () => {
        if (ctx && video.readyState >= 2 && video.srcObject) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const scale = 0.03;
          const w = canvas.width * scale;
          const h = canvas.height * scale;

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(video, 0, 0, w, h);

          ctx.filter = 'blur(8px)';
          ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
        }
        animationFrame = requestAnimationFrame(render);
      };
      render();
      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };
    }
  }, [filter]);

  return (
    <div className={`relative w-full h-full overflow-hidden transition-all duration-1000 bg-background ${isLarge ? '' : 'rounded-[1.618rem] lg:rounded-[2.618rem] border border-border shadow-3xl'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`w-full h-full object-cover transition-all duration-1000 ${filter === PrivacyFilter.BLUR ? 'blur-[100px] scale-125' :
          (filter === PrivacyFilter.BLACK || filter === PrivacyFilter.MOSAIC ? 'opacity-0' : 'opacity-100')
          }`}
      />

      {filter === PrivacyFilter.MOSAIC && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-500" />
      )}

      {(filter === PrivacyFilter.BLACK || filter === PrivacyFilter.BLUR) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-phi-lg bg-black/40 backdrop-blur-3xl animate-sentient-in">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-phi-md text-primary border border-primary/20 shadow-[0_0_50px_var(--color-primary-dim)]">
            <span className="material-symbols-outlined text-4xl animate-pulse">visibility_off</span>
          </div>
          {!participant.isLocal && (
            <h3 className="text-[10px] font-black tracking-[0.5em] uppercase text-white/50">隐私安全防护生效中</h3>
          )}
        </div>
      )}

      {!participant.isLocal && (
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-0"></div>
      )}

      <div className="absolute top-phi-xs lg:top-phi-lg left-phi-xs lg:left-phi-lg flex flex-wrap gap-phi-xs max-w-[90%] z-20">
        <div className="px-2 lg:px-phi-md py-1 lg:py-phi-xs bg-black/50 backdrop-blur-3xl rounded-[0.8rem] lg:rounded-[1rem] text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-phi-xs border border-border">
          <span className={`size-1.5 lg:size-2 rounded-full ${participant.audioEnabled ? 'bg-accent shadow-[0_0_10px_var(--color-accent)]' : 'bg-red-500 animate-pulse'}`}></span>
          <span className="truncate max-w-[80px] lg:max-w-[200px] text-white/90">{participant.name}</span>
        </div>

        {(!participant.audioEnabled || !participant.videoEnabled) && (
          <div className="px-3 py-2 bg-red-500/10 backdrop-blur-2xl rounded-2xl border border-red-500/20 flex items-center gap-2">
            {!participant.audioEnabled && <span className="material-symbols-outlined text-[14px] text-red-500 fill-1">mic_off</span>}
            {!participant.videoEnabled && <span className="material-symbols-outlined text-[14px] text-red-500 fill-1">videocam_off</span>}
          </div>
        )}
      </div>

      {!participant.isLocal && filter !== PrivacyFilter.NONE && (
        <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 flex gap-2 z-20">
          <div className="size-12 rounded-2xl bg-primary/20 backdrop-blur-3xl flex items-center justify-center text-primary shadow-[0_0_30px_rgba(19,127,236,0.3)] border border-primary/30 animate-float">
            <span className="material-symbols-outlined text-2xl fill-1">lock</span>
          </div>
        </div>
      )}

      {/* Subtle Noise overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-10 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );
};

export default VideoCard;
