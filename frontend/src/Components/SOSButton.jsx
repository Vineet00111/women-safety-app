import { AlertCircle, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const COUNTDOWN_SECONDS = 6;

const SOSButton = ({ onSOSStarted, onSOSConfirmed, onSOSCancelled }) => {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isStarting, setIsStarting] = useState(false);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (!isCountingDown) return undefined;

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isCountingDown]);

  useEffect(() => {
    if (!isCountingDown || countdown !== 0 || isCancelledRef.current) {
      return;
    }

    setIsCountingDown(false);
    setCountdown(COUNTDOWN_SECONDS);
    onSOSConfirmed?.();
  }, [countdown, isCountingDown, onSOSConfirmed]);

  const resetCountdown = () => {
    setIsCountingDown(false);
    setCountdown(COUNTDOWN_SECONDS);
  };

  const cancelSOS = () => {
    isCancelledRef.current = true;
    resetCountdown();
    onSOSCancelled?.();
  };

  const startSOSFlow = async () => {
    if (isStarting || isCountingDown) return;

    isCancelledRef.current = false;
    setIsStarting(true);

    try {
      await onSOSStarted?.();
      setCountdown(COUNTDOWN_SECONDS);
      setIsCountingDown(true);
    } catch (error) {
      console.error("Failed to start SOS flow:", error);
      resetCountdown();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <button
        onClick={startSOSFlow}
        disabled={isStarting || isCountingDown}
        className="
          relative group
          w-44 h-44
          rounded-full
          bg-red-500
          text-white
          font-mono font-bold text-3xl
          transition-all duration-300
          hover:bg-red-600
          active:scale-90
          flex flex-col items-center justify-center gap-3
          shadow-[0_0_20px_rgba(239,68,68,0.4)]
          hover:shadow-[0_0_35px_rgba(239,68,68,0.6)]
          disabled:opacity-70
          z-10
        "
      >
        <div className="absolute inset-0 rounded-full border-4 border-red-300 border-double opacity-40 group-hover:opacity-60 transition-opacity" />
        <div className="absolute inset-0 rounded-full animate-ping border-2 border-red-400 opacity-20" />

        <AlertCircle className="w-10 h-10 animate-bounce" strokeWidth={2.5} />

        <span className="relative tracking-tighter">
          SOS
          <span className="absolute -inset-1 rounded-lg bg-red-400/20 blur-sm animate-pulse" />
        </span>
      </button>

      {isCountingDown && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <div className="absolute w-96 h-96 bg-red-600/10 rounded-full blur-[120px] animate-pulse" />

          <h2 className="text-white text-xl font-black tracking-[0.3em] mb-4 animate-pulse">
            EMERGENCY TRIGGERED
          </h2>

          <div className="relative flex items-center justify-center mb-16">
            <div className="absolute w-64 h-64 border-4 border-red-600/30 rounded-full animate-ping" />
            <div className="absolute w-48 h-48 border-2 border-red-600/50 rounded-full" />

            <div className="text-white text-[140px] font-black leading-none z-10 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">
              {countdown}
            </div>
          </div>

          <div className="text-center max-w-xs mb-12">
            <p className="text-gray-300 font-medium">
              SOS will be sent in {countdown} seconds unless you cancel.
            </p>
          </div>

          <button
            type="button"
            onClick={cancelSOS}
            className="relative z-10 flex items-center gap-3 bg-white text-black px-12 py-5 rounded-full font-bold text-xl hover:bg-gray-200 active:scale-95 transition-all shadow-2xl"
          >
            <XCircle className="w-7 h-7 text-red-600" />
            CANCEL SOS
          </button>
        </div>
      )}
    </>
  );
};

export default SOSButton;
