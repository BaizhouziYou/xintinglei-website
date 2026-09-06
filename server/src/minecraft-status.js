const dns = require('node:dns/promises');
const net = require('node:net');

const STATUS_PROTOCOL = -1;

async function getMinecraftStatus({ address, port, timeoutMs, enableSrv }) {
  const target = await resolveTarget({ address, port, enableSrv });
  const response = await requestStatus(target, timeoutMs);
  const parsed = JSON.parse(response.payload);

  return {
    playersOnline: Number.isInteger(parsed?.players?.online) ? parsed.players.online : 0,
    playerSample: Array.isArray(parsed?.players?.sample)
      ? parsed.players.sample.map((player) => player?.name).filter(Boolean)
      : [],
    latency: response.latency,
  };
}

async function resolveTarget({ address, port, enableSrv }) {
  if (!enableSrv) return { host: address, port };

  try {
    const records = await dns.resolveSrv(`_minecraft._tcp.${address}`);
    if (!records.length) return { host: address, port };
    records.sort((left, right) => left.priority - right.priority || right.weight - left.weight);
    return { host: records[0].name, port: records[0].port };
  } catch {
    return { host: address, port };
  }
}

function requestStatus(target, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(target.port, target.host);
    let received = Buffer.alloc(0);
    let statusPayload;
    let pingStartedAt;
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => finish(new Error('Minecraft status request timed out')), timeoutMs);

    socket.on('error', (error) => finish(error));
    socket.on('connect', () => {
      const handshake = Buffer.concat([
        encodeVarInt(0),
        encodeVarInt(STATUS_PROTOCOL),
        encodeString(target.host),
        encodeUnsignedShort(target.port),
        encodeVarInt(1),
      ]);
      socket.write(encodePacket(handshake));
      socket.write(encodePacket(encodeVarInt(0)));
    });
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      try {
        while (received.length) {
          const frameLength = decodeVarInt(received, 0);
          if (!frameLength || received.length < frameLength.size + frameLength.value) return;

          const packet = received.subarray(frameLength.size, frameLength.size + frameLength.value);
          received = received.subarray(frameLength.size + frameLength.value);
          const packetId = decodeVarInt(packet, 0);
          if (!packetId) throw new Error('Malformed Minecraft status packet');

          if (packetId.value === 0 && statusPayload === undefined) {
            const text = decodeString(packet, packetId.size);
            if (!text) throw new Error('Malformed Minecraft status response');
            statusPayload = text.value;
            pingStartedAt = performance.now();
            socket.write(encodePacket(Buffer.concat([encodeVarInt(1), Buffer.alloc(8)])));
          } else if (packetId.value === 1 && statusPayload !== undefined && pingStartedAt !== undefined) {
            finish(null, {
              payload: statusPayload,
              latency: Math.max(0, Math.round(performance.now() - pingStartedAt)),
            });
          } else {
            throw new Error('Unexpected Minecraft status packet');
          }
        }
      } catch (error) {
        finish(error);
      }
    });
  });
}

function encodePacket(payload) {
  return Buffer.concat([encodeVarInt(payload.length), payload]);
}

function encodeVarInt(value) {
  let remaining = value >>> 0;
  const bytes = [];
  do {
    let current = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining) current |= 0x80;
    bytes.push(current);
  } while (remaining);
  return Buffer.from(bytes);
}

function encodeString(value) {
  const text = Buffer.from(value, 'utf8');
  return Buffer.concat([encodeVarInt(text.length), text]);
}

function encodeUnsignedShort(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function decodeVarInt(buffer, start) {
  let value = 0;
  let shift = 0;
  for (let index = 0; index < 5; index += 1) {
    const offset = start + index;
    if (offset >= buffer.length) return null;
    const current = buffer[offset];
    value |= (current & 0x7f) << shift;
    if ((current & 0x80) === 0) return { value, size: index + 1 };
    shift += 7;
  }
  throw new Error('Minecraft VarInt is too large');
}

function decodeString(buffer, start) {
  const length = decodeVarInt(buffer, start);
  if (!length || buffer.length < start + length.size + length.value) return null;
  const textStart = start + length.size;
  return { value: buffer.subarray(textStart, textStart + length.value).toString('utf8') };
}

module.exports = { getMinecraftStatus };
