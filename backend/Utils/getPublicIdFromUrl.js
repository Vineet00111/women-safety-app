const getPublicIdFromUrl = (url) => {
    try {
      if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
        return null;
      }

      const urlParts = url.split('upload/');
      if (urlParts.length < 2) return null;
      
      const afterUpload = urlParts[1];
      
      const withoutVersion = afterUpload.split('/').slice(1).join('/');
      
      const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
      
      return publicId || null;
    } catch (error) {
      console.error("Error extracting public_id from URL:", error);
      return null;
    }
  };
  
  
  

  export default getPublicIdFromUrl
