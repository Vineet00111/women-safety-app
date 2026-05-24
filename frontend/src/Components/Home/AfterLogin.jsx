import React, { useContext, useEffect, useState } from 'react';
import SOSButton from '../SOSButton';
import { Plus, X, CircleX } from 'lucide-react';
import BottomNav from './BottomNav';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../../Context/AuthContext';
import api from '../../../API/CustomApi';
import { Config } from '../../../API/Config';
import Loader from './Loader';
import { uploadVideoSOS } from '../../../API/EmergencyApi'; 
import { toast } from "react-toastify"

const MAX_EMERGENCY_CONTACTS = 6;

function AfterLogin() {
  const [showAddContact, setShowAddContact] = useState(false);
  const { handleSubmit, register, reset } = useForm();
  const { user, setUser } = useContext(AuthContext);
  const [contactsdata, setContactsdata] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [MobileNo, setMobileNo] = useState([]);
  const [locationMethod, setLocationMethod] = useState(null);
  const [activeSOSContext, setActiveSOSContext] = useState(null);

  useEffect(() => {
    setContactsdata(Array.isArray(user?.contacts) ? user.contacts : []);
    setMobileNo(Array.isArray(user?.contacts) ? user.contacts : [])
  }, [user]);

  // --- LOCATION LOGIC ---
  const getIPBasedLocation = async () => {
    try {
      let response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('First IP API failed');
      const data = await response.json();
      return { latitude: data.latitude, longitude: data.longitude, method: 'ipapi' };
    } catch (error) {
      const resp = await fetch('https://ipwho.is/');
      const fallbackData = await resp.json();
      return { latitude: fallbackData.latitude, longitude: fallbackData.longitude, method: 'ipwhois' };
    }
  };

  const getLocation = async () => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
        });
        setLocationMethod('gps');
        return { latitude: position.coords.latitude, longitude: position.coords.longitude, method: 'gps' };
      } catch (err) { console.log('Falling back to IP'); }
    }
    const ipLoc = await getIPBasedLocation();
    setLocationMethod('ip');
    return ipLoc;
  };

  const recordSOSVideo = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera and microphone are not supported on this device");
    }

    if (typeof MediaRecorder === "undefined") {
      throw new Error("Video recording is not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    return new Promise((resolve, reject) => {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      const stopTracks = () => stream.getTracks().forEach((track) => track.stop());

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        stopTracks();
        reject(event.error || new Error("Video recording failed"));
      };

      mediaRecorder.onstop = () => {
        stopTracks();

        if (chunks.length === 0) {
          reject(new Error("No SOS video was recorded"));
          return;
        }

        resolve(new Blob(chunks, { type: mimeType }));
      };

      mediaRecorder.start();
      toast.info("Camera and microphone enabled. Recording 10-second SOS video...");
      setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }, 10000);
    });
  };

  const createSOSContext = async () => {
    const contactNumbers = MobileNo.map(contact => contact.MobileNo).filter(Boolean);
    if (contactNumbers.length === 0) throw new Error('Please add emergency contacts first');

    const location = await getLocation();
    return {
      contactNumbers,
      location: { latitude: location.latitude, longitude: location.longitude },
    };
  };

  const handleSOSStarted = async () => {
    setShowLoader(true);
    try {
      const sosContext = await createSOSContext();
      setActiveSOSContext(sosContext);
      toast.info("SOS will be sent after 6 seconds if you do not cancel.");
    } catch (error) {
      console.error('SOS Start Error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Location access was blocked. Please enable GPS to send an SOS alert.");
      } else {
        toast.error(error.message || "Could not start SOS");
      }
      throw error;
    } finally {
      setShowLoader(false);
    }
  };

  // --- SOS LOGIC ---
  const handleSOSConfirmed = async () => {
    setShowLoader(true);
    try {
      const sosContext = activeSOSContext || await createSOSContext();
      const locData = sosContext.location;
      const contactNumbers = sosContext.contactNumbers;

      const videoBlob = await recordSOSVideo();
      toast.info("Sending final SOS with map and video...");
      await uploadVideoSOS(user._id, locData, contactNumbers, videoBlob);
      toast.success("SOS sent successfully!");
      setActiveSOSContext(null);

    } catch (error) {
      console.error('SOS Error:', error);
      // Specific handling for permission issues
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Camera/Mic access was blocked. Please enable them in browser settings to use Video SOS.");
      } else {
        toast.error(error.message || "Emergency process failed");
      }
    } finally {
      setShowLoader(false);
    }
  };

  const handleSOSCancelled = async () => {
    setActiveSOSContext(null);
    toast.info("SOS cancelled. No alert was sent.");
  };

  // --- CONTACT MANAGEMENT ---
  const Submit = async (formData) => {
    setShowLoader(true);
    try {
      const contactData = new FormData();
      const photoFile = formData.photo?.[0];

      if (photoFile) {
        contactData.append('photo', photoFile);
      }
      contactData.append('name', formData.name);
      contactData.append('MobileNo', formData.MobileNo);
      contactData.append('userId', user._id);

      const { data: responseData } = await api.post(Config.ContactUrl, contactData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });

      if (responseData) {
        setUser((prev) => ({ ...prev, contacts: [...(prev.contacts || []), responseData.contact] }));
        setShowAddContact(false);
        reset();
        toast.success("Contact added successfully");
      }
    } catch (err) { 
      toast.error("Failed to add contact");
      console.error(err); 
    } finally { 
      setShowLoader(false); 
    }
  };

  const handleDelete = async (contactId) => {
    setShowLoader(true);
    try {
      await api.delete(Config.DELETECONTACTUrl, { params: { userId: user._id, contactId } });
      setUser(prev => ({ ...prev, contacts: prev.contacts.filter(c => c._id !== contactId) }));
      toast.success("Contact removed");
    } catch (err) { 
        toast.error("Delete failed");
    } finally { 
        setShowLoader(false); 
    }
  };

  return (
    <div className="w-full p-2 bg-slate-50 min-h-screen pb-20">
      {locationMethod && (
        <div className={`p-2 mb-2 text-center text-sm font-medium rounded-lg ${locationMethod === 'gps' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {locationMethod === 'gps' ? '✓ Precise GPS Active' : '⚠ Using Approximate Location'}
        </div>
      )}

      <div className="w-full h-[45vh] flex flex-col items-center justify-center">
        <SOSButton
          onSOSStarted={handleSOSStarted}
          onSOSConfirmed={handleSOSConfirmed}
          onSOSCancelled={handleSOSCancelled}
        />
        <p className="text-gray-500 text-sm mt-4 italic font-mono text-center">
          Press SOS to start a 6-second emergency countdown. Cancel within 6 seconds to stop the alert.
        </p>
      </div>

      <div className="w-full p-4">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-gray-900 text-xl font-bold">Emergency Contacts</h1>
            <span className="text-xs font-bold text-gray-400">{contactsdata.length}/{MAX_EMERGENCY_CONTACTS}</span>
        </div>
        
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          {contactsdata.map((contact, index) => (
            <div key={index} className="w-full md:w-[31%] p-4 rounded-xl bg-white shadow-sm border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img className="w-12 h-12 rounded-full object-cover border" src={contact.photo} alt="Contact" />
                <div>
                  <h2 className="text-gray-800 font-bold text-sm">{contact.name}</h2>
                  <h3 className="text-gray-500 text-xs">{contact.MobileNo}</h3>
                </div>
              </div>
              <button onClick={() => handleDelete(contact._id)} className="text-gray-300 hover:text-red-500 transition-colors">
                <CircleX className="h-5 w-5" />
              </button>
            </div>
          ))}

          {contactsdata.length < MAX_EMERGENCY_CONTACTS && (
            <button 
                onClick={() => setShowAddContact(true)}
                className="w-full md:w-[31%] h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-red-200 hover:text-red-400 transition-all"
            >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-bold">Add Contact</span>
            </button>
          )}
        </div>
      </div>

      {showLoader && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
            <Loader />
        </div>
      )}

      {showAddContact && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">New Contact</h2>
                <X onClick={() => setShowAddContact(false)} className="cursor-pointer text-gray-400 hover:text-gray-600" />
            </div>
            <form onSubmit={handleSubmit(Submit)} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">PROFILE PHOTO</label>
                  <input type="file" accept="image/*" {...register('photo')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-red-50 file:text-red-700" />
                </div>
                <input type="text" placeholder="Name" className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-red-100 outline-none" {...register('name', { required: true })} />
                <input type="text" placeholder="Mobile Number" className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-red-100 outline-none" {...register('MobileNo', { required: true })} />
                <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors">Save Guardian</button>
            </form>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

export default AfterLogin;
