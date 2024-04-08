export const sdpBitrateHack = (
  sdp: string,
  max: number,
  min: number,
  start: number
) => {
  const endOfLine = "\r\n";
  const lines = sdp.split(endOfLine);
  lines.forEach((line, i) => {
    if (/^a=fmtp:\d*/.test(line)) {
      lines[
        i
      ] += `;x-google-max-bitrate=${max};x-google-min-bitrate=${min};x-google-start-bitrate=${start}`;
    } else if (/^a=mid:(1|video)/.test(line)) {
      lines[i] += `\r\nb=AS:${max}`;
    }
  });
  return lines.join(endOfLine);
};

export const sdpBitrateASHack = (sdp: string, bandwidthKbps: number) => {
  let modifier = "AS";
  let bandwidth = bandwidthKbps;

  if (
    navigator.userAgent.match(/firefox/gim) &&
    !navigator.userAgent.match(/OPR\/[0-9]{2}/gi) &&
    !navigator.userAgent.match(/edg/gim)
  ) {
    const BITS_PER_KILOBITS = 1000;
    modifier = "TIAS";
    bandwidth = (bandwidthKbps >>> 0) * BITS_PER_KILOBITS;
  }

  if (sdp.indexOf("b=" + modifier + ":") === -1) {
    // insert b= after c= line.
    sdp = sdp.replace(
      /c=IN (.*)\r\n/,
      "c=IN $1\r\nb=" + modifier + ":" + bandwidth + "\r\n"
    );
  } else {
    sdp = sdp.replace(
      new RegExp("b=" + modifier + ":.*\r\n"),
      "b=" + modifier + ":" + bandwidth + "\r\n"
    );
  }

  return sdp;
};

export const sdpStereoHack = (sdp: string) => {
  const endOfLine = "\r\n";
  const sdpLines = sdp.split(endOfLine);

  const opusIndex = sdpLines.findIndex(
    (s) => /^a=rtpmap/.test(s) && /opus\/48000/.test(s)
  );
  if (opusIndex < 0) {
    return sdp;
  }

  const getCodecPayloadType = (line: string) => {
    const pattern = new RegExp("a=rtpmap:(\\d+) \\w+\\/\\d+");
    const result = line.match(pattern);
    return result && result.length == 2 ? result[1] : null;
  };
  const opusPayload = getCodecPayloadType(sdpLines[opusIndex]);

  const pattern = new RegExp(`a=fmtp:${opusPayload}`);
  const fmtpLineIndex = sdpLines.findIndex((s) => pattern.test(s));

  if (fmtpLineIndex >= 0) {
    if (!/stereo=1;/.test(sdpLines[fmtpLineIndex])) {
      // Append stereo=1 to fmtp line if not already present
      sdpLines[fmtpLineIndex] += "; stereo=1; sprop-stereo=1";
    }
  } else {
    // create an fmtp line
    sdpLines[
      opusIndex
    ] += `${endOfLine}a=fmtp:${opusPayload} stereo=1; sprop-stereo=1`;
  }

  return sdpLines.join(endOfLine);
};

export const findElementByType = (
  tag: HTMLMediaElement | string | Function
): HTMLMediaElement | null => {
  if (typeof document !== "object" || !("getElementById" in document)) {
    return null;
  }
  if (typeof tag === "string") {
    return <HTMLMediaElement>document.getElementById(tag) || null;
  } else if (typeof tag === "function") {
    return tag();
  } else if (tag instanceof HTMLMediaElement) {
    return tag;
  }
  return null;
};

export const attachMediaStream = (tag: any, stream?: MediaStream | null) => {
  if (stream == null) {
    return;
  }
  const element = findElementByType(tag);

  if (element === null) {
    return;
  }
  if (!element.getAttribute("autoplay")) {
    element.setAttribute("autoplay", "autoplay");
  }
  if (!element.getAttribute("playsinline")) {
    element.setAttribute("playsinline", "playsinline");
  }
  element.srcObject = stream;
};
