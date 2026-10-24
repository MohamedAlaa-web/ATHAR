import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export type QrCameraState = 'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable' | 'error';

/**
 * Real QR decoding with jsQR. Unlike a 60 fps scan loop, frames are grabbed at
 * most four times per second, and the MediaStream is stopped the moment a code
 * is decoded or the sheet closes. The camera is never active outside this hook.
 */
export function useQrCamera({ onDecode }: { onDecode: (raw: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /* Increments on every stop/start so a permission prompt that resolves after
   * the user closed the sheet can never open the camera behind their back. */
  const attemptRef = useRef(0);
  const decodeRef = useRef(onDecode);
  decodeRef.current = onDecode;
  const [state, setState] = useState<QrCameraState>('idle');
  const [errorDetail, setErrorDetail] = useState('');
  const [frames, setFrames] = useState(0);

  const stop = useCallback(() => {
    attemptRef.current += 1;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.removeAttribute('src');
    }
    setState((current) => (current === 'scanning' || current === 'starting' ? 'idle' : current));
  }, []);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      const scale = Math.min(1, 640 / video.videoWidth);
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(video, 0, 0, width, height);
        const image = context.getImageData(0, 0, width, height);
        const decoded = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });
        if (decoded?.data) {
          stop();
          decodeRef.current(decoded.data);
          return;
        }
        setFrames((n) => n + 1);
      }
    }
    timerRef.current = window.setTimeout(tick, 260);
  }, [stop]);

  const start = useCallback(async (): Promise<boolean> => {
    setErrorDetail('');
    if (streamRef.current) return true;
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      setErrorDetail('getUserMedia');
      return false;
    }
    if (window.isSecureContext === false) {
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
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stop();
        setState('error');
        return false;
      }
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      await video.play().catch(() => {});
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      setState('scanning');
      timerRef.current = window.setTimeout(tick, 300);
      return true;
    } catch (error) {
      if (attempt !== attemptRef.current) return false;
      const name = (error as { name?: string }).name ?? 'Error';
      setErrorDetail(name);
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      return false;
    }
  }, [stop, tick]);

  return { videoRef, state, errorDetail, frames, start, stop };
}
