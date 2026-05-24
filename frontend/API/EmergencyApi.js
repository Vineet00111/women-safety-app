import api from './CustomApi';

// Step 1: Send immediate Location SMS
export const sendLocationSOS = async (userId, location, contactNumbers) => {
  try {
    const res = await api.post('/api/contacts/emergency', {
      userId,
      location,
      contactNumbers
    });
    return res.data;
  } catch (error) {
    console.error("Location SOS Error:", error);
    throw error;
  }
};

export const sendCancelledSOS = async (userId, location, contactNumbers) => {
  try {
    const res = await api.post('/api/contacts/emergency/cancel', {
      userId,
      location,
      contactNumbers
    });
    return res.data;
  } catch (error) {
    console.error("Cancel SOS Error:", error);
    throw error;
  }
};

// Step 2: Upload Video Evidence
export const uploadVideoSOS = async (userId, location, contactNumbers, videoBlob) => {
  try {
    const formData = new FormData();
    const fileName = videoBlob.type?.includes('webm') ? 'emergency_video.webm' : 'emergency_video.mp4';
    formData.append('video', videoBlob, fileName);
    formData.append('userId', userId);
    formData.append('location[latitude]', location.latitude);
    formData.append('location[longitude]', location.longitude);
    
    // Convert array to format backend can read if necessary, or send as string
    contactNumbers.forEach((num, index) => {
        formData.append(`contactNumbers[${index}]`, num);
    });

    const res = await api.post('/api/contacts/emergency/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.error("Video SOS Error:", error);
    throw error;
  }
};

// Step 3: Update Home Location (For the Safety Banner)
// EmergencyApi.js
// Ensure this matches the arguments being passed from SafetyBanner.jsx
// EmergencyApi.js
export const updateHomeLocation = async (longitude, latitude, phone) => {
  const response = await api.patch('/api/user/update-home', {
    longitude: Number(longitude),
    latitude: Number(latitude),
    MobileNo: String(phone).trim()
  });
  return response.data;
};
