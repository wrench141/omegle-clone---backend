import express from "express";
import cors from "cors";
import User from "./routes/user.js";
import mongoose from "mongoose";
import { config } from "dotenv";
const app = express();
config({
  path: "./.env",
});
import httpserver from "http";
const server = httpserver.createServer(app);
import {Server as socketIO} from "socket.io";
import { decodeJwt, generateOTP } from "./utils/otpManager.js";
const io = new socketIO(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());
app.use(express.json());
app.use("/user", User);

export let sockets = [];
let paired_sockets = [];

const getRandUser = (sokcs, id) => {
  if (sokcs != null) {
    if (sokcs.length > 0) {
      let user = sokcs[Math.abs(Math.round(Math.random() * sokcs.length) - 1)];
      if (user?.id == id) {
        return getRandUser(id);
      } else {
        return user;
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
};


const genRandName = () => {
  const memeNames = [
    "Beluga",
    "Doge",
    "Philosoraptor",
    "Daily Struggle",
    "WTFJS",
  ];
  return memeNames[Math.abs(Math.round(Math.random() * memeNames.length) - 1)];
}

io.on("connection", async (socket) => {
  const token = socket.handshake.query.token;
  const status = await decodeJwt(token);
  if(status){  
    console.log(socket.id, "conncted");
    socket.emit("msg", "user connected");
    sockets.push(socket);

    //joining a room
    socket.on("join-room", () => {
      let sock_user = getRandUser(sockets, socket.id);
      if (sock_user == null) {
        socket.emit("room-ack", {
          code: 400,
          msg: "No users available at this moment",
        });
      } else {
        if (sockets.length <= 0) {
          socket.emit("room-ack", {
            code: 400,
            msg: "No users available at this moment",
          });
        } else {
          sockets.map((soc) => {
            console.log(soc.id, "before");
          });
          let socketIndex = sockets.indexOf(socket);
          let sockUserIndex = sockets.indexOf(sock_user);
          if (socketIndex !== -1) {
            sockets.splice(socketIndex, 1);
          }
          if (sockUserIndex !== -1) {
            sockets.splice(sockUserIndex, 1);
          }
          sockets.map((soc) => {
            console.log(soc.id, "after");
          });
          const roomId = generateOTP();
          paired_sockets.push([socket, sock_user, roomId]);

          socket.join(roomId);
          sock_user.join(roomId);

          socket.emit("name", { name: genRandName() });
          sock_user.emit("name", { name: genRandName() });

          io.to(roomId).emit("room-ack", {
            code: 200,
            msg: `Room established at ${roomId}, user1: ${socket.id}, user2: ${sock_user.id}`,
          });

          io.to(roomId).emit("room-id", {
            code: 200,
            msg: roomId,
          });

          socket.emit("room-ack", {
            code: 200,
            msg: `user found ${sock_user.id}, and your room id: ${roomId}`,
          });
        }
      }
    });

    //send message
    socket.on("room-msg", (data) => {
      io.to(data.id).emit("room-msg", {
        code: 200,
        msg: data.msg,
        sockId: socket.id
      });
    });

    //leave room || skip room
    socket.on("leave_room", () => {});

    socket.on("disconnect", () => {
      let socketIndex = sockets.indexOf(socket);
      if (socketIndex !== -1) {
        sockets.splice(socketIndex, 1);
      }

      let pairedSocketIndex = paired_sockets.findIndex((soc) =>
        soc.includes(socket)
      );
      if (pairedSocketIndex !== -1) {
        let pairedSocket = paired_sockets[pairedSocketIndex];
        let roomid = pairedSocket[2];
        let remainingSocket =
          pairedSocket[0] === socket ? pairedSocket[1] : pairedSocket[0];

        paired_sockets.splice(pairedSocketIndex, 1);

        sockets.push(remainingSocket);

        if (roomid) {
          io.to(roomid).emit("room-disconnect", {
            code: 400,
            msg: `user disconnected from room ${roomid}`,
          });
        }
      }
    });
  }else{
    socket.emit("room-ack", {
      code: 403,
      msg: "Your token expired, login",
    });
  }
})

mongoose.connect(process.env.DB).then(console.log("mongodb connected"));
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
