import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export type ScannerState = 'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable' | 'error';

interface Options {
  onDecode: (raw: string) => void;
}

/**
 * Real in-browser QR decoding: camera frames are grabbed into a canvas and
 * decoded with jsQR. Requires a secure context (HTTPS or localhost) and an
 * explicit user action before the permission prompt.
 */
export function useQrScanner({ onDecode }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodeRef = useRef(onDecode);
  decodeRef.current = onDecode;

  const [state, setState] = useState<ScannerState>('idle');
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [frames, setFrames] = useState(0);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.removeAttribute('src');
    }
    setState((s) => (s === 'scanning' ? 'idle' : s));
  }, []);

  useEffect(() => stop, [stop]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const w = Math.max(1, Math.round(video.videoWidth * scale));
      const h = Math.max(1, Math.round(video.videoHeight * scale));
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const image = ctx.getImageData(0, 0, w, h);
        let decoded = jsQR(image.data, w, h, { inversionAttempts: 'attemptBoth' });
        if (decoded?.data) {
          const raw = decoded.data;
          if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          decodeRef.current(raw);
          return;
        }
        decoded = null;
      }
      setFrames((f) => f + 1);
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, []);

  const start = useCallback(async () => {
    setErrorDetail('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      setErrorDetail('getUserMedia');
      return false;
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setState('unavailable');
      setErrorDetail('insecure-context');
      return false;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setState('error');
        return false;
      }
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      await video.play().catch(() => {});
      setState('scanning');
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(scanLoop);
      return true;
    } catch (err) {
      const name = (err as { name?: string })?.name ?? 'Error';
      setErrorDetail(name);
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      return false;
    }
  }, [scanLoop]);

  return { videoRef, state, errorDetail, frames, start, stop };
}
