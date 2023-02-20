// const { Server } = require("socket.io");
const Redis = require("redis");
const ws = require("ws");
const { v4: uuidv4 } = require("uuid");
const { parse, stringify, toJSON, fromJSON } = require("flatted");

let rooms = {};
const clients = {};

const wss = new ws.WebSocketServer({ port: 5002 });

const redisClient = Redis.createClient({
  legacyMode: true,
});
(async () => {
  await redisClient.connect();
})();

wss.on("connection", function connection(ws) {
  const user_id = uuidv4();
  clients[user_id] = ws;
  console.log(`${user_id} connected.`);

  ws.on("message", async function message(data) {
    let temp_msg = JSON.parse(data.toString());
    console.log("Received:", temp_msg);

    if (temp_msg["msgType"] === "join_msg") {
      redisClient.lPush(
        ["chat_history", JSON.stringify(ws)],
        function (err, reply) {
          redisClient.lRange("chat_history", 0, -1, function (err, reply) {
            let redis_socket = JSON.parse(reply[0]);
            console.log("redis_socket:", redis_socket);
            console.log("actual_socket:", ws);
          });
        }
      );
    } else if (temp_msg["msgType"] === "text_msg") {
      let client_keys = Object.keys(clients);
      client_keys.forEach((client_key) =>
        clients[client_key].send(JSON.stringify(temp_msg))
      );
    }
  });

  ws.on("close", function close() {
    console.log(`${user_id} disconnected.`);
    redisClient.flushAll();
  });
});
