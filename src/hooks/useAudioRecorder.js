import { useState, useCallback, useRef } from 'react';
import audioRecorder from '../services/audioService';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isSupported] = useState(audioRecorder.isSupported);
  const urlsRef = useRef(new Set());

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      await audioRecorder.start();
      setIsRecording(true);
    } catch (e) {
      setError(e.message || 'Impossible d\'accéder au microphone');
      setIsRecording(false);
      throw e;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const result = await audioRecorder.stop();
      setIsRecording(false);
      if (result?.url) {
        urlsRef.current.add(result.url);
        setAudioUrl(result.url);
        return result;
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de l\'enregistrement');
      setIsRecording(false);
    }
    return null;
  }, []);

  const cleanup = useCallback(() => {
    for (const u of urlsRef.current) {
      audioRecorder.revokeUrl(u);
    }
    urlsRef.current.clear();
    audioRecorder.cleanup();
    setAudioUrl(null);
    setIsRecording(false);
  }, []);

  const checkPermission = useCallback(async () => {
    return audioRecorder.requestPermission();
  }, []);

  return { isRecording, audioUrl, error, isSupported, startRecording, stopRecording, cleanup, checkPermission };
}

export default useAudioRecorder;
