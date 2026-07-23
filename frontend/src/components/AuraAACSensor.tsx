import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

type EmotionState = 'neutral' | 'distressed' | 'happy';

interface EmotionTile {
  label: string;
  icon: string;
}

const UI_STATES: Record<EmotionState, { pillBg: string; text: string; textColor: string; tiles: EmotionTile[] }> = {
  neutral: {
    pillBg: '#eff6ff',
    text: 'Neutral',
    textColor: '#3b82f6',
    tiles: [
      { label: 'Good', icon: 'ti-mood-smile' },
      { label: 'Talk', icon: 'ti-message-circle' },
      { label: 'Later', icon: 'ti-clock' },
    ],
  },
  distressed: {
    pillBg: '#fef2f2',
    text: 'Distressed',
    textColor: '#ef4444',
    tiles: [
      { label: 'Loud', icon: 'ti-volume-3' },
      { label: 'Quiet', icon: 'ti-door' },
      { label: 'Break', icon: 'ti-mood-pause' },
    ],
  },
  happy: {
    pillBg: '#ecfdf5',
    text: 'Happy',
    textColor: '#10b981',
    tiles: [
      { label: 'Play', icon: 'ti-ball-basketball' },
      { label: 'Friends', icon: 'ti-users' },
      { label: 'Music', icon: 'ti-music' },
    ],
  },
};

interface AuraAACSensorProps {
  onEmotionChange?: (emotion: EmotionState) => void;
}

export default function AuraAACSensor({ onEmotionChange }: AuraAACSensorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isSensing, setIsSensing] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>('neutral');
  const [liveProbs, setLiveProbs] = useState({ happy: 0, distressed: 0 });

  const pendingRef = useRef({ state: 'neutral' as EmotionState, duration: 0 });
  const confirmedRef = useRef<EmotionState>('neutral');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsSensing(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsSensing(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
    }
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setIsReady(true);
      startCamera();
    };
    loadModels();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!isSensing || !isReady) return;

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused) return;

      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      let rawState: EmotionState = 'neutral';
      let happyPct = 0;
      let distressedPct = 0;

      if (detections) {
        setHasFace(true);
        const { happy, sad, angry, fearful } = detections.expressions;
        happyPct = Math.round(happy * 100);
        distressedPct = Math.round(Math.max(sad, angry, fearful) * 100);

        setLiveProbs({ happy: happyPct, distressed: distressedPct });

        if (happy > 0.5) rawState = 'happy';
        else if (sad > 0.5 || angry > 0.5 || fearful > 0.5) rawState = 'distressed';
      } else {
        setHasFace(false);
        setLiveProbs({ happy: 0, distressed: 0 });
        rawState = 'neutral';
      }

      if (rawState === pendingRef.current.state) {
        pendingRef.current.duration += 300;
        if (pendingRef.current.duration >= 1000 && confirmedRef.current !== rawState) {
          confirmedRef.current = rawState;
          setCurrentEmotion(rawState);
          if (onEmotionChange) onEmotionChange(rawState);
        }
      } else {
        pendingRef.current = { state: rawState, duration: 0 };
      }
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSensing, isReady, onEmotionChange]);

  const ui = UI_STATES[currentEmotion];
  const dotColor = !isSensing ? '#d1d5db' : !hasFace ? '#ef4444' : '#10b981';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        height: '100%',
        gap: '16px',
        padding: '0 12px',
        background: 'transparent',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <video ref={videoRef} autoPlay muted playsInline width={320} height={240} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -10 }} />

      {/* Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: dotColor, transition: 'background 0.3s ease' }} />
          <span style={{ fontSize: '11px', color: ui.textColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {!isReady ? 'Loading...' : !isSensing ? 'Off' : !hasFace ? 'No face' : ui.text}
          </span>
        </div>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }} />

      {/* Emotion state indicators */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['neutral', 'distressed', 'happy'] as EmotionState[]).map((state) => (
          <div
            key={state}
            style={{
              fontSize: '10px',
              padding: '3px 6px',
              textTransform: 'capitalize',
              borderRadius: '6px',
              opacity: currentEmotion === state ? 1 : 0.4,
              fontWeight: currentEmotion === state ? 600 : 400,
              background: currentEmotion === state ? 'rgba(0,0,0,0.05)' : 'transparent',
              color: currentEmotion === state ? '#1f2937' : '#6b7280',
              transition: 'all 0.3s ease',
              userSelect: 'none',
            }}
          >
            {state}
          </div>
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }} />

      {/* Live probability bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '8px', color: '#6b7280', width: '18px' }}>HAP</span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#10b981', width: `${liveProbs.happy}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '8px', color: '#6b7280', width: '18px' }}>SAF</span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#ef4444', width: `${liveProbs.distressed}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)' }} />

      {/* Dynamic emotion tiles */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {ui.tiles.map((tile, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: ui.pillBg, borderRadius: '6px', padding: '4px 8px' }}>
            <span style={{ fontSize: '10px', color: ui.textColor, fontWeight: 500, whiteSpace: 'nowrap' }}>{tile.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
