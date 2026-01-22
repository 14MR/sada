import client from '../api/client';

// Import WebRTC - will work in native build, fail gracefully in Expo Go
let RTCPeerConnection: any;
let MediaStream: any;
let mediaDevices: any;
let RTCSessionDescription: any;
let RTCIceCandidate: any;
let InCallManager: any;
let isWebRTCAvailable = false;

try {
    const WebRTC = require('react-native-webrtc');
    RTCPeerConnection = WebRTC.RTCPeerConnection;
    MediaStream = WebRTC.MediaStream;
    mediaDevices = WebRTC.mediaDevices;
    RTCSessionDescription = WebRTC.RTCSessionDescription;
    RTCIceCandidate = WebRTC.RTCIceCandidate;

    try {
        InCallManager = require('react-native-incall-manager').default;
    } catch (e) {
        console.log("⚠️ InCallManager not available.");
    }

    isWebRTCAvailable = true;
    console.log("✅ WebRTC & InCallManager loaded (Native)");
} catch (e) {
    console.log("⚠️ WebRTC not available (Expo Go). Audio features disabled.");

    // Simple mocks to prevent crashes
    RTCPeerConnection = class { };
    MediaStream = class { };
    mediaDevices = {
        getUserMedia: () => Promise.reject(new Error('WebRTC not available'))
    };
    RTCSessionDescription = class { };
    RTCIceCandidate = class { };
}

export interface AudioState {
    isConnected: boolean;
    isMuted: boolean;
    isSpeaking: boolean;
}

class AudioServiceImpl {
    private localStream: any = null;
    private peerConnections: Map<string, any> = new Map();
    private pendingConnections: Set<string> = new Set();
    private iceServers: any[] = [];
    private roomId: string | null = null;
    private isInitializing = false;

    async init() {
        if (!isWebRTCAvailable) {
            console.log('⚠️ Audio Init skipped - WebRTC not available');
            return;
        }

        if (this.isInitializing) return;
        this.isInitializing = true;

        try {
            if (this.localStream) {
                console.log('♻️ Microphone already active.');
                this.isInitializing = false;
                return;
            }

            console.log('🎙️ Requesting microphone permission...');
            const stream = await mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            this.localStream = stream;
            console.log('✅ Microphone access granted! Stream:', stream.id);
        } catch (e) {
            console.error('❌ Failed to get microphone access:', e);
        }
    }

    setIceServers(iceServers: any[]) {
        this.iceServers = iceServers;
        console.log('❄️ ICE Servers updated:', iceServers?.length || 0);
    }

    async joinRoom(roomId: string, socketService: any) {
        this.roomId = roomId;
        console.log('📞 Joining Audio Room:', roomId);

        // Standard WebRTC Voice settings
        if (InCallManager) {
            InCallManager.start({ media: 'audio' });
            InCallManager.setForceSpeakerphoneOn(true);
            InCallManager.setKeepScreenOn(true);
            InCallManager.setSpeakerphoneOn(true); // Extra force
        }

        // Ensure tracks are enabled
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((track: any) => {
                track.enabled = true;
                console.log(`🎙️ Track ${track.id} enabled for room.`);
            });
        }

        // Listen for signals from others
        socketService.onSignal(async (data: { senderId: string, signal: any }) => {
            const { senderId, signal } = data;
            const myId = socketService.socket?.id;

            // IGNORE OUR OWN SIGNALS (if backend reflects them)
            if (senderId === myId) return;

            if (signal.type === 'offer') {
                await this.handleOffer(senderId, signal, socketService);
            } else if (signal.type === 'answer') {
                await this.handleAnswer(senderId, signal);
            } else if (signal.type === 'candidate') {
                await this.handleCandidate(senderId, signal);
            } else if (signal.type === 'join' || signal.type === 'presence') {
                // Someone is here!
                if (!myId) return;

                if (myId > senderId) {
                    console.log(`🙋 Discovery (${signal.type}) from ${senderId}. I (${myId}) will initiate.`);
                    await this.createPeerConnection(senderId, socketService, true);
                } else {
                    console.log(`🙋 Discovery (${signal.type}) from ${senderId}. I (${myId}) will wait.`);
                    // If we just received a 'join', and we are the "waiter", 
                    // we MUST send a presence signal back so the newcomer knows we are here!
                    if (signal.type === 'join') {
                        socketService.sendSignal(this.roomId!, { type: 'presence' });
                    }
                }
            }
        });

        // Tell everyone we joined audio
        socketService.sendSignal(roomId, { type: 'join' });
    }

    private async createPeerConnection(peerId: string, socketService: any, isInitiator: boolean) {
        if (this.peerConnections.has(peerId) || this.pendingConnections.has(peerId)) {
            console.log(`♻️ Connection already active or pending for ${peerId}`);
            return this.peerConnections.get(peerId);
        }

        this.pendingConnections.add(peerId);

        try {
            console.log(`🤝 Creating PeerConnection for ${peerId} (Initiator: ${isInitiator})`);

            const pc = new RTCPeerConnection({
                iceServers: (this.iceServers && this.iceServers.length > 0)
                    ? this.iceServers
                    : [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            this.peerConnections.set(peerId, pc);
            this.pendingConnections.delete(peerId);

            pc.onconnectionstatechange = () => {
                console.log(`🔌 Connection State [${peerId}]: ${pc.connectionState}`);
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`❄️ ICE Connection State [${peerId}]: ${pc.iceConnectionState}`);
            };

            // Add local tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach((track: any) => {
                    try {
                        pc.addTrack(track, this.localStream);
                    } catch (e) {
                        console.error(`❌ Failed to add track to ${peerId}:`, e);
                    }
                });
            }

            // Handle ICE candidates
            pc.onicecandidate = (event: any) => {
                if (event.candidate && this.roomId) {
                    console.log(`❄️ Sending ICE Candidate to ${peerId}`);
                    socketService.sendSignal(this.roomId, {
                        type: 'candidate',
                        candidate: event.candidate,
                    });
                }
            };

            // Handle remote tracks
            pc.ontrack = (event: any) => {
                const stream = event.streams[0];
                console.log(`🔊 Received remote track from ${peerId}. Stream ID: ${stream?.id}`);
                // In a more complex app, we might attach this stream to a state-managed <RTCView> 
                // for visualizing who is speaking, but for audio-only native usually plays it.
            };

            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketService.sendSignal(this.roomId!, offer);
            }

            return pc;
        } catch (e) {
            console.error(`❌ Error creating PeerConnection for ${peerId}:`, e);
            this.pendingConnections.delete(peerId);
            throw e;
        }
    }

    private async handleOffer(peerId: string, offer: any, socketService: any) {
        try {
            const pc = await this.createPeerConnection(peerId, socketService, false);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketService.sendSignal(this.roomId!, answer);
        } catch (e) {
            console.error(`❌ Error handling offer from ${peerId}:`, e);
            this.pendingConnections.delete(peerId);
        }
    }

    private async handleAnswer(peerId: string, answer: any) {
        try {
            const pc = this.peerConnections.get(peerId);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (e) {
            console.error(`❌ Error handling answer from ${peerId}:`, e);
        }
    }

    private async handleCandidate(peerId: string, signal: any) {
        const pc = this.peerConnections.get(peerId);
        if (pc && signal.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
                console.error('❌ Failed to add ICE candidate:', e);
            }
        }
    }

    async toggleMute(): Promise<boolean> {
        if (this.localStream) {
            const tracks = this.localStream.getAudioTracks();
            if (tracks.length > 0) {
                tracks.forEach((track: any) => {
                    track.enabled = !track.enabled;
                    console.log(`🎙️ Microphone ${track.enabled ? 'unmuted' : 'muted'}`);
                });
                return tracks[0].enabled;
            }
        }
        return false;
    }

    leaveRoom() {
        console.log('👋 Leaving Audio Room');
        this.peerConnections.forEach((pc) => pc.close());
        this.peerConnections.clear();
        if (InCallManager) {
            InCallManager.stop();
        }
        this.roomId = null;
    }

    // New helper to handle listener tracking if needed
}

export const AudioService = new AudioServiceImpl();
