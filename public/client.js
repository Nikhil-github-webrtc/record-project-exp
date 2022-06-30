// DOM elements.
const roomSelectionContainer = document.getElementById('room-selection-container')
const roomInput = document.getElementById('room-input')
const connectButton = document.getElementById('connect-button')

const videoChatContainer = document.getElementById('video-chat-container')
const localVideoComponent = document.getElementById('local-video')
const remoteVideoComponent = document.getElementById('remote-video')
const recordButtonControlsComponent = document.getElementById('record-controls')

// Variables.
const socket = io()
const mediaConstraints = {
  audio: true,
  video: true
//   video: { width: 1280, height: 720 },
}
const mediaScreenConstraints = {
	sendSource : 'screen'
  }

let localStream
let remoteStream
let isRoomCreator
let rtcPeerConnection // Connection between the local device and the remote peer.
let roomId
let gotTab
let captureStream



//Our Turn Server
const iceServers = {
  iceServers: [
    // { urls: 'stun:stun.l.google.com:19302' },  // Free public STUN servers provided by Google.
    // { urls: 'stun:stun1.l.google.com:19302' },
    // { urls: 'stun:stun2.l.google.com:19302' },
    // { urls: 'stun:stun3.l.google.com:19302' },
    // { urls: 'stun:stun4.l.google.com:19302' },
    {   
      urls: [ "stun:stun.itmines.in" ]
    }, 
    {   
      username: "guest",   
      credential: "somepassword",   
      urls: [       
        // "turn:turn.itmines.in:3478?transport=udp",       //udp is connectionless and not good for banks
        "turn:turn.itmines.in:3478?transport=tcp"       
       ]
     }
   ]
}



// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => {
  joinRoom(roomInput.value)
})

// SOCKET EVENT CALLBACKS =====================================================
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')

  await setLocalStream(mediaConstraints)
  isRoomCreator = true
})

socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')

  await setLocalStream(mediaConstraints)
  socket.emit('start_call', roomId)
})

socket.on('full_room', () => {
  console.log('Socket event callback: full_room')

  alert('The room is full, please try another one')
})

socket.on('start_call', async () => {
  console.log('Socket event callback: start_call')

  if (isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    await createOffer(rtcPeerConnection)
  }
})

socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer')

  if (!isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
    await createAnswer(rtcPeerConnection)
  }
})

socket.on('webrtc_answer', (event) => {
  console.log('Socket event callback: webrtc_answer')

  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate')

  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  rtcPeerConnection.addIceCandidate(candidate)
})

// FUNCTIONS ==================================================================
function joinRoom(room) {
  if (room === '') {
    alert('Please type a room ID')
  } else {
    roomId = room
    socket.emit('join', room)
    showVideoConference()
  }
}

function showVideoConference() {
  roomSelectionContainer.style = 'display: none'
  videoChatContainer.style = 'display: block'
  recordButtonControlsComponent.style = 'display: block'
}

async function setLocalStream(mediaConstraints) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
  } catch (error) {
    console.error('Could not get user media', error)
  }

  localStream = stream
  localVideoComponent.srcObject = stream
}

function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream)
  })
}

async function createOffer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createOffer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomId,
  })
}

async function createAnswer(rtcPeerConnection) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createAnswer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomId,
  })
}

function setRemoteStream(event) {
  remoteVideoComponent.srcObject = event.streams[0]
  remoteStream = event.stream 
  remoteStream =  event.streams[0] //added remote stream here 28 jun
}

function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit('webrtc_ice_candidate', {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}
//screen record
// async function captureScreen() {
//   mediaConstraints = {
//     video: {
//       cursor: 'always',
//       resizeMode: 'crop-and-scale'
//     }
//   }

//   const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints)
//   return screenStream
// }

// async function setCaptureScreen(mediaScreenConstraints) {
//   let screenStream
//   try {
//     screenStream = await navigator.mediaDevices.getDisplayMedia(mediaScreenConstraints)
//   } catch (error) {
//     console.error('Could not get display media', error)
//   }
//   gotScreen = screenStream
// }

//screen capture 
// async function startCapture(displayMediaOptions) {
// 	let captureStream = null;
  
// 	try {
// 	  captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
// 	} catch(err) {
// 	  console.error("Error: " + err);
// 	}
// 	return captureStream;
//   }

// const shareScreen = async () => {
// 	const mediaStream = await getLocalScreenCaptureStream();
  
// 	const screenTrack = mediaStream.getVideoTracks()[0];
  
// 	if (screenTrack) {
// 	  console.log('replace camera track with screen track');

// 	}
//   };
  
//   const getLocalScreenCaptureStream = async () => {
// 	try {
// 	  const constraints = { video: { cursor: 'always' }, audio: false };
// 	  const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia(constraints);
// 	  return screenCaptureStream;
// 	} catch (error) {
// 	  console.error('failed to get local screen', error);
// 	}
//   };

// we ask for permission to record the window
// mediaSource could also be 'screen' if we wanted
// to record the entire screen
// let screenStream;
// const outputStream= new MediaStream();
// outputStream.addTrack(screenStream.getVideoTracks()[0]);

// capture part
var displayMediaOptions = {
	video: true,
	audio: true
  };
const videoElem = document.getElementById("cvideo");
const logElem = document.getElementById("log");
const startElem = document.getElementById("startc");
const stopElem = document.getElementById("stopc");
// let screenCaptureStream;
  // Set event listeners for the start and stop buttons
startElem.addEventListener("click", function(evt) {
	startCapture();
  }, false);
  
  stopElem.addEventListener("click", function(evt) {
	stopCapture();
  }, false);
async function startCapture(displayMediaOptions) {
	let captureStream = null;
  
	try {
	  captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
	} catch(err) {
	  console.error("Error: " + err);
	}
	return captureStream;
  }
  async function startCapture() {
	logElem.innerHTML = "";
  
	try {
	  videoElem.srcObject = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
	  dumpOptionsInfo();
	} catch(err) {
	  console.error("Error: " + err);
	}
	videoElem.style.display = "none";
  }

  function stopCapture(evt) {
	let tracks = videoElem.srcObject.getTracks();
  
	tracks.forEach(track => track.stop());
	videoElem.srcObject = null;
  }
  function dumpOptionsInfo() {
	const videoTrack = videoElem.srcObject.getVideoTracks()[0];
	captureStream = videoElem.srcObject;
	captureStream = stream;

	console.info("Track settings:");
	console.info(JSON.stringify(videoTrack.getSettings(), null, 2));
	console.info("Track constraints:");
	console.info(JSON.stringify(videoTrack.getConstraints(), null, 2));
  }
//   function addCaptureTracks(rtcPeerConnection) {
// 	getDisplayMedia.getTracks().forEach((track) => {
// 	  rtcPeerConnection.addTrack(track, getDisplayMedia)
// 	})
//   }
  
// async function setCaptureStream(mediaConstraints) {
// 	let stream
// 	try {
// 	  stream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints)
// 	} catch (error) {
// 	  console.error('Could not get user media', error)
// 	}
  
// 	gotTab = stream
//   }


//record part
var recBtn = document.querySelector('button#rec');
var pauseResBtn = document.querySelector('button#pauseRes');
var stopBtn = document.querySelector('button#stop');
var mediaRecorder;
var playbackVideoElement = document.querySelector('#playback');
var containerType = "video/webm";


playbackVideoElement.controls = false;  //hide at begining

function onBtnRecordClicked (){
	if (localStream == null) {
		alert('Could not get local stream from mic/camera');
	}else {
		recBtn.disabled = true;
		pauseResBtn.disabled = false;
		stopBtn.disabled = false;

		chunks = [];

		// /* use the stream */
		console.log('Start recording...');
		if (typeof MediaRecorder.isTypeSupported == 'function'){
			// /*
			// 	MediaRecorder.isTypeSupported is a function announced in https://developers.google.com/web/updates/2016/01/mediarecorder and later introduced in the MediaRecorder API spec http://www.w3.org/TR/mediastream-recording/
			// */
			if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
			  var options = {mimeType: 'video/webm;codecs=vp9'};
			} else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
			  var options = {mimeType: 'video/webm;codecs=h264'};
			} else  if (MediaRecorder.isTypeSupported('video/webm')) {
			  var options = {mimeType: 'video/webm'};
			} else  if (MediaRecorder.isTypeSupported('video/mp4')) {
			  //Safari 14.0.2 has an EXPERIMENTAL version of MediaRecorder enabled by default
			  containerType = "video/mp4";
			  var options = {mimeType: 'video/mp4'};
			}
			console.log('Using '+options.mimeType);
			mediaRecorder = new MediaRecorder(captureStream, options); 
        //    mediaRecorder = new MediaRecorder(localStream , options);
		}else{
			console.log('isTypeSupported is not supported, using default codecs for browser');
			mediaRecorder = new MediaRecorder(captureStream);
            // mediaRecorder = new MediaRecorder(localStream);

		}


		mediaRecorder.ondataavailable = function(e) {
			console.log('mediaRecorder.ondataavailable, e.data.size='+e.data.size);
			if (e.data && e.data.size > 0) {
				chunks.push(e.data);
			}
		};

		mediaRecorder.onerror = function(e){
			console.log('mediaRecorder.onerror: ' + e);
		};

		mediaRecorder.onstart = function(){
			console.log('mediaRecorder.onstart, mediaRecorder.state = ' + mediaRecorder.state);
			
			localStream.getTracks().forEach(function(track) {
              if(track.kind == "audio"){
                console.log("onstart - Audio track.readyState="+track.readyState+", track.muted=" + track.muted);
              }
              if(track.kind == "video"){
                console.log("onstart - Video track.readyState="+track.readyState+", track.muted=" + track.muted);
              }
            });
			
		};
    mediaRecorder.onstop = function(){
			console.log('mediaRecorder.onstop, mediaRecorder.state = ' + mediaRecorder.state);

			//var recording = new Blob(chunks, {type: containerType});
			var recording = new Blob(chunks, {type: mediaRecorder.mimeType});
			

			downloadLink.href = URL.createObjectURL(recording);

			/* 
				srcObject code from https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject
			*/

			/*if ('srcObject' in playbackVideoElement) {
			  try {
			    playbackVideoElement.srcObject = recording;
			  } catch (err) {
			    if (err.name != "TypeError") {
			      throw err;
			    }*/
			    // Even if they do, they may only support MediaStream
			    playbackVideoElement.src = URL.createObjectURL(recording);
			/*  }
			} else {
			  playbackVideoElement.src = URL.createObjectURL(recording);
			} */

			playbackVideoElement.controls = true;
			playbackVideoElement.play();
      videoChatContainer.style = 'display: none';
    //   recordButtonControlsComponent.style = 'display: none'



			var rand =  Math.floor((Math.random() * 10000000));
			switch(containerType){
				case "video/mp4":
					var name  = "video_"+rand+".mp4" ;
					break;
				default:
					var name  = "video_"+rand+".webm" ;
			}

			downloadLink.innerHTML = 'Download '+name;

			downloadLink.setAttribute( "download", name);
			downloadLink.setAttribute( "name", name);
		};

		mediaRecorder.onpause = function(){
			console.log('mediaRecorder.onpause, mediaRecorder.state = ' + mediaRecorder.state);
		}

		mediaRecorder.onresume = function(){
			console.log('mediaRecorder.onresume, mediaRecorder.state = ' + mediaRecorder.state);
		}

		mediaRecorder.onwarning = function(e){
			console.log('mediaRecorder.onwarning: ' + e);
		};

		pauseResBtn.textContent = "Pause";

		mediaRecorder.start(1000);

		localStream.getTracks().forEach(function(track) {
			console.log(track.kind+":"+JSON.stringify(track.getSettings()));
			console.log(track.getSettings());

		// remoteStream.getTracks().forEach(function(track) {
		// 		console.log(track.kind+":"+JSON.stringify(track.getSettings()));
		// 		console.log(track.getSettings());
		// 	})
		})
	}
}


navigator.mediaDevices.ondevicechange = function(event) {
	console.log("mediaDevices.ondevicechange");
	/*
	if (localStream != null){
		localStream.getTracks().forEach(function(track) {
			if(track.kind == "audio"){
				track.onended = function(event){
					log("audio track.onended");
				}
			}
		});
	}
	*/
}

function onBtnStopClicked(){
	mediaRecorder.stop();
	recBtn.disabled = false;
	pauseResBtn.disabled = true;
	stopBtn.disabled = true;
}

function onPauseResumeClicked(){
	if(pauseResBtn.textContent === "Pause"){
		pauseResBtn.textContent = "Resume";
		mediaRecorder.pause();
		stopBtn.disabled = true;
	}else{
		pauseResBtn.textContent = "Pause";
		mediaRecorder.resume();
		stopBtn.disabled = false;
	}
	recBtn.disabled = true;
	pauseResBtn.disabled = false;
}

function onStateClicked(){
	
	if(mediaRecorder != null && remoteStream != null){
		console.log("mediaRecorder.state="+mediaRecorder.state);
		console.log("mediaRecorder.mimeType="+mediaRecorder.mimeType);
		console.log("mediaRecorder.videoBitsPerSecond="+mediaRecorder.videoBitsPerSecond);
		console.log("mediaRecorder.audioBitsPerSecond="+mediaRecorder.audioBitsPerSecond);

		remoteStream.getTracks().forEach(function(track) {
			if(track.kind == "audio"){
				console.log("Audio: track.readyState="+track.readyState+", track.muted=" + track.muted);
			}
			if(track.kind == "video"){
				console.log("Video: track.readyState="+track.readyState+", track.muted=" + track.muted);
			}
		});
	
		console.log("Audio activity: " + Math.round(soundMeter.instant.toFixed(2) * 100));
	}
	
}

//share scree part
// function startShareScreen() {
//     // var login = document.getElementById("login").value;
//     // var streamName = login + "#room1" + "#desktop";
//     var constraints = {
//         audio: true,
//         video: {
//             width: 640,
//             height: 480            
//         }
//     };
//     constraints.video.type = "screen";
//     constraints.video.withoutExtension = true;
    
// 	publishStream = session.createStream({
//         name: streamName,
//         display: localDisplay,
//         receiveVideo: false,
//         receiveAudio: false,
//         constraints: constraints,
//     }).on(STREAM_STATUS.PUBLISHING, function(publishStream) {})
//     publishStream.publish();
// }
