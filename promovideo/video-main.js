const video = document.querySelector('video');

video.addEventListener('fullscreenchange', () => {
  video.classList.toggle('is-fullscreen', !!document.fullscreenElement);
});

// Vendor-prefixed fallbacks
video.addEventListener('webkitfullscreenchange', () => {
  video.classList.toggle('is-fullscreen', !!document.webkitFullscreenElement);
});
