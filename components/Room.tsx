
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoomConfig, Participant, PrivacyFilter, ChatMessage, FileTransfer, ReceivingFileState, FileMetaPayload } from '../types';
import { deriveKey, encryptMessage, decryptMessage, encryptBuffer, decryptBuffer, hashPassphrase } from '../crypto';
import { supabase } from '../supabase';
import VideoCard from './VideoCard';

// Protocol Constants
const PROTOCOL_CONFIG = {
  CHUNK_SIZE: 64 * 1024,
  BUFFER_THRESHOLD: 1 * 1024 * 1024,
  HEARTBEAT_INTERVAL: 5000,
  HANDSHAKE_TIMEOUT: 4000,
  GATHERING_TIMEOUT: 4000,
  SESSION_EXPIRY: 8000,
  ROOM_FULL_EXPIRY: 12000,
  MOBILE_WIDTH: 640,
  MOBILE_HEIGHT: 360,
  DESKTOP_WIDTH: 1280,
  DESKTOP_HEIGHT: 720,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  NEGOTIATION_THROTTLE: 5000
};

type SignalingPayload = {
  id?: number;
  room_id: string;
  initiator_id?: string;
  receiver_id?: string | null;
  offer?: string;
  answer?: string | null;
  passphrase_hash?: string;
  updated_at?: string;
  created_at?: string;
};

interface RoomProps {
  config: RoomConfig;
  onExit: () => void;
}

type HandshakeRole = 'none' | 'initiator' | 'receiver';

const Room: React.FC<RoomProps> = ({ config, onExit }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [peerId] = useState(() => {
    const sid = sessionStorage.getItem('sl_peer_id') || crypto.randomUUID();
    sessionStorage.setItem('sl_peer_id', sid);
    return sid;
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<FileTransfer[]>([]);
  const [currentFilter, setCurrentFilter] = useState<PrivacyFilter>(config.defaultFilter);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteHidden, setIsRemoteHidden] = useState(false);
  const [showLocalPreview, setShowLocalPreview] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' | 'warning' } | null>(null);

  const localParticipant = participants.find(p => p.isLocal);
  const remoteParticipant = participants.find(p => !p.isLocal);

  const [role, setRole] = useState<HandshakeRole>(config.initialOffer ? 'receiver' : 'none');
  const localSDPRef = useRef('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'preparing' | 'ready' | 'connected' | 'security-error' | 'media-error' | 'room-full'>('idle');

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const encryptionKeyRef = useRef<CryptoKey | null>(null);

  const rawStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const filterCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const filterRef = useRef<PrivacyFilter>(config.defaultFilter);
  const isMutedRef = useRef(isMuted);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);
  const isInitializingRef = useRef(false);
  const isSignalingRef = useRef(false);
  const roleRef = useRef<HandshakeRole>(config.initialOffer ? 'receiver' : 'none');
  const connectionStatusRef = useRef<'idle' | 'preparing' | 'ready' | 'connected' | 'security-error' | 'media-error' | 'room-full'>('idle');
  const processedOfferRef = useRef(false);
  const processedAnswerRef = useRef(false);
  const signalChannelRef = useRef<any>(null);

  // Managed Resources
  const timeoutsRef = useRef<Set<any>>(new Set());
  const intervalsRef = useRef<Set<any>>(new Set());
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => { timeoutsRef.current.delete(t); fn(); }, ms);
    timeoutsRef.current.add(t);
    return t;
  }, []);

  const addInterval = useCallback((fn: () => void, ms: number) => {
    const i = setInterval(fn, ms);
    intervalsRef.current.add(i);
    return i;
  }, []);

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current.clear();
  }, []);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinAndSignalRef = useRef<(() => void) | null>(null);
  const lastNegotiationRef = useRef(0);
  const heartbeatFailuresRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStatus = useCallback((s: typeof connectionStatus) => {
    setConnectionStatus(s);
    connectionStatusRef.current = s;
  }, []);

  const showToast = useCallback((msg: string, type: 'info' | 'error' | 'warning' = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const scheduleReconnect = useCallback((delayMs = 1000) => {
    if (reconnectTimeoutRef.current) return; // Already scheduled
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      joinAndSignalRef.current?.();
    }, delayMs);
  }, []);

  const cleanupResources = useCallback(() => {
    try {
      // Clear file receive state
      receivingRef.current = null;

      // Close peers with event handler cleanup
      peersRef.current.forEach(pc => {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.onnegotiationneeded = null;
        pc.onicecandidateerror = null;
        pc.onicegatheringstatechange = null;
        pc.close();
      });
      peersRef.current.clear();

      // Close data channels with event handler cleanup
      dataChannelsRef.current.forEach(dc => {
        dc.onmessage = null;
        dc.onclose = null;
        dc.onerror = null;
        if (dc.readyState !== 'closed') dc.close();
      });
      dataChannelsRef.current.clear();

      // Stop media tracks
      rawStreamRef.current?.getTracks().forEach(t => t.stop());
      processedStreamRef.current?.getTracks().forEach(t => t.stop());
      remoteStreamRef.current = null;

      // Revoke blob URLs
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();

      // Clear all timers
      clearAllTimers();

      // Remove signaling channel
      if (signalChannelRef.current) {
        supabase.removeChannel(signalChannelRef.current);
        signalChannelRef.current = null;
      }

      // Cancel pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Abort active file transfer
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Reset signaling state
      isSignalingRef.current = false;
      processedOfferRef.current = false;
      processedAnswerRef.current = false;
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }, [clearAllTimers]);

  const handleManualExit = useCallback(async () => {
    const termMsg = JSON.stringify({ type: 'session-terminate' });
    dataChannelsRef.current.forEach(dc => { if (dc.readyState === 'open') dc.send(termMsg); });
    try { await supabase.from('rooms_signaling').delete().eq('room_id', config.roomId); } catch (e) { }
    cleanupResources();
    onExit();
  }, [cleanupResources, onExit, config.roomId]);

  const addOrUpdateParticipant = useCallback((p: Participant) => {
    setParticipants(prev => {
      const exists = prev.find(u => u.id === p.id);
      if (exists) {
        // Stream and other complex objects won't stringify well, 
        // focus on name, enabling flags, and stream presence change
        const changed = exists.name !== p.name ||
          exists.audioEnabled !== p.audioEnabled ||
          exists.videoEnabled !== p.videoEnabled ||
          exists.stream !== p.stream;
        if (!changed) return prev;
        return prev.map(u => u.id === p.id ? { ...u, ...p } : u);
      }
      return [...prev, p];
    });
  }, []);

  // Audio Mute Control (inline send to avoid dependency loop)
  useEffect(() => {
    isMutedRef.current = isMuted;
    rawStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    processedStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    if (connectionStatusRef.current === 'connected') {
      const payload = JSON.stringify({
        type: 'privacy-update',
        filter: filterRef.current,
        audioEnabled: !isMuted,
        videoEnabled: filterRef.current === PrivacyFilter.NONE
      });
      dataChannelsRef.current.forEach(dc => { if (dc.readyState === 'open') dc.send(payload); });
    }
  }, [isMuted]);

  // Remote Stream Tracking
  useEffect(() => {
    if (remoteParticipant?.stream && remoteParticipant.stream !== remoteStreamRef.current) {
      remoteStreamRef.current = remoteParticipant.stream;
    }
  }, [remoteParticipant]);

  // Remote Audio Mute Control
  useEffect(() => {
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isRemoteMuted; });
    }
  }, [isRemoteMuted]);

  const receivingRef = useRef<ReceivingFileState | null>(null);
  const handleFileMetaReceive = useCallback((m: FileMetaPayload) => {
    receivingRef.current = { ...m, chunks: [], received: 0 };
    setFiles(prev => [{ id: m.id, name: m.name, size: m.size, progress: 0, status: 'transferring', mimeType: m.mimeType }, ...prev]);
  }, []);

  const handleFileChunkReceive = useCallback(async (d: ArrayBuffer) => {
    const s = receivingRef.current; if (!s) return;
    try {
      const iv = new Uint8Array(d.slice(0, 12));
      const dec = await decryptBuffer(encryptionKeyRef.current!, d.slice(12), iv);
      s.chunks.push(dec); s.received += dec.byteLength;
      setFiles(prev => prev.map(f => f.id === s.id ? { ...f, progress: Math.min(100, Math.round((s.received / s.size) * 100)) } : f));
      if (s.received >= s.size) {
        const url = URL.createObjectURL(new Blob(s.chunks, { type: s.mimeType })); blobUrlsRef.current.add(url);
        setMessages(prev => [...prev, { id: s.id, senderId: 'peer', senderName: '对方', blobUrl: url, type: s.mimeType?.startsWith('image/') ? 'image' : 'file', fileName: s.name, timestamp: Date.now() }]);
        setFiles(prev => prev.map(f => f.id === s.id ? { ...f, status: 'completed' } : f)); receivingRef.current = null;
      }
    } catch (e) { receivingRef.current = null; }
  }, []);

  const syncPrivacy = useCallback((filter: PrivacyFilter, muted: boolean) => {
    const payload = JSON.stringify({ type: 'privacy-update', filter, audioEnabled: !muted, videoEnabled: filter === PrivacyFilter.NONE });
    dataChannelsRef.current.forEach(dc => { if (dc.readyState === 'open') dc.send(payload); });
    setParticipants(prev => prev.map(p => p.isLocal ? { ...p, audioEnabled: !muted, videoEnabled: filter === PrivacyFilter.NONE } : p));
  }, []);

  const setupDC = useCallback((id: string, dc: RTCDataChannel) => {
    dataChannelsRef.current.set(id, dc);
    dc.onclose = () => { if (connectionStatusRef.current === 'connected') showToast("数据通道已关闭", "warning"); };
    dc.onerror = () => { showToast("通道安全校验异常", "error"); };
    dc.onmessage = async (e) => {
      if (typeof e.data === 'string') {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'chat' && encryptionKeyRef.current) {
            const text = await decryptMessage(encryptionKeyRef.current, payload.data, payload.iv);
            setMessages(prev => [...prev, { id: Date.now().toString(), senderId: id, senderName: '对方', text, type: 'text', timestamp: Date.now() }]);
          } else if (payload.type === 'privacy-update') {
            setParticipants(prev => prev.map(p => p.id === id ? { ...p, audioEnabled: payload.audioEnabled, videoEnabled: payload.videoEnabled } : p));
          } else if (payload.type === 'file-meta') handleFileMetaReceive(payload);
          else if (payload.type === 'file-abort') { showToast("文件传输取消", "error"); setFiles(prev => prev.map(f => f.id === payload.id ? { ...f, status: 'failed' } : f)); }
          else if (payload.type === 'session-terminate') handleManualExit();
        } catch (e) { console.warn("DC message parse error:", e); }
      } else handleFileChunkReceive(e.data);
    };
  }, [showToast, handleManualExit, handleFileMetaReceive, handleFileChunkReceive]);

  const setupPeerConnection = useCallback(async (remoteId: string, isOffer: boolean): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.qq.com:3478' },
        { urls: 'stun:stun.miwifi.com:3478' },
        { urls: 'stun:stun.douyucdn.cn:3478' },
        { urls: 'stun:stun.hitv.com:3478' },
        { urls: 'stun:stun.syncthing.net:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        // Placeholder for TURN server to achieve 100% connectivity in restrictive networks
        // Users can replace these with their own Coturn or paid TURN service credentials
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 5
    });
    peersRef.current.set(remoteId, pc);
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log(`Signaling: [ICE] Type: ${e.candidate.type} | Proto: ${e.candidate.protocol} | Port: ${e.candidate.port}`);
        if (e.candidate.type === 'relay') console.log("Signaling: [Sovereign Mode] Using TURN Relay for 100% penetration.");
      }
    };
    if (processedStreamRef.current) processedStreamRef.current.getTracks().forEach(t => pc.addTrack(t, processedStreamRef.current!));
    pc.ontrack = (e) => addOrUpdateParticipant({ id: remoteId, name: "远端节点", isLocal: false, isHost: false, audioEnabled: true, videoEnabled: true, stream: e.streams[0] });
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { updateStatus('connected'); syncPrivacy(filterRef.current, isMutedRef.current); }
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
        showToast("主权隧道掉线，尝试极速自愈...", "warning");
        scheduleReconnect(1000);
      }
    };
    pc.onicecandidateerror = (e) => { if (e.errorCode >= 300) console.warn("ICE Component Error:", e.url, e.errorText); };
    pc.onnegotiationneeded = async () => {
      const now = Date.now();
      if (pc.signalingState === 'stable' && roleRef.current === 'initiator' && now - lastNegotiationRef.current > PROTOCOL_CONFIG.NEGOTIATION_THROTTLE) {
        lastNegotiationRef.current = now;
        joinAndSignalRef.current?.();
      }
    };

    if (isOffer) { const dc = pc.createDataChannel('chat', { ordered: true }); setupDC(remoteId, dc); }
    else pc.ondatachannel = (e) => setupDC(remoteId, e.channel);
    return pc;
  }, [addOrUpdateParticipant, syncPrivacy, showToast, setupDC]);

  const joinAndSignal = useCallback(async (retryCount = 0) => {
    if (isSignalingRef.current || retryCount > 3) return;
    isSignalingRef.current = true;

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      intervalsRef.current.delete(heartbeatRef.current);
    }
    if (signalChannelRef.current) supabase.removeChannel(signalChannelRef.current);

    const room_id = config.roomId;
    const pass_hash = await hashPassphrase(config.passphrase);
    setParticipants(prev => prev.map(p => p.isLocal ? { ...p, id: peerId } : p));
    processedOfferRef.current = false;
    processedAnswerRef.current = false;

    const channel = supabase.channel(`room-${room_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'rooms_signaling', filter: `room_id=eq.${room_id}` }, async (payload) => {
      if (payload.eventType === 'DELETE') {
        if (connectionStatusRef.current !== 'connected') {
          cleanupResources();
          scheduleReconnect(500);
        }
        return;
      }
      if (payload.eventType === 'INSERT' && connectionStatusRef.current !== 'connected' && roleRef.current === 'none') {
        isSignalingRef.current = false;
        scheduleReconnect(300);
        return;
      }
      const updatedRoom = payload.new as SignalingPayload;
      if (!updatedRoom) return;

      if (updatedRoom.offer && updatedRoom.offer !== 'CLAIMED' && roleRef.current === 'receiver' &&
        (connectionStatusRef.current === 'preparing' || connectionStatusRef.current === 'idle') && !processedOfferRef.current) {
        processedOfferRef.current = true;
        console.log("Signaling: Handling Offer Update...");
        updateStatus('preparing');
        const offer = JSON.parse(atob(updatedRoom.offer));
        const pc = await setupPeerConnection('peer', false);
        let gatheringComplete = false;
        const gatherTimeout = addTimeout(() => {
          if (!gatheringComplete && pc.localDescription) {
            console.log("Signaling: Gathering timeout, sending Answer anyway");
            sendAnswer(pc.localDescription);
          }
        }, PROTOCOL_CONFIG.GATHERING_TIMEOUT);

        const sendAnswer = async (description: RTCSessionDescriptionInit) => {
          if (gatheringComplete) return;
          gatheringComplete = true;
          // Clear ICE gathering timeout
          clearTimeout(gatherTimeout);
          timeoutsRef.current.delete(gatherTimeout);

          const answerSDP = btoa(JSON.stringify(description));
          console.log(`Signaling: Attempting to claim receiver slot as ${peerId}...`);
          const { data: updData, error: updError } = await supabase.from('rooms_signaling').update({ receiver_id: peerId, answer: answerSDP }).eq('room_id', room_id).is('receiver_id', null).select();

          if (updError) console.error("Signaling: Receiver Update Error:", updError);

          if (updError || !updData || updData.length === 0) {
            console.warn("Signaling: Atomic claim failed, checking if already claimed by self...");
            const { data: currentRoom } = await supabase.from('rooms_signaling').select('*').eq('room_id', room_id).single();
            if (currentRoom && currentRoom.receiver_id === peerId) {
              console.log("Signaling: Already claimed by self, proceeding.");
              localSDPRef.current = answerSDP; updateStatus('ready');
            } else {
              console.error("Signaling: Room full or claimed by others. Current receiver:", currentRoom?.receiver_id);
              updateStatus('room-full');
            }
          } else {
            console.log("Signaling: Receiver slot claimed successfully.");
            localSDPRef.current = answerSDP; updateStatus('ready');
          }
          isSignalingRef.current = false;
        };

        pc.onicegatheringstatechange = () => {
          console.log("Signaling: Receiver ICE Gathering State:", pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete' && !gatheringComplete) sendAnswer(pc.localDescription!);
        };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        } catch (err) {
          console.error("Signaling: Receiver SDP Error:", err);
          isSignalingRef.current = false;
        }
        return;
      }

      if (updatedRoom.answer && roleRef.current === 'initiator' && !processedAnswerRef.current) {
        const pc = peersRef.current.get('peer');
        if (pc && (pc.signalingState === 'have-local-offer' || pc.signalingState === 'stable') && updatedRoom.initiator_id === peerId) {
          try {
            console.log("Signaling: Handling Answer Update...");
            const answer = JSON.parse(atob(updatedRoom.answer));
            if (pc.signalingState === 'have-local-offer') {
              processedAnswerRef.current = true;
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
          } catch (e) { console.error("Signaling Answer Error:", e); }
        }
      }
    });

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("Signaling: Realtime subscription ready");
          addTimeout(() => resolve(), 500);
        }
      });
    });
    signalChannelRef.current = channel;

    try {
      const { data: rooms } = await supabase.from('rooms_signaling').select('*').eq('room_id', room_id).limit(1);
      const roomData = rooms && rooms.length > 0 ? rooms[0] : null;

      if (roomData && roomData.initiator_id && roomData.receiver_id) {
        const now = Date.now();
        if (roomData.updated_at) {
          const updatedAt = new Date(roomData.updated_at).getTime();
          if (!isNaN(updatedAt)) {
            if (roomData.initiator_id === peerId || roomData.receiver_id === peerId) {
              if (now - updatedAt > PROTOCOL_CONFIG.SESSION_EXPIRY) {
                await supabase.from('rooms_signaling').delete().eq('room_id', room_id);
                isSignalingRef.current = false;
                addTimeout(() => joinAndSignal(0), 500);
                return;
              }
            } else if (now - updatedAt > PROTOCOL_CONFIG.ROOM_FULL_EXPIRY) {
              await supabase.from('rooms_signaling').delete().eq('room_id', room_id);
              isSignalingRef.current = false;
              addTimeout(() => joinAndSignal(0), 500);
              return;
            }
          }
        }
        updateStatus('room-full');
        isSignalingRef.current = false;
        return;
      }

      if (!roomData) {
        console.log("Signaling: Claiming as Initiator...");
        roleRef.current = 'initiator'; setRole('initiator'); updateStatus('preparing');
        const { error: claimError } = await supabase.from('rooms_signaling').insert({ room_id, initiator_id: peerId, offer: 'CLAIMED', passphrase_hash: pass_hash });
        if (claimError) {
          isSignalingRef.current = false;
          addTimeout(() => joinAndSignal(retryCount + 1), 300);
          return;
        }
        const pc = await setupPeerConnection('peer', true);
        let gatheringComplete = false;
        const gatherTimeout = addTimeout(() => { if (!gatheringComplete && pc.localDescription) sendOffer(pc.localDescription); }, PROTOCOL_CONFIG.GATHERING_TIMEOUT);
        const sendOffer = async (description: RTCSessionDescriptionInit) => {
          if (gatheringComplete) return;
          gatheringComplete = true;
          clearTimeout(gatherTimeout);
          timeoutsRef.current.delete(gatherTimeout);
          const offerSDP = btoa(JSON.stringify(description));
          console.log("Signaling: Posting Offer...");
          await supabase.from('rooms_signaling').update({ offer: offerSDP }).eq('room_id', room_id);
          localSDPRef.current = offerSDP; updateStatus('ready'); isSignalingRef.current = false;
        };
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete' && !gatheringComplete) sendOffer(pc.localDescription!); };
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      } else if (!roomData.receiver_id) {
        if (roomData.passphrase_hash !== pass_hash) {
          showToast("房间口令不匹配", "error"); isSignalingRef.current = false; addTimeout(onExit, 2000); return;
        }
        roleRef.current = 'receiver'; setRole('receiver'); updateStatus('preparing');
        if (roomData.offer === 'CLAIMED') { isSignalingRef.current = false; return; }

        processedOfferRef.current = true;
        const offer = JSON.parse(atob(roomData.offer));
        console.log("Signaling: Found Offer in Fetch, processing...");
        const pc = await setupPeerConnection('peer', false);
        let gatheringComplete = false;
        const gatherTimeout = addTimeout(() => { if (!gatheringComplete && pc.localDescription) sendAnswer(pc.localDescription); }, PROTOCOL_CONFIG.GATHERING_TIMEOUT);
        const sendAnswer = async (description: RTCSessionDescriptionInit) => {
          if (gatheringComplete) return;
          gatheringComplete = true;
          clearTimeout(gatherTimeout);
          timeoutsRef.current.delete(gatherTimeout);
          const answerSDP = btoa(JSON.stringify(description));
          console.log(`Signaling: Attempting to claim receiver slot as ${peerId}...`);
          const { data: updData, error: updError } = await supabase.from('rooms_signaling').update({ receiver_id: peerId, answer: answerSDP }).eq('room_id', room_id).is('receiver_id', null).select();
          if (updError || !updData || updData.length === 0) {
            const { data: currentRoom } = (await supabase.from('rooms_signaling').select('*').eq('room_id', room_id).single()) as { data: SignalingPayload };
            if (currentRoom && currentRoom.receiver_id === peerId) {
              console.log("Signaling: Already claimed by self, proceeding.");
              localSDPRef.current = answerSDP; updateStatus('ready');
            } else {
              console.error("Signaling: Room full or claimed by others.");
              updateStatus('room-full');
            }
          } else {
            console.log("Signaling: Receiver slot claimed successfully.");
            localSDPRef.current = answerSDP; updateStatus('ready');
          }
          isSignalingRef.current = false;
        };
        pc.onicegatheringstatechange = () => {
          console.log("Signaling: Receiver (Fetch) ICE Gathering State:", pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete' && !gatheringComplete) sendAnswer(pc.localDescription!);
        };
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        } catch (err) {
          console.error("Signaling: Receiver (Fetch) SDP Error:", err);
          isSignalingRef.current = false;
        }
      } else {
        updateStatus('room-full'); isSignalingRef.current = false;
      }
    } catch (err) { console.error(err); isSignalingRef.current = false; }

    heartbeatRef.current = addInterval(async () => {
      if (roleRef.current !== 'none') {
        try {
          const updateField = roleRef.current === 'initiator' ? { initiator_id: peerId } : { receiver_id: peerId };
          const { error } = await supabase.from('rooms_signaling').update({ ...updateField, updated_at: new Date().toISOString() }).eq('room_id', room_id);
          if (error) {
            console.warn("Heartbeat failed:", error.message);
            heartbeatFailuresRef.current++;
            if (heartbeatFailuresRef.current >= 3 && connectionStatusRef.current === 'connected') {
              showToast("心跳失败，尝试重连...", "warning");
              heartbeatFailuresRef.current = 0;
              joinAndSignalRef.current?.();
            }
          } else {
            heartbeatFailuresRef.current = 0;
          }
        } catch (e) {
          console.error("Heartbeat error:", e);
          heartbeatFailuresRef.current++;
        }
      }
    }, PROTOCOL_CONFIG.HEARTBEAT_INTERVAL);
  }, [config.roomId, config.passphrase, peerId, showToast, cleanupResources, onExit, setupPeerConnection, updateStatus]);

  useEffect(() => { joinAndSignalRef.current = joinAndSignal; }, [joinAndSignal]);

  const setupLocalParticipant = useCallback((stream: MediaStream | null, videoEnabled = true, joinSession = true) => {
    const canvas = filterCanvasRef.current;
    const canvasStream = (canvas as any).captureStream(30);
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !isMutedRef.current; canvasStream.addTrack(audioTrack); }
    }
    processedStreamRef.current = canvasStream;
    addOrUpdateParticipant({ id: 'local', name: config.userName, isLocal: true, isHost: true, audioEnabled: !!stream && !isMutedRef.current, videoEnabled: !!stream && videoEnabled && filterRef.current === PrivacyFilter.NONE, stream: canvasStream });
    if (joinSession) joinAndSignal();
  }, [config.userName, addOrUpdateParticipant, joinAndSignal]);

  const initMedia = useCallback(async (isRetry = false) => {
    if (isInitializingRef.current) return; isInitializingRef.current = true;

    // Check Secure Context for Web Crypto
    if (!window.isSecureContext) {
      setConnectionStatus('security-error');
      showToast("安全上下文缺失：请使用 HTTPS 或 localhost 访问", "error");
      return;
    }

    try {
      encryptionKeyRef.current = await deriveKey(config.passphrase, config.roomId);
    } catch (e) {
      setConnectionStatus('security-error');
      return;
    }

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: isMobile ? PROTOCOL_CONFIG.MOBILE_WIDTH : PROTOCOL_CONFIG.DESKTOP_WIDTH,
          height: isMobile ? PROTOCOL_CONFIG.MOBILE_HEIGHT : PROTOCOL_CONFIG.DESKTOP_HEIGHT
        },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      rawStreamRef.current = stream;
      setupLocalParticipant(stream);
    } catch (err: any) {
      console.warn("Media Access Error:", err.name, err.message);

      // Fallback for hardware in use or timeouts (AbortError)
      if ((err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.name === 'AbortError') && !isRetry) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          rawStreamRef.current = audioStream;
          setupLocalParticipant(audioStream, false);
          return;
        } catch (e) { console.error("Audio-only fallback failed:", e); }
      }

      if (err.name === 'NotAllowedError') {
        showToast("摄像头/麦克风权限被拒绝", "error");
      } else if (err.name === 'NotFoundError') {
        showToast("未检测到媒体设备", "warning");
      } else if (err.name === 'AbortError') {
        showToast("视频通道响应超时，已自动切至语音模式", "warning");
      }

      if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.name === 'AbortError') {
        setupLocalParticipant(null, false);
        return;
      }

      setConnectionStatus('media-error');
    }
  }, [config.passphrase, config.roomId, setupLocalParticipant, showToast]);

  useEffect(() => {
    initMedia();
    return () => cleanupResources();
  }, [initMedia, cleanupResources]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionStatusRef.current !== 'connected' && roleRef.current !== 'none') {
        scheduleReconnect(500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [scheduleReconnect]);

  useEffect(() => {
    let animationFrame: number;
    let lastWidth = 0, lastHeight = 0;
    const canvas = filterCanvasRef.current, ctx = canvas.getContext('2d', { alpha: false });
    const video = document.createElement('video'); video.muted = true; video.playsInline = true;
    const render = () => {
      if (ctx && video.readyState >= 2 && rawStreamRef.current) {
        if (video.videoWidth !== lastWidth || video.videoHeight !== lastHeight) { canvas.width = lastWidth = video.videoWidth; canvas.height = lastHeight = video.videoHeight; }
        if (filterRef.current === PrivacyFilter.BLACK) { ctx.fillStyle = '#06080a'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        else if (filterRef.current === PrivacyFilter.MOSAIC) {
          const scale = 0.02, w = Math.max(1, canvas.width * scale), h = Math.max(1, canvas.height * scale);
          ctx.imageSmoothingEnabled = false; ctx.drawImage(video, 0, 0, w, h);
          ctx.filter = 'blur(10px)'; ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height); ctx.filter = 'none';
        } else ctx.drawImage(video, 0, 0);
      }
      animationFrame = requestAnimationFrame(render);
    };
    const checker = addInterval(() => { if (rawStreamRef.current && video.srcObject !== rawStreamRef.current) { video.srcObject = rawStreamRef.current; video.play().catch((e) => { console.warn("Video play error:", e); }); } }, 1000);
    render();
    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(checker);
      intervalsRef.current.delete(checker);
    };
  }, [addInterval]);

  useEffect(() => { filterRef.current = currentFilter; if (connectionStatus === 'connected') syncPrivacy(currentFilter, isMuted); }, [currentFilter, isMuted, connectionStatus, syncPrivacy]);


  const sendMessage = async (text: string) => {
    if (!encryptionKeyRef.current) return;
    try {
      const encrypted = await encryptMessage(encryptionKeyRef.current, text);
      const payload = JSON.stringify({ type: 'chat', ...encrypted });
      let sent = false;
      dataChannelsRef.current.forEach(dc => {
        if (dc.readyState === 'open') {
          try {
            dc.send(payload); sent = true;
          } catch (e) {
            console.error("DC Send Error:", e);
          }
        }
      });
      if (sent) setMessages(prev => [...prev, { id: Date.now().toString(), senderId: 'local', senderName: config.userName, text, type: 'text', timestamp: Date.now() }]);
      else showToast("链路断开，无法发送", "error");
    } catch (e) { console.error("Encryption error:", e); }
  };

  const handleFileUpload = async (file: File) => {
    if (!encryptionKeyRef.current) return;
    if (file.size > PROTOCOL_CONFIG.MAX_FILE_SIZE) {
      return showToast(`文件过大，最大支持 ${PROTOCOL_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`, "error");
    }
    const id = Math.random().toString(36).substring(7);
    const meta: FileMetaPayload = { type: 'file-meta', id, name: file.name, size: file.size, mimeType: file.type };
    let anyOpen = false;
    dataChannelsRef.current.forEach(dc => { if (dc.readyState === 'open') { dc.send(JSON.stringify(meta)); anyOpen = true; } });
    if (!anyOpen) return showToast("未检测到连接", "error");

    // Create abort controller for this transfer
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setFiles(prev => [{ id, name: file.name, size: file.size, progress: 0, status: 'transferring', mimeType: file.type }, ...prev]);

    try {
      const buf = await file.arrayBuffer();
      let off = 0;

      const dc = Array.from(dataChannelsRef.current.values()).find((d: any) => d.readyState === 'open') as RTCDataChannel | undefined;
      if (!dc) throw new Error("No open channel");

      const sendNext = async () => {
        if (controller.signal.aborted) return; // Check abort signal
        try {
          while (off < buf.byteLength && dc.readyState === 'open' && dc.bufferedAmount < PROTOCOL_CONFIG.BUFFER_THRESHOLD && !controller.signal.aborted) {
            const chunk = buf.slice(off, off + PROTOCOL_CONFIG.CHUNK_SIZE);
            const { data, iv } = await encryptBuffer(encryptionKeyRef.current!, chunk);
            const pack = new Uint8Array(iv.length + data.byteLength);
            pack.set(iv, 0);
            pack.set(new Uint8Array(data), iv.length);

            dc.send(pack);
            off += chunk.byteLength;
            setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: Math.min(100, Math.round((off / file.size) * 100)) } : f));
          }

          if (controller.signal.aborted) {
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'failed' } : f));
            return;
          }

          if (off < buf.byteLength && dc.readyState === 'open') {
            dc.onbufferedamountlow = () => {
              dc.onbufferedamountlow = null;
              sendNext();
            };
          } else if (dc.readyState === 'open') {
            const url = URL.createObjectURL(new Blob([buf], { type: file.type }));
            blobUrlsRef.current.add(url);
            setMessages(prev => [...prev, { id, senderId: 'local', senderName: config.userName, blobUrl: url, type: file.type.startsWith('image/') ? 'image' : 'file', fileName: file.name, timestamp: Date.now() }]);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'completed' } : f));
            abortControllerRef.current = null;
          } else {
            throw new Error("Channel closed during transfer");
          }
        } catch (e) {
          console.error("File transfer process error:", e);
          setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'failed' } : f));
          showToast("文件传输中断", "error");
          abortControllerRef.current = null;
        }
      };

      dc.onclose = () => {
        console.warn("DC Closed during active transfer, aborting.");
        controller.abort();
        setFiles(prev => prev.map(f => f.id === id && f.status === 'transferring' ? { ...f, status: 'failed' } : f));
      };

      dc.bufferedAmountLowThreshold = PROTOCOL_CONFIG.BUFFER_THRESHOLD / 2;
      sendNext();
    } catch (e) {
      console.error("File upload init error:", e);
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'failed' } : f));
      showToast("文件发送异常", "error");
      abortControllerRef.current = null;
    }
  };


  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden relative font-sans selection:bg-primary/30">
      {/* Dynamic Toast System */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className={`px-8 py-4 rounded-[2rem] glass shadow-3xl flex items-center gap-4 border-2 ${toast.type === 'error' ? 'border-red-500/30' :
            toast.type === 'warning' ? 'border-amber-500/30' : 'border-primary/30'
            }`}>
            <span className={`size-2.5 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
              toast.type === 'warning' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-primary shadow-[0_0_10px_#137fec]'
              }`}></span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Primary Header */}
      <header className="h-[60px] lg:h-20 shrink-0 flex items-center justify-between px-4 lg:px-10 z-[100] relative border-b border-white/5 bg-background/50 backdrop-blur-3xl">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="size-10 lg:size-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-inner">
            <span className="material-symbols-outlined text-xl lg:text-3xl fill-1">verified_user</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] lg:text-[11px] font-black tracking-[0.3em] text-gray-500 uppercase">安全加密频道</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] font-mono text-gray-600">v1.2</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`size-2 rounded-full ${connectionStatus === 'connected' ? 'bg-accent shadow-[0_0_12px_#22c55e]' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className="text-[10px] lg:text-[12px] font-black text-white uppercase tracking-widest selection:bg-primary/30">
                {connectionStatus === 'connected' ? '零信任加密连通' :
                  connectionStatus === 'preparing' ? '正在建立端对端隧道...' :
                    connectionStatus === 'ready' ? '握手就绪' :
                      connectionStatus === 'room-full' ? '节点配额已满' :
                        connectionStatus === 'media-error' ? '媒体接口锁定' : '等待信号同步...'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleManualExit}
          className="h-10 lg:h-12 px-6 lg:px-8 rounded-2xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-red-500/20"
        >
          销毁会话
        </button>
      </header>

      <main className="flex-1 relative overflow-hidden bg-black">
        {connectionStatus === 'security-error' || connectionStatus === 'media-error' || connectionStatus === 'room-full' ? (
          <div className="absolute inset-0 z-[400] bg-background flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="size-32 rounded-[2.5rem] bg-surface border border-white/10 flex items-center justify-center mb-8 shadow-3xl text-primary">
              <span className="material-symbols-outlined text-7xl">
                {connectionStatus === 'media-error' ? 'videocam_off' :
                  connectionStatus === 'security-error' ? 'gpp_maybe' : 'group_off'}
              </span>
            </div>
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
              {connectionStatus === 'media-error' ? '媒体接口锁定' :
                connectionStatus === 'security-error' ? '不安全的环境' : '房间配额已满'}
            </h3>
            <p className="text-gray-500 max-w-sm font-medium leading-relaxed mb-10">
              {connectionStatus === 'security-error' ? 'Web Crypto 需要 HTTPS 或 Localhost 安全上下文才能运行。请检查您的 URL。' :
                connectionStatus === 'media-error' ? '检测到硬件资源冲突、权限被拒绝或设备不可用，请检查浏览器权限设置。' :
                  '当前房间已有两人在进行主权通话，请开启新房间。'}
            </p>
            <button onClick={onExit} className="px-12 h-16 rounded-[2rem] bg-white text-black font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">返回大厅</button>
          </div>
        ) : connectionStatus !== 'connected' ? (
          <div className="absolute inset-0 z-[400] bg-background flex flex-col items-center justify-center p-12 space-y-12 animate-in fade-in duration-1000">
            <div className="relative">
              <div className="size-40 rounded-full border-[6px] border-primary/20 border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-primary animate-pulse fill-1">shield_with_heart</span>
              </div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tight italic">
                {role === 'initiator' ? '等待对方接入隧道...' : '正在验证端侧公钥...'}
              </h3>
              <p className="text-gray-500 text-[10px] lg:text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                End-to-End Handshake In Progress
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 z-0">
              {remoteParticipant ? (
                <VideoCard participant={remoteParticipant} filter={isRemoteHidden ? PrivacyFilter.BLACK : PrivacyFilter.NONE} isLarge />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-8 opacity-20 bg-surface">
                  <div className="size-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-white">同步加密链路...</p>
                </div>
              )}
            </div>

            {/* Floating Local Preview Overlay - Ultra Size (Bottom Left floating) */}
            {showLocalPreview && localParticipant && (
              <div className="absolute bottom-40 lg:bottom-[10.5rem] left-4 lg:left-8 w-48 sm:w-64 md:w-80 lg:w-96 aspect-video z-50 rounded-2xl lg:rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] border-2 border-primary/20 backdrop-blur-xl transition-all hover:scale-[1.05] animate-in zoom-in-95 slide-in-from-bottom-20 duration-1000">
                <VideoCard participant={localParticipant} filter={currentFilter} />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none"></div>
              </div>
            )}
          </div>
        )}

        {/* Cinematic Chat & File Sidebar - Epic Overlay Logic */}
        <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] lg:w-[480px] glass transform transition-all duration-700 ease-out z-[300] flex flex-col shadow-[-40px_0_100px_rgba(0,0,0,0.6)] ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-20 flex items-center justify-between px-phi-lg border-b border-white/10 bg-black shrink-0">
            <div className="flex items-center gap-phi-md">
              <div className="size-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_15px_var(--color-accent)]"></div>
              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/90">安全加密隧道</h3>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="size-12 rounded-2xl hover:bg-white/5 flex items-center justify-center text-gray-400 active:scale-90 transition-all">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-[#040608]/90 backdrop-blur-3xl flex flex-col relative">
            <ChatBox messages={messages} onSend={sendMessage} onUpload={handleFileUpload} userName={config.userName} isChatOpen={isChatOpen} />
          </div>
        </div>

        {/* Global Control Navigation - Intelligent Positioning with Sentient Kinetics */}
        {connectionStatus === 'connected' && (
          <div
            style={isChatOpen ? { transform: `translateX(calc(-50% - ${window.innerWidth >= 1024 ? '240px' : '200px'}))` } : { transform: 'translateX(-50%)' }}
            className={`fixed bottom-phi-lg lg:bottom-phi-xl left-1/2 flex items-center p-phi-xs lg:p-phi-sm glass rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/10 transition-all duration-700 z-[500] 
              ${isChatOpen ? 'opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto scale-90 lg:scale-100' : 'animate-sentient-in'}
              max-w-[calc(100vw-1rem)] md:max-w-none`}
          >
            <div className="flex items-center gap-1 xl:gap-phi-md px-1 lg:px-phi-md overflow-x-auto no-scrollbar scroll-smooth">
              <ControlBtn icon={isMuted ? 'mic_off' : 'mic'} active={!isMuted} onClick={() => setIsMuted(!isMuted)} danger={isMuted} label="麦克风" />
              <ControlBtn icon="blur_on" active={currentFilter === PrivacyFilter.MOSAIC} onClick={() => setCurrentFilter(prev => prev === PrivacyFilter.MOSAIC ? PrivacyFilter.NONE : PrivacyFilter.MOSAIC)} label="马赛克" />
              <ControlBtn icon={currentFilter === PrivacyFilter.BLACK ? 'visibility_off' : 'videocam'} active={currentFilter !== PrivacyFilter.BLACK} onClick={() => setCurrentFilter(prev => prev === PrivacyFilter.BLACK ? PrivacyFilter.NONE : PrivacyFilter.BLACK)} danger={currentFilter === PrivacyFilter.BLACK} label="屏蔽" />
              <ControlBtn icon={showLocalPreview ? 'picture_in_picture' : 'picture_in_picture_alt'} active={showLocalPreview} onClick={() => setShowLocalPreview(!showLocalPreview)} label="预览" />
            </div>
            <div className="w-px h-8 lg:h-12 bg-white/15 mx-0.5 lg:mx-phi-sm shrink-0"></div>
            <div className="flex items-center gap-1 xl:gap-phi-md px-1 lg:px-phi-md">
              <ControlBtn icon={isRemoteMuted ? 'volume_off' : 'volume_up'} active={!isRemoteMuted} onClick={() => setIsRemoteMuted(!isRemoteMuted)} danger={isRemoteMuted} label="监听" />
              <ControlBtn icon={isRemoteHidden ? 'hide_image' : 'person'} active={!isRemoteHidden} onClick={() => setIsRemoteHidden(!isRemoteHidden)} danger={isRemoteHidden} label="视线" />
            </div>
            <div className="w-px h-8 lg:h-12 bg-white/15 mx-0.5 lg:mx-phi-sm shrink-0"></div>
            <div className="px-1 lg:px-phi-md">
              <ControlBtn icon="forum" active={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} label="消息" badge={messages.filter(m => m.senderId !== 'local').length > 0} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const ControlBtn = ({ icon, active, onClick, danger, label, badge, className = '' }: { icon: string; active: boolean; onClick: () => void; danger?: boolean; label: string; badge?: boolean, className?: string }) => (
  <div className={`flex flex-col items-center gap-1.5 lg:gap-2 group shrink-0 ${className}`}>
    <button
      onClick={onClick}
      className={`relative size-9 lg:size-16 rounded-full flex items-center justify-center transition-all border ${active ? 'bg-primary/10 border-primary/30 text-primary' : (danger ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:text-white')} hover:scale-110 active:scale-90 shadow-xl`}
    >
      <span className="material-symbols-outlined text-[16px] lg:text-[28px] transition-transform duration-300">{icon}</span>
      {badge && <span className="absolute top-0.5 right-0.5 size-2.5 bg-red-500 rounded-full border-2 border-background animate-bounce shadow-[0_0_8px_#ef4444]"></span>}
    </button>
    <span className="text-[7px] lg:text-[9px] font-black uppercase text-gray-500 hidden lg:block tracking-widest">{label}</span>
  </div>
);

const ChatBox = ({ messages, onSend, onUpload, userName, isChatOpen }: { messages: ChatMessage[]; onSend: (t: string) => void; onUpload: (f: File) => void; userName: string, isChatOpen: boolean }) => {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && isChatOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);
  const handleMessageSubmit = (e: React.FormEvent) => { e.preventDefault(); if (text.trim()) { onSend(text); setText(''); } };

  return (
    <div className="flex flex-col h-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-4 lg:space-y-6 pb-32 lg:pb-40 custom-scrollbar overscroll-contain">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20 lg:py-24 grayscale">
            <div className="size-16 lg:size-20 rounded-full bg-surface border border-white/10 flex items-center justify-center mb-4 lg:mb-6">
              <span className="material-symbols-outlined text-3xl lg:text-4xl">vpn_lock</span>
            </div>
            <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em]">端对端隧道就绪</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.senderId === 'local' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className="flex items-center gap-3 mb-2 px-2">
              <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider transition-colors hover:text-primary">{m.senderName}</span>
              <span className="text-[9px] font-mono text-gray-800">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={`rounded-3xl max-w-[90%] overflow-hidden shadow-2xl transition-all hover:scale-[1.01] ${m.senderId === 'local' ? 'bg-primary text-white rounded-tr-none' : 'bg-surface border border-white/10 text-gray-200 rounded-tl-none'}`}>
              {m.type === 'text' && <p className="px-6 py-4 text-sm leading-relaxed break-words font-medium">{m.text}</p>}
              {m.blobUrl && (
                <div className="relative group min-w-[240px]">
                  {m.type === 'image' ? <img src={m.blobUrl} className="w-full h-auto max-h-[500px] object-cover" /> : (
                    <div className="p-6 flex items-center gap-5 bg-black/20">
                      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <span className="material-symbols-outlined text-2xl">insert_drive_file</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate text-white uppercase tracking-tight">{m.fileName}</span>
                        <span className="text-[10px] opacity-40 uppercase tracking-[0.2em] font-black">加密二进制流</span>
                      </div>
                    </div>
                  )}
                  <a href={m.blobUrl} download={m.fileName} className="absolute inset-0 bg-primary/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="size-14 bg-white text-black rounded-3xl flex items-center justify-center shadow-3xl transform -translate-y-4 group-hover:translate-y-0 transition-transform">
                      <span className="material-symbols-outlined text-2xl">download</span>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-phi-md lg:p-phi-xl bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-xl pb-[calc(1.618rem+env(safe-area-inset-bottom))] lg:translate-z-0">
        <form onSubmit={handleMessageSubmit} className="flex gap-phi-sm items-center max-w-4xl mx-auto">
          <label className="shrink-0 size-12 lg:size-14 bg-white/5 border border-white/10 text-gray-400 rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 hover:bg-white/10 hover:border-white/20 transition-all">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
            <span className="material-symbols-outlined text-xl lg:text-2xl">add</span>
          </label>
          <div className="flex-1 relative">
            <input
              className="w-full h-12 lg:h-14 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl px-4 lg:px-6 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-600 font-medium"
              placeholder="发送加密信息..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 300)}
            />
          </div>
          <button type="submit" disabled={!text.trim()} className="shrink-0 size-12 lg:size-14 bg-primary text-white rounded-xl lg:rounded-2xl flex items-center justify-center disabled:opacity-20 active:scale-95 shadow-[0_10px_20px_-5px_rgba(19,127,236,0.4)] transition-all">
            <span className="material-symbols-outlined text-xl lg:text-2xl fill-1">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Room;
