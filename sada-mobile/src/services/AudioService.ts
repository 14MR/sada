import client from '../api/client';

// Import WebRTC - will work in native build, fail gracefully in Expo Go
let RTCPeerConnection: any;
let MediaStream: any;
let mediaDevices: any;
let RTCSessionDescription: any;
let InCallManager: any;
let isWebRTCAvailable = false;

try {
    const WebRTC = require('react-native-webrtc');
    RTCPeerConnection = WebRTC.RTCPeerConnection;
    MediaStream = WebRTC.MediaStream;
    mediaDevices = WebRTC.mediaDevices;
    RTCSessionDescription = WebRTC.RTCSessionDescription;

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
}

export interface AudioState {
    isConnected: boolean;
    isMuted: boolean;
    isSpeaking: boolean;
}

/**
 * AudioServiceImpl - Cloudflare Calls SFU client
 *
 * Architecture:
 *   - Each client creates a single RTCPeerConnection to the Cloudflare SFU
 *   - Local audio is published upstream to the SFU
 *   - Remote audio from all other participants arrives via ontrack on the same PC
 *   - The backend mediates all Cloudflare API calls (offer/answer exchange)
 *
 * Flow:
 *   1. Host creates room → backend creates Cloudflare Calls session
 *   2. Client calls joinRoom() → init mic → create offer → send to backend
 *   3. Backend forwards offer to Cloudflare → returns answer + trackId
 *   4. Client sets remote description → audio flows through SFU
 *   5. Remote tracks arrive via ontrack (one per participant)
 */
class AudioServiceImpl {
    private localStream: any = null;
    private peerConnection: any = null;
    private roomId: string | null = null;
    private sessionId: string | null = null;
    private trackId: string | null = null;
    private mid: string | null = null;
    private isInitializing = false;
    private remoteStreams: Map<string, any> = new Map(); // mid → MediaStream

    /**
     * Request microphone permission and capture the local audio stream.
     * Call this before joining a room (e.g. on app launch or room entry).
     */
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
                    autoGainControl: true,
                },
                video: false,
            });
            this.localStream = stream;
            console.log('✅ Microphone access granted! Stream:', stream.id);
        } catch (e) {
            console.error('❌ Failed to get microphone access:', e);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Join an audio room via the Cloudflare Calls SFU.
     *
     * 1. Start InCallManager for audio session management
     * 2. Look up or create the SFU session for the room
     * 3. Create RTCPeerConnection with local audio track
     * 4. Create offer SDP → send to backend → backend proxies to Cloudflare
     * 5. Set remote answer SDP → media flows
     */
    async joinRoom(roomId: string, role: 'host' | 'speaker' | 'listener' = 'listener'): Promise<boolean> {
        if (!isWebRTCAvailable) {
            console.log('⚠️ Cannot join audio room - WebRTC not available');
            return false;
        }

        this.roomId = roomId;
        console.log('📞 Joining SFU Audio Room:', roomId);

        // Standard WebRTC Voice settings
        if (InCallManager) {
            InCallManager.start({ media: 'audio' });
            InCallManager.setForceSpeakerphoneOn(true);
            InCallManager.setKeepScreenOn(true);
            InCallManager.setSpeakerphoneOn(true);
        }

        try {
            // ─── Step 1: Get or create SFU session ─────────────────────────
            let sessionId: string | null = null;

            // Check if session already exists
            const lookupResp = await client.get(`/audio/sessions/room/${roomId}`);
            if (lookupResp.data?.sessionId) {
                sessionId = lookupResp.data.sessionId;
                console.log('📡 Found existing SFU session:', sessionId);
            } else {
                // Create new session
                const createResp = await client.post('/audio/sessions', { roomId });
                sessionId = createResp.data.sessionId;
                console.log('📡 Created new SFU session:', sessionId);
            }

            this.sessionId = sessionId;

            // ─── Step 2: Create PeerConnection + add local audio ────────────
            // Close any existing PC before creating a new one
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            const pc = new RTCPeerConnection({
                iceServers: [], // SFU handles ICE internally
            });
            this.peerConnection = pc;

            // Ensure local stream and add audio track
            if (!this.localStream) {
                await this.init();
            }

            if (this.localStream) {
                this.localStream.getAudioTracks().forEach((track: any) => {
                    track.enabled = true;
                    pc.addTrack(track, this.localStream);
                    console.log(`🎙️ Added local audio track ${track.id} to PeerConnection`);
                });
            }

            // Handle remote tracks from the SFU (other participants)
            pc.ontrack = (event: any) => {
                const stream = event.streams[0];
                const trackMid = event.transceiver?.mid || `remote_${Date.now()}`;
                console.log(`🔊 Received remote track from SFU. MID: ${trackMid}, Stream: ${stream?.id}`);

                if (stream) {
                    this.remoteStreams.set(trackMid, stream);
                }
            };

            pc.onconnectionstatechange = () => {
                console.log(`🔌 SFU Connection State: ${pc.connectionState}`);
            };

            pc.oniceconnectionstatechange = () => {
                console.log(`❄️ SFU ICE Connection State: ${pc.iceConnectionState}`);
            };

            // ─── Step 3: Create offer SDP → backend → Cloudflare ────────────
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
            });
            await pc.setLocalDescription(offer);

            console.log('📤 Sending offer SDP to backend for SFU negotiation...');

            const joinResp = await client.post(`/audio/sessions/${sessionId}/join`, {
                offerSdp: offer.sdp,
                role,
            });

            // ─── Step 4: Set remote answer SDP from Cloudflare ──────────────
            const { answerSdp, answerType, trackId, mid } = joinResp.data;
            this.trackId = trackId;
            this.mid = mid;

            await pc.setRemoteDescription(
                new RTCSessionDescription({
                    sdp: answerSdp,
                    type: answerType || 'answer',
                })
            );

            console.log('✅ SFU PeerConnection established. Track ID:', trackId, 'MID:', mid);
            return true;
        } catch (e) {
            console.error('❌ Failed to join SFU audio room:', e);
            // Cleanup on failure
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            this.sessionId = null;
            this.trackId = null;
            this.mid = null;
            return false;
        }
    }

    /**
     * Toggle local microphone mute/unmute.
     * With SFU, muting is simply enabling/disabling the local audio track.
     * The SFU will stop forwarding the audio to other participants automatically.
     */
    async toggleMute(): Promise<boolean> {
        if (this.localStream) {
            const tracks = this.localStream.getAudioTracks();
            if (tracks.length > 0) {
                const newState = !tracks[0].enabled;
                tracks.forEach((track: any) => {
                    track.enabled = newState;
                    console.log(`🎙️ Microphone ${newState ? 'unmuted' : 'muted'}`);
                });

                // Notify backend of mute state change (for participant list UI)
                if (this.sessionId) {
                    try {
                        await client.post(`/audio/sessions/${this.sessionId}/mute`, {
                            muted: !newState,
                        });
                    } catch (e) {
                        console.warn('⚠️ Failed to notify backend of mute state:', e);
                    }
                }

                return newState;
            }
        }
        return false;
    }

    /**
     * Leave the audio room.
     * Closes the PeerConnection and notifies the backend to clean up.
     */
    async leaveRoom() {
        console.log('👋 Leaving SFU Audio Room');

        // Close PeerConnection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Clear remote streams
        this.remoteStreams.clear();

        // Notify backend
        if (this.sessionId) {
            try {
                await client.post(`/audio/sessions/${this.sessionId}/leave`);
            } catch (e) {
                console.warn('⚠️ Failed to notify backend of leave:', e);
            }
        }

        // Stop InCallManager
        if (InCallManager) {
            InCallManager.stop();
        }

        this.roomId = null;
        this.sessionId = null;
        this.trackId = null;
        this.mid = null;
    }

    /**
     * Renegotiate the PeerConnection (e.g. for ICE restart).
     * Creates a new offer and sends it through the backend to Cloudflare.
     */
    async renegotiate(): Promise<boolean> {
        if (!this.peerConnection || !this.sessionId) {
            console.warn('⚠️ Cannot renegotiate - no active connection');
            return false;
        }

        try {
            const offer = await this.peerConnection.createOffer({
                iceRestart: true,
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
            });
            await this.peerConnection.setLocalDescription(offer);

            const resp = await client.post(`/audio/sessions/${this.sessionId}/renegotiate`, {
                offerSdp: offer.sdp,
            });

            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription({
                    sdp: resp.data.answerSdp,
                    type: resp.data.answerType || 'answer',
                })
            );

            console.log('🔄 Renegotiation complete');
            return true;
        } catch (e) {
            console.error('❌ Renegotiation failed:', e);
            return false;
        }
    }

    /**
     * Get the current connection state.
     */
    getConnectionState(): string | null {
        return this.peerConnection?.connectionState ?? null;
    }

    /**
     * Get the number of remote streams (other participants we're receiving).
     */
    getRemoteStreamCount(): number {
        return this.remoteStreams.size;
    }

    /**
     * Check if currently connected to an SFU session.
     */
    isConnected(): boolean {
        return this.peerConnection?.connectionState === 'connected';
    }
}

export const AudioService = new AudioServiceImpl();
