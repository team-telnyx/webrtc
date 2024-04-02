export function createAudioElement(src: string, loop = true) {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.src = src;
  audio.loop = loop;
  document.body.insertAdjacentElement("beforeend", audio);
  return audio;
}
