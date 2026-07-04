// Cloudinary lets the browser upload files directly (no backend, no
// Firebase Storage / Blaze plan needed). It's free with no credit card.
//
// SETUP (do this once, ~3 minutes):
// 1. Go to https://cloudinary.com/users/register/free and create a free account.
// 2. On your Cloudinary dashboard, copy your "Cloud name" (top of the page).
// 3. Go to Settings (gear icon) -> Upload -> scroll to "Upload presets" ->
//    click "Add upload preset".
// 4. Set "Signing Mode" to "Unsigned" (this is what allows direct browser
//    uploads with no server/API key exposed). Save, and copy the preset name.
// 5. Paste both values below.

const CLOUD_NAME = ixu7sdfu;
const UPLOAD_PRESET = Memory-univarse;

// resourceType: 'image' | 'video' (voice notes also use 'video' — Cloudinary
// treats all audio/video the same way under this endpoint).
export async function uploadToCloudinary(file, resourceType = 'auto') {
  if (CLOUD_NAME.startsWith('PASTE_') || UPLOAD_PRESET.startsWith('PASTE_')) {
    throw new Error('Cloudinary is not configured yet — see src/lib/cloudinaryClient.js for setup steps.');
  }
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed: ${body}`);
  }
  const data = await res.json();
  return data.secure_url;
}
