import React, { useState } from 'react';
import { updateHomeLocation } from '../../API/EmergencyApi';
import { MapPin, ShieldCheck, Loader2, LocateFixed } from 'lucide-react';
import { toast } from 'react-toastify';

const SafetyBanner = ({ user, refreshUser }) => {
  const [loading, setLoading] = useState(false);
  const [mobileNo, setMobileNo] = useState(user?.MobileNo || '');

  if (user?.isProfileComplete) return null;

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('Location permission was denied. Please allow GPS access.'));
            return;
          }

          reject(new Error('Unable to capture your current location.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });

  const handleSetHome = async () => {
    const sanitizedMobileNo = mobileNo.trim();

    if (!/^\d{10}$/.test(sanitizedMobileNo)) {
      toast.warn('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const location = await getCurrentLocation();
      await updateHomeLocation(location.longitude, location.latitude, sanitizedMobileNo);
      toast.success('Home location captured successfully!');

      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Could not save home location.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white p-4 md:p-5 shadow-md rounded-lg mx-2 my-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <MapPin className="w-8 h-8 shrink-0 text-white mt-1" />
          <div>
            <p className="font-bold text-lg">Safety Profile Incomplete!</p>
            <p className="text-sm opacity-90">
              Enter your mobile number and we will capture your home location directly from your device.
            </p>
            <p className="mt-1 text-xs opacity-80">
              Set this while you are at your current or permanent home address so nearby SOS alerts work correctly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 w-full lg:max-w-2xl">
          <input
            type="tel"
            value={mobileNo}
            onChange={(event) => setMobileNo(event.target.value)}
            placeholder="Mobile number"
            className="w-full rounded-full px-4 py-3 text-gray-900 placeholder:text-gray-500 outline-none"
            maxLength={10}
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={handleSetHome}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white text-red-600 px-6 py-3 rounded-full font-extrabold hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Capturing...</span>
              </>
            ) : (
              <>
                <LocateFixed className="w-5 h-5" />
                <ShieldCheck className="w-5 h-5" />
                <span>Capture Home Location</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyBanner;
