'use strict';

// Set up media stream constant and parameters.

// In this codelab, you will be streaming video only: "video: true".
// Audio will not be streamed because it is set to "audio: false" by default.
const mediaStreamConstraints = {
  video: true,
};

// Set up to exchange only video.
const offerOptions = {
  offerToReceiveVideo: 1,
};

// Define initial start time of the call (defined as connection between peers).
let startTime = null;

// Define peer connections, streams and video elements.
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let peerConnection;

const roomName = 'room 1'

const socket = io('http://localhost:8080');

// Define MediaStreams callbacks.

// Sets the MediaStream as the video element src.
function gotLocalMediaStream(mediaStream) {
  localVideo.srcObject = mediaStream;
  localStream = mediaStream;
  trace('Received local stream.');
  callButton.disabled = false;  // Enable call button.
}

// Handles error by logging a message to the console.
function handleLocalMediaStreamError(error) {
  trace(`navigator.getUserMedia error: ${error.toString()}.`);
}

// Handles remote MediaStream success by adding it as the remoteVideo src.
function gotRemoteMediaStream(event) {
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace('Remote peer connection received remote stream.');
}


// Add behavior for video streams.

// Logs a message with the id and size of a video element.
function logVideoLoaded(event) {
  const video = event.target;
  trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

// Logs a message with the id and size of a video element.
// This event is fired when video begins streaming.
function logResizedVideo(event) {
  logVideoLoaded(event);

  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = null;
    trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
  }
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);


// Define RTC peer connection behavior.

// Connects with new peer candidate.
function handleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    if (peerConnection != peerConnection)
      return;
      
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    socket.emit('message', {type: 'candidate', newIceCandidate, roomName})
    
  }
}

// Logs that the connection succeeded.
function handleConnectionSuccess(peerConnection) {
  trace(`${getPeerName(peerConnection)} addIceCandidate success.`);
};

// Logs that the connection failed.
function handleConnectionFailure(peerConnection, error) {
  trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}.`);
}

// Logs success when setting session description.
function setDescriptionSuccess(peerConnection, functionName) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} complete.`);
}

// Logs success when localDescription is set.
function setLocalDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

// Logs success when remoteDescription is set.
function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description, roomName, socket) {
  trace(`Offer from peerConnection:\n${description.sdp}`);

  trace('alice setLocalDescription start.');
  peerConnection.setLocalDescription(description)
    .then(() => {
      trace ('alice setLocalDescription success')
    }).catch(() => trace ('alice setLocalDescription FAILED'));

    socket.emit('message', { type: 'answer', description, roomName})

}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description, roomName, socket) {
  trace(`Answer from BOB:\n${description.sdp}.`);

  trace('BOB setLocalDescription start.');
  peerConnection.setLocalDescription(description)
    .then(() => {
      trace ('bob setLocalDesription success')
    }).catch(() => {
      trace ('bob setLocalDesription FAILED')
    });
    
  socket.emit('message', {type: 'answer', description, roomName})
}


// Define and add behavior to buttons.

// Define action buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;


// Handles start button action: creates local MediaStream.
function startAction() {
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
  trace('Requesting local stream.');
}

// Handles call button action: creates peer connection.
function callAction() {
  socket.emit('create or join room',  roomName)
  callButton.disabled = true;
  hangupButton.disabled = false;

  trace('Starting call.');
  startTime = window.performance.now();

  // Get local media stream tracks.
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace(`Using video device: ${videoTracks[0].label}.`);
  }
  if (audioTracks.length > 0) {
    trace(`Using audio device: ${audioTracks[0].label}.`);
  }

  const servers = null;  // Allows for RTC server configuration.

  // Create peer connections and add behavior.
  peerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object peerConnection.');

  peerConnection.addEventListener('icecandidate', handleConnection);
  peerConnection.addEventListener(
    'iceconnectionstatechange', handleConnectionChange);

  peerConnection.addEventListener('addstream', gotRemoteMediaStream);

  trace('Added local stream to peerConnection.');

  socket.on('message', message => {
    const {type, roomName, description, newIceCandidate} = message
    if (type == 'offer') {
      trace('alice createOffer start.');
      peerConnection.addStream(localStream);
      peerConnection.createOffer(offerOptions)
        .then((description) => { createdOffer(description, roomName, socket) })
        .catch(setSessionDescriptionError);  
    
    } else if (type == 'answer') {
      if (peerConnection.localDescription && !peerConnection.remoteDescription) {
        trace('alice set final description')
        peerConnection.setRemoteDescription(description)
        .then(() => {
          trace ('ALICE setRemoteDesription final success')
        }).catch(() => {
          trace ('ALICE setRemoteDesription final failed')
        });
        return;
      }
      peerConnection.addStream(localStream);

      trace('bob setRemoteDescription start.');
      peerConnection.setRemoteDescription(description)
      .then(() => {
        trace ('bob setRemoteDescription success');
      }).catch(() => {
        trace ('bob setRemoteDescription FAILED');
      });
  
      trace('BOB createAnswer start.');
      peerConnection.createAnswer()
        .then((description) => {createdAnswer(description, roomName, socket)})
        .catch(setSessionDescriptionError);
    } else if (type == 'candidate') {
      peerConnection.addIceCandidate(newIceCandidate)
      .then(() => {
        handleConnectionSuccess(peerConnection);
      }).catch((error) => {
        handleConnectionFailure(peerConnection, error);
      });

    trace(`receive ICE candidate added`);
    }
  })
  
}

// Handles hangup action: ends up call, closes connections and resets peers.
function hangupAction() {
  peerConnection.close();
  peerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace('Ending call.');
}

// Add click event handlers for buttons.
startButton.addEventListener('click', startAction);
callButton.addEventListener('click', callAction);
hangupButton.addEventListener('click', hangupAction);


// Define helper functions.

// Gets the name of a certain peer connection.
function getPeerName(peerConnection) {
  return (peerConnection === peerConnection) ?
      'peerConnection' : 'remotePeerConnection';
}

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}
