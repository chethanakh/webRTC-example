const userName = "John-" + Math.floor(Math.random() * 100000)
const password = "xxx";
let isConnectedToSignalServer = false;
let peerConnection
let localStream
let remoteStream;
let didIOffer = false;
document.querySelector('#user-name').innerHTML = userName;

const socket = io.connect('https://localhost:3000/', {
    auth: {
        userName, password
    }
})

socket.on("connect", () => {
    isConnectedToSignalServer = true;
    console.log('connected to signal server');
});

socket.on("disconnect", () => {
    isConnectedToSignalServer = true;
    console.log('disconnected to signal server');
});

const localVideoEl = document.querySelector('#local-video');
const remoteVideoEl = document.querySelector('#remote-video');

let peerConfiguration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}


const call = async e => {
    await fetchUserMedia();
    await createPeerConnection();

    try {
        console.log("Creating offer...")
        const offer = await peerConnection.createOffer();
        console.log(offer);
        peerConnection.setLocalDescription(offer);
        didIOffer = true;
        socket.emit('newOffer',offer); 
    } catch (err) {
        console.log(err)
    }

}


const fetchUserMedia = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                // audio: true,
            });
            localVideoEl.srcObject = stream;
            localStream = stream;
            resolve();
        } catch (err) {
            console.log(err);
            reject()
        }
    })
}


const createPeerConnection = (offerObj = null) => {
    return new Promise(async (resolve, reject) => {

        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream()
        remoteVideoEl.srcObject = remoteStream;
        peerConnection.addS

        localStream.getTracks().forEach(track => {
            // peerConnection.addTrack(track, localStream);
        })

        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log(peerConnection.signalingState)
        });

        peerConnection.addEventListener('icecandidate', e => {
            if (e.candidate) {
                socket.emit('sendIceCandidateToSignalingServer', {
                    iceCandidate: e.candidate,
                    iceUserName: userName,
                    didIOffer,
                })
            }
        })

        peerConnection.addEventListener('track', e => {
            e.streams[0].getTracks().forEach(track => {
                console.log(track);
                remoteStream.addTrack(track, remoteStream);
            })
            localVideoEl.srcObject = remoteStream;
        })

        if(offerObj){
            await peerConnection.setRemoteDescription(offerObj.offer)
        }
        resolve();
    })
}

const answerOffer = async(offerObj)=>{
    await fetchUserMedia()
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer(); 
    await peerConnection.setLocalDescription(answer); 
 
    offerObj.answer = answer 
    
    const offerIceCandidates = await socket.emitWithAck('newAnswer',offerObj)
    offerIceCandidates.forEach(c=>{
        peerConnection.addIceCandidate(c);
    })
    console.log(offerIceCandidates)
}

const addAnswer = async(offerObj)=>{
    await peerConnection.setRemoteDescription(offerObj.answer)
    console.log(peerConnection.signalingState)
}


socket.on('availableOffers',offers=>{
    console.log(offers)
    createOfferEls(offers)
})

socket.on('newOfferAwaiting',offers=>{
    createOfferEls(offers)
})

socket.on('answerResponse',offerObj=>{
    console.log(offerObj)
    addAnswer(offerObj)
})

socket.on('receivedIceCandidateFromServer',iceCandidate=>{
    addNewIceCandidate(iceCandidate)
    console.log(iceCandidate)
})

function createOfferEls(offers){
    const answerEl = document.querySelector('#answer');
    offers.forEach(o=>{
        console.log(o);
        const newOfferEl = document.createElement('div');
        newOfferEl.innerHTML = `<button class="btn btn-success col-1">Answer ${o.offererUserName}</button>`
        newOfferEl.addEventListener('click',()=>answerOffer(o))
        answerEl.appendChild(newOfferEl);
    })
}

document.querySelector('#call').addEventListener('click', call)
