import io, { Socket } from "socket.io-client";
import { EventsMap } from "./foundry-types";
import { asyncEmit } from "./socket-io-helpers";

export type FoundrySocket = Socket<EventsMap, EventsMap>;

export function connectToFoundry(
  url: URL,
  sessionId: string,
  keepAlive = false
) {
  return new Promise<FoundrySocket>((ful, rej) => {
    const socketIoUrl = new URL("./socket.io", url);
    const socket = io(socketIoUrl.origin, {
      upgrade: false,
      path: socketIoUrl.pathname,
      reconnection: keepAlive,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      reconnectionDelayMax: 5000,
      transports: ["websocket"],
      extraHeaders: {
        cookie: `session=${sessionId}`,
      },
      query: { session: sessionId },
    });

    socket.on("connect", async () => {
      ful(socket);
    });
    socket.on("connect_error", (e) => rej(e));
    // socket.onAny((name, ...args) => console.log("RECV", name));
  });
}

export async function authenticateFoundry(
  url: URL,
  username: string,
  password: string
) {
  const joinUrl = new URL("./join", url);
  const getJoin = await fetch(joinUrl);
  const sessionId = getJoin.headers
    .get("set-cookie")
    ?.match(/session=(.+?);/)?.[1];

  if (!sessionId) {
    throw new Error("session id not found");
  }

  const socket = await connectToFoundry(url, sessionId);
  const joinData = await asyncEmit(socket, "getJoinData");
  socket.disconnect();

  const userid = joinData.users.find((x) => x.name === username)?._id;

  if (!userid) {
    throw new Error("user not found");
  }

  const postJoin = await fetch(joinUrl, {
    method: "post",
    headers: {
      "content-type": "application/json",
      cookie: `session=${sessionId}`,
    },
    body: JSON.stringify({
      action: "join",
      adminKey: "",
      password,
      userid,
    }),
  });
  const postJoinResult = await postJoin.json();
  if (postJoinResult.status !== "success") throw "err";
  return sessionId;
}
