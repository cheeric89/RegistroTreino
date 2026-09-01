export const waitForVideoElement = async (getVideo, options = {}) => {
  const timeoutMs = Math.max(300, Number(options.timeoutMs) || 2500);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const video = getVideo?.();
    if (video) return video;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  return null;
};

export const prepareCameraVideo = async (video, stream, options = {}) => {
  if (!video || !stream) return false;
  const timeoutMs = Math.max(500, Number(options.timeoutMs) || 3500);

  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("autoplay", "");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.srcObject = stream;

  const waitUntilReady = new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", finish);
      video.removeEventListener("canplay", finish);
      video.removeEventListener("playing", finish);
    };

    video.addEventListener("loadedmetadata", finish, { once: true });
    video.addEventListener("canplay", finish, { once: true });
    video.addEventListener("playing", finish, { once: true });

    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    }, timeoutMs);
  });

  try {
    await video.play();
  } catch (error) {
    console.warn("[Treino] Safari no inició el preview al primer intento:", error?.message || error);
  }

  await waitUntilReady;

  if (video.paused) {
    try {
      await video.play();
    } catch (error) {
      console.warn("[Treino] No se pudo reanudar el preview:", error?.message || error);
    }
  }

  return Boolean(video.videoWidth && video.videoHeight && !video.paused);
};
