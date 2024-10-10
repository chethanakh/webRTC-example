const fs = require('fs');
const https = require('https')
const express = require('express');
const socketIo = require('socket.io');
const app = express();
const PORT = 3000;
const HOST = "localhost";
app.use(express.static('public'))

const key = fs.readFileSync('./cert/cert.key');
const cert = fs.readFileSync('./cert/cert.crt');

const expressServer = https.createServer({ key, cert }, app);

const connectedSockets = []
const offers = []

const io = socketIo(expressServer, {
    cors: {
        origin: [
            "https://" + HOST + ":" + PORT,
        ],
        methods: ["GET", "POST"]
    }
});

expressServer.listen(PORT);


io.on('connection', (socket) => {
    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;

    // password check here
    if (password !== "xxx") {
        socket.disconnect(true);
        return;
    }
    connectedSockets[socket.id] = userName;
    console.log(userName + " connected to signal server");

    socket.on("disconnect", () => {
        delete connectedSockets[socket.id]
    });

    if(offers.length){
        socket.emit('availableOffers',offers);
    }

    socket.on('newOffer', newOffer => {
        offers.push({
            offererUserName: userName,
            offer: newOffer,
            offerIceCandidates: [],
            answererUserName: null,
            answer: null,
            answererIceCandidates: []
        })
        socket.broadcast.emit('newOfferAwaiting', offers.slice(-1))
    })

    socket.on('newAnswer', (offerObj, ackFunction) => {
        const socketToAnswer = connectedSockets.find(s => s.userName === offerObj.offererUserName)
        if (!socketToAnswer) {
            console.log("No matching socket")
            return;
        }
       
        const socketIdToAnswer = socketToAnswer.socketId;
     
        const offerToUpdate = offers.find(o => o.offererUserName === offerObj.offererUserName)
        if (!offerToUpdate) {
            console.log("No OfferToUpdate")
            return;
        }
        
        offerToUpdate.answer = offerObj.answer
        offerToUpdate.answererUserName = userName
        socket.to(socketIdToAnswer).emit('answerResponse', offerToUpdate)
    })

    socket.on('sendIceCandidateToSignalingServer', iceCandidateObj => {
        const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;
        if (didIOffer) {
            const offerInOffers = offers.find(o => o.offererUserName === iceUserName);
            if (offerInOffers) {
                offerInOffers.offerIceCandidates.push(iceCandidate)
             
                if (offerInOffers.answererUserName) {
                    const socketToSendTo = connectedSockets.find(s => s.userName === offerInOffers.answererUserName);
                    if (socketToSendTo) {
                        socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
                    } else {
                        console.log("Ice candidate recieved but could not find answere")
                    }
                }
            }
        } else {
        
            const offerInOffers = offers.find(o => o.answererUserName === iceUserName);
            const socketToSendTo = connectedSockets.find(s => s.userName === offerInOffers.offererUserName);
            if (socketToSendTo) {
                socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
            } else {
                console.log("Ice candidate recieved but could not find offerer")
            }
        }
    })

});
