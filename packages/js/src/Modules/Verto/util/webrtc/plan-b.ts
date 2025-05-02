import * as transform from 'sdp-transform';

export function unifiedToPlanB(unifiedSdp: string): string {
  const s = transform.parse(unifiedSdp);

  if (s.groups) {
    s.groups = s.groups.filter((g: any) => g.type.toUpperCase() !== 'BUNDLE');
  }
  delete (s as any).msidSemantic;

  const firstOfKind: Record<'audio' | 'video', any | undefined> = {
    audio: undefined,
    video: undefined,
  };
  const restOfKind: Record<'audio' | 'video', any[]> = { audio: [], video: [] };

  s.media.forEach((m) => {
    if (m.type === 'audio' || m.type === 'video') {
      if (!firstOfKind[m.type]) firstOfKind[m.type] = m;
      else restOfKind[m.type].push(m);
    }
  });

  const merge = <T extends Record<string, any>>(
    target: T[] = [],
    source: T[] = [],
    key: keyof T
  ) => {
    const byKey = new Map<unknown, T>();
    [...target, ...source].forEach((item) => byKey.set(item[key], item));
    return [...byKey.values()];
  };

  const collapse = (master: any, extras: any[]) => {
    if (!master) return;
    extras.forEach((sec) => {
      master.rtp = merge(master.rtp, sec.rtp, 'payload');
      master.fmtp = merge(master.fmtp, sec.fmtp, 'payload');
      master.rtcpFb = merge(master.rtcpFb, sec.rtcpFb, 'payload');
      master.payloads = Array.from(
        new Set(`${master.payloads} ${sec.payloads}`.trim().split(/\s+/))
      ).join(' ');
      master.ext = merge(master.ext, sec.ext, 'value');
      master.ssrcs = merge(master.ssrcs, sec.ssrcs, 'id');
      master.ssrcGroups = merge(master.ssrcGroups, sec.ssrcGroups, 'semantics');
    });
  };

  collapse(firstOfKind.audio, restOfKind.audio);
  collapse(firstOfKind.video, restOfKind.video);

  const stripMidExt = (m: any) => {
    if (m?.ext) {
      m.ext = m.ext.filter((e: any) => !/sdes:mid$/.test(e.uri));
    }
  };

  if (firstOfKind.audio) {
    firstOfKind.audio.mid = 'audio';
    stripMidExt(firstOfKind.audio);
  }
  if (firstOfKind.video) {
    firstOfKind.video.mid = 'video';
    stripMidExt(firstOfKind.video);
  }

  const rejectSection = (m: any) => {
    m.port = 0;
    m.payloads = '0';
    m.direction = 'inactive';
    stripMidExt(m);
    // clear ICE, DTLS, candidates – not strictly necessary but tidy
    delete m.iceUfrag;
    delete m.icePwd;
    delete m.fingerprint;
    m.candidates = [];
  };
  [...restOfKind.audio, ...restOfKind.video].forEach(rejectSection);

  return transform.write(s);
}