export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Enforce the byte budget before buffering an entire document request.
export async function readJsonBody(request, maxBytes = 100000) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'The request must contain valid JSON.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestError(413, 'Input is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes)); }
  catch { throw new RequestError(400, 'The request must contain valid JSON.'); }
}
