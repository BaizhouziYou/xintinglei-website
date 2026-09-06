const config = require('./config');
const { closeDatabase, migrateDatabase, recordStatus } = require('./database');
const { getMinecraftStatus } = require('./minecraft-status');

async function collectStatus() {
  try {
    const response = await getMinecraftStatus({
      address: config.minecraftAddress,
      port: config.minecraftPort,
      timeoutMs: config.pollTimeoutMs,
      enableSrv: config.enableSrv,
    });

    return {
      isOnline: true,
      playersOnline: response.playersOnline,
      latency: response.latency,
      playerSample: config.showPlayerNames ? response.playerSample : undefined,
    };
  } catch (error) {
    console.warn(`Minecraft status check failed: ${error.message}`);
    return { isOnline: false };
  }
}

async function main() {
  await migrateDatabase();
  const status = await collectStatus();
  await recordStatus(status);
  console.log(`Saved status: ${status.isOnline ? 'online' : 'offline'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
