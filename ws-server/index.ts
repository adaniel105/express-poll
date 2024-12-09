import cors from 'cors';
import express from 'express';
import { Server, Socket } from 'socket.io';

//init state
type PollState = {
  question : string;
  options : {
    id : number,
    text : string,
    description : string,
    votes : string[];
  }[];
};

interface ClientToServerEvents{
  //event lamdas
  vote: (optionId : number) => void;
  askForStateUpdate : () => void; 
}

interface ServerToClientEvents{
  updateState : (state : PollState) => void;
}
interface InterServerEvents { }
interface SocketData{
  user : string;
}


const app = express();
app.use(cors({ origin: 'http://localhost:5173' })); 
const server = require('http').createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

//middleware to add authenticated user to the Socket instance.
io.use(addUserToSocketDataIfAuthenticated);


// client pass an auth token (in this simple case, just the username)
// to the server on initialize of the Socket.IO client in our frontend
async function addUserToSocketDataIfAuthenticated(socket: Socket, next: (err?: Error) => void) {
  const user = socket.handshake.auth.token;
  if (user) {
    try {
      socket.data = { ...socket.data, user: user };
    } catch (err) {}
  }
  next();
}

const poll: PollState = {
  question: "What are some commonly used interface protocols",
  options: [
    {
      id: 1,
      text: 'GraphQL',
      description: 'Query Language for APIs',
      votes: [],
    },
    {
      id: 2,
      text: 'gRPC',
      description: 'High perf. RPC framework',
      votes: [],
    },
    {
      id: 3,
      text: 'Websockets',
      description: 'Bi-directional Real Time connections',
      votes: [],
    },
  ],
};

io.on('connection', (socket) => {
  console.log('a user connected', socket.data.user);

    // the client will send an 'askForStateUpdate' request on mount
    // to get the initial state of the poll
  socket.on('askForStateUpdate', () => {
    console.log('client asked For State Update');
    socket.emit('updateState', poll);
  });

  socket.on('vote', (optionId: number) => {
    // If user has already voted, remove their vote.
    poll.options.forEach((option) => {
      option.votes = option.votes.filter((user) => user !== socket.data.user);
    });
    // And then add their vote to the new option.
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      return;
    }
    option.votes.push(socket.data.user);
        // Send the updated PollState back to all clients
    io.emit('updateState', poll);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(8000, () => {
  console.log('listening on *:8000');
});
