//import AgoraRTM from 'agora-rtm-sdk'
import {RTMClient} from "./rtm-client.js";

// create Agora client
var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
////////////////Agora RTM Changes///////////////////
const rtm = new RTMClient()
////////////////////////////////////////////////////

var localTracks = {
  videoTrack: null,
  audioTrack: null
};

const BufferLength = 10;

class Point {
  constructor(){
  this.x= null, this.y = null;
  } 

  CopyPoint(myPoint){
      this.x= myPoint.x, this.y = myPoint.y;
  }

  IsEqual(myPoint)
  {
    if (this.x == myPoint.x && this.y == myPoint.y)
    {
      return true;
    }
    else
    {
      return false;
    }
  }
}

var listOfPoints = [];

var isMouseDown = false;

var lastPos = new Point();

var remoteUsers = {};

// Agora client options
var options = {
  appid: null,
  channel: null,
  uid: null,
  token: null
};

const ConventionFactor = 3;
const width = 1080.0/ConventionFactor ;//432; // Mobile width(1080) / ConventionFactor
const height = 2260.0/ConventionFactor;//904; // Mobile height(2260) / ConventionFactor

// the demo can auto join channel with params in url
$(() => {
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  if (options.appid && options.channel) {
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
    $("#join-form").submit();
  }

  RegisterRTMClientEvents();
})

$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    options.appid = $("#appid").val();
    options.token = $("#token").val();
    options.channel = $("#channel").val();
    await join();
    if (options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
      $("#success-alert").css("display", "block");
    }

    InitializeAndLoginRTMClient();

    //const channel = this.clientRTM.createChannel(options.channel);
    //  this.subscribeChannelEvents(options.channel);
    //  channel.join();
    ////////////////////////////////////////////////////
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
})

$("#leave").click(function (e) {
  leave();
})

function RegisterRTMClientEvents() {
  rtm.on('ConnectionStateChanged', (newState, reason) => {
    console.log('reason', reason);    
    if (newState === 'ABORTED') {
      if (reason === 'REMOTE_LOGIN') {
        console.log('You have already been kicked off!');        
      }
    }
  });

  rtm.on('MessageFromPeer', async (message, peerId) => {    
      console.log('message ' + message.text + ' peerId' + peerId);      
  });
}

function InitializeAndLoginRTMClient() {

  //Initialize RTM Client
  rtm.init(options.appid);

  //Login into RTM Client
  rtm.login(options.uid.toString(), '').then(() => {
    console.log('login');
    rtm._logined = true;
    console.log('Login: ' + options.uid);
  }).catch((err) => {
    console.log(err);
  });
}

async function join() {

  // add event listener to play remote tracks when remote user publishs.
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);

  // join a channel and create local tracks, we can use Promise.all to run them concurrently
  [options.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
    // join the channel
    client.join(options.appid, options.channel, options.token || null),
    // create local tracks, using microphone and camera
    AgoraRTC.createMicrophoneAudioTrack(),
    //AgoraRTC.createCameraVideoTrack()
    AgoraRTC.createCameraVideoTrack()
  ]);

  //localTracks.videoTrack.setEncoderConfiguration({ width: 1280, height: 720 }).then(() => { /** ... **/ });
  // play local video track
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  // publish local tracks to channel
  await client.publish(Object.values(localTracks));
  console.log("publish success");

  // this.accountName = options.uid.toString();
  // this.token = '';
  // this.clientRTM.login({ uid: this.accountName, token });
}

function mouseMove(event) {
  if (isMouseDown)
  { 
    //var eventDoc, doc, body;

    event = event || window.event; // IE-ism

    //If pageX/Y aren't available and clientX/Y are,
    //calculate pageX/Y - logic taken from jQuery.
    //(This is to support old IE)
    if (event.pageX == null && event.clientX != null) {
        eventDoc = (event.target && event.target.ownerDocument) || document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;

        event.pageX = event.clientX +
          (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
          (doc && doc.clientLeft || body && body.clientLeft || 0);
        event.pageY = event.clientY +
          (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
          (doc && doc.clientTop  || body && body.clientTop  || 0 );
    }

    // Use event.clientX / event.clientY here
    var myPoint = new Point();
    myPoint.x = event.clientX;
    myPoint.y = event.clientY;    
    console.log('Client: ' + myPoint.x + ' , ' + myPoint.y);

    // Use event.pageX / event.pageY here
    //Point.x = event.pageX;
    //Point.y = event.pageY;

    // if (DistanceToLastPoint(Point) > 0.05)
    // {
    //     lastPos = Point;
    //     //BufferSendPoints(NormalizePoint(Point));
    //     BufferSendPoints(Point);
    // }

    if (!myPoint.IsEqual(lastPos))
    {
      lastPos.CopyPoint(myPoint);
      BufferSendPoints(NormalizePoint(myPoint));
    }    
  }
}

function NormalizePoint(point)
{
  // Should use kind of below method to get the desired video element but code wasn't running properly
  // var IdStr = "video_track-video-";
  // var ele = $('[id^="IdStr"]');  
  // var remoteVideoPosition = ele[0].getBoundingClientRect();    

  // This is not the preferred way to access video element 
  // because this is supported by modern browsers only
  var elements = document.querySelectorAll('[id^="video_track-video-"]');
  if (elements == null)
  {
    // This is the fallback option
      var ID = /^video_track-video-/;
      var elements=[],els=document.getElementsByTagName('*');
      for (var i=els.length;i--;) if (ID.test(els[i].id)) elements.push(els[i]);
  }
  var remoteVideoPosition = elements[0].getBoundingClientRect();    

  var normalizedPt = new Point();
  
  //console.log('Event: ' + point.x + ' , ' + point.y);  
  //console.log(remoteVideoPosition);  
  //normalizedPt.x = ((point.x - 418 - 75)/1005.0).toFixed(2);
  //normalizedPt.y = ((1920 - point.y + 260)/1920.0).toFixed(2);
  var x = point.x - remoteVideoPosition.left; //x position within the element.
  var y = remoteVideoPosition.height - (point.y - remoteVideoPosition.top);  //y position within the element.

  normalizedPt.x = x * ConventionFactor;  
  normalizedPt.y = y * ConventionFactor;

  
  //normalizedPt.x = ((x)/(remoteVideoPosition.width * 1.0)).toFixed(2);  
  //normalizedPt.y = ((remoteVideoPosition.height - y)/(remoteVideoPosition.height * 1.0)).toFixed(2);

  //Converting screen points to viewpoints
  //normalizedPt.x = x / remoteVideoPosition.width;
  //normalizedPt.y = y / remoteVideoPosition.height;

  console.log('Normalized Points: x= ' + normalizedPt.x + ' , y=' + normalizedPt.y); 
  return normalizedPt;
}

function mouseDown() {
  listOfPoints = [];
  isMouseDown = true;
}

function mouseUp() {
  isMouseDown = false;
  SendDrawing();  
}

function DistanceToLastPoint(point)
{
    if (lastPos.x == -1) { return Number.POSITIVE_INFINITY; }

    var distance = Math.sqrt(Math.pow((lastPos.x-point.x),2)+Math.pow((lastPos.y-point.y),2));
    
    return distance;
}

function BufferSendPoints(point)
{
    listOfPoints.push(point);

    if (listOfPoints.length > BufferLength)
    {
        SendDrawing();
    }
}

function SendDrawing()
{
    if (listOfPoints == null || listOfPoints.length == 0) { return; }

    // DrawmarkModel dm = new DrawmarkModel
    // {
    //     color = DrawColor,
    //     points = Points
    // };

    // if (ProcessDrawing != null)
    // {
    //     ProcessDrawing(dm);
    // }
    var dm = {
      "points" : listOfPoints
    }

    var jsonString = JSON.stringify(dm);

   // rtm.sendPeerMessage(jsonString,   remoteUsers[0].key);
    //rtm.sendPeerMessage(jsonString,   Object.keys(remoteUsers)[0]);
    rtm.sendPeerMessage(jsonString, "LocalUser");

    console.log("Point(s) sent to remote user")

    listOfPoints = [];
}
////////////////Agora RTM Changes///////////////////
// subscribe channel events
////////////////////////////////////////////////////
async function leave() {
  for (let trackName in localTracks) {
    var track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("client leaves channel success");

  //Log out from RTM client
  rtm.logout();
}

async function clear() {
  var jsonString = "{\"clear\": true}";       

  rtm.sendPeerMessage(jsonString, "LocalUser");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");
  var playerId = "player-" + uid;
  //<div id="player-${uid}" class="player" style="transform: rotateX(180deg); height: 1920px; width: 1080px; padding-right: 75px;padding-left: 75px;"></div>
  if (mediaType === 'video') {
    
    const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})
        <button id="clear" type="button" class="btn btn-primary btn-sm" style="float: center;">Clear</button>
        </p>        
        <div id="player-${uid}" class="player" style="height: ${height}px; width: ${width}px; transform: rotateY(180deg);"></div>
      </div>
    `);
    
    $("#remote-playerlist").append(player);
    
    $("#clear").click(function (e) {
  clear();
})
    user.videoTrack.play(`player-${uid}`);

    /////////Add code for mouse down, click and up positions////////////
  //document.getElementById("local-player").addEventListener("mousedown", mouseDown);
  //document.getElementById("local-player").addEventListener("mouseUp", mouseUp);  
  document.getElementById(playerId).addEventListener("mousemove", mouseMove);
  document.getElementById(playerId).onmousedown = function() {mouseDown()};
  document.getElementById(playerId).onmouseup = function() {mouseUp()};

  ////////////////////////////////////////////////////////////////////
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }  
}

function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  // remoteUsers.push({
  //   key: id,
  //   value: user
  // });
  subscribe(user, mediaType);

  //rtm.sendPeerMessage('Hello', id.toString());
  //console.log(`Message sent to user (${id})`);  
}

function handleUserUnpublished(user) {
  const id = user.uid;
  delete remoteUsers[id];
  //remoteUsers = [];
  //RemoveItemFromRemoteUsersArray(user.uid);
  $(`#player-wrapper-${id}`).remove();
}
function RemoveItemFromRemoteUsersArray(id) {
  const index = remoteUsers.indexOf(id.toString());
  if (index > -1) {
    remoteUsers.splice(index, 1);
  }
}

