import "dotenv-flow/config";
import {
  authenticateFoundry,
  connectToFoundry,
  FoundrySocket,
} from "./foundry-api";
import { asyncEmit } from "./socket-io-helpers";

async function actorUpdate(socket: FoundrySocket, _id: string, updates: any) {
  await asyncEmit(socket, "modifyDocument", {
    type: "Actor",
    action: "update",
    options: { diff: true, render: false },
    pack: null,
    updates: [{ ...updates, _id }],
  });
}

(async () => {
  const foundryUrl = new URL(process.env.FOUNDRY_URL! + "/");
  const foundryUsername = process.env.FOUNDRY_USERNAME!;
  const foundryPassword = process.env.FOUNDRY_PASSWORD!;

  const sessionId = await authenticateFoundry(
    foundryUrl,
    foundryUsername,
    foundryPassword
  );
  const socket = await connectToFoundry(foundryUrl, sessionId, true);

  const world = await asyncEmit(socket, "world");

  console.log(world.actors.filter((x) => x.name === "Chardyl"));

  // await actorUpdate(socket, "bssF7JhofKU7Df9y", { name: "New Name" });

  socket.close();
})();
