const assert = require('node:assert/strict');
const net = require('node:net');
const test = require('node:test');
const { getMinecraftStatus } = require('../src/minecraft-status');

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

function encodePacket(packetId, body = Buffer.alloc(0)) {
  const packet = Buffer.concat([encodeVarInt(packetId), body]);
  return Buffer.concat([encodeVarInt(packet.length), packet]);
}

function encodeStatusResponse(value) {
  const body = Buffer.from(value, 'utf8');
  return encodePacket(0, Buffer.concat([encodeVarInt(body.length), body]));
}

test('reads a standard Minecraft status response', async () => {
  const mockServer = net.createServer((socket) => {
    let statusSent = false;
    socket.on('data', () => {
      if (!statusSent) {
        statusSent = true;
        socket.write(encodeStatusResponse(JSON.stringify({
        players: { online: 3, sample: [{ name: 'Alex' }, { name: 'Steve' }] },
        })));
      } else {
        socket.write(encodePacket(1, Buffer.alloc(8)));
      }
    });
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
  const { port } = mockServer.address();

  try {
    const result = await getMinecraftStatus({
      address: '127.0.0.1',
      port,
      timeoutMs: 1_000,
      enableSrv: false,
    });
    assert.equal(result.playersOnline, 3);
    assert.deepEqual(result.playerSample, ['Alex', 'Steve']);
    assert.equal(Number.isInteger(result.latency), true);
  } finally {
    await new Promise((resolve) => mockServer.close(resolve));
  }
});
