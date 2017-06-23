import {Equirectangular2Fisheye, Fisheye2Perspective, Fisheye2Equirectangular, mercator2Sphere, sphere2Mercator, sphere2Fisheye, fisheye2Sphere, createFisheyeMesh, load_skybox_texture, createSkyboxMesh} from "./";

import * as dat from "dat-gui";

import QUnit     = require('qunitjs');
import empower   = require('empower');
import formatter = require('power-assert-formatter');
import qunitTap  = require("qunit-tap");

QUnit.config.autostart = true;
empower(QUnit.assert, formatter(), { destructive: true });
qunitTap(QUnit, function() { console.log.apply(console, arguments); }, {showSourceOnFailure: false});

QUnit.module("Fisheye");

QUnit.test("mercator2Sphere, sphere2Mercator", async (assert: Assert)=>{
  for(let x=0; x<=1; x+=0.1){
    for(let y=0; y<=1; y+=0.1){
      const [a, b] = mercator2Sphere(x, y);
      const [_x, _y] = sphere2Mercator(a, b);
      assert.ok(x-0.00000001 <= _x && _x <= x+0.00000001);
      assert.ok(y-0.00000001 <= _y && _y <= y+0.00000001);
    }
  }
});


QUnit.test("Fisheye2Perspective", async (assert: Assert)=>{
  const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        mandatory: {
          minFrameRate: 1,
          maxFrameRate: 5,
          minWidth: 2592,
          minHeight: 1944 } } });
  const url = URL.createObjectURL(stream);
  const video = document.createElement("video");
  video.src = url;

  await new Promise((resolve, reject)=>{
    video.addEventListener("loadeddata", resolve, <any>{once: true});
    video.addEventListener("error", reject, <any>{once: true});
  });

  video.autoplay = true;

  const cam = new Fisheye2Perspective();

  cam.src = video;
  cam.canvasSize = {width: 600, height: 400};
  cam.cameraPose = {pitch: Math.PI/4, yaw: 0};
  cam.zoom = 1/3
  cam.fisheyeRegion = {centerX: 1259, centerY: 887, radius: 879};

  let dragging = false;
  cam.canvas.addEventListener("mousemove", (ev)=>{ if(dragging){ cam.drag("move", ev.offsetX, ev.offsetY); } });
  cam.canvas.addEventListener("mousedown", (ev)=>{ dragging = true; cam.drag("start", ev.offsetX, ev.offsetY); });
  cam.canvas.addEventListener("mouseup", (ev)=>{ dragging = false; });
  cam.canvas.addEventListener("mouseleave", (ev)=>{ dragging = false; });

  // dat-GUI
  const gui = new dat.GUI();
  const width = cam.texctx.canvas.width;
  gui.add(video, "currentTime", 0, video.duration);
  gui.add(cam, "zoom", 0.01, 2).step(0.01);
  gui.add(cam, "centerX", -width, width);
  gui.add(cam, "centerY", -width, width);
  gui.add(cam, "radius", 1, width/2);
  gui.add(cam, "pitch", 0, Math.PI/2);
  gui.add(cam, "yaw", -Math.PI, Math.PI);
  gui.close();

  document.body.appendChild(cam.canvas);
  //document.body.appendChild(cam.texctx.canvas);
  //document.body.appendChild(cam.texctx1.canvas); // sep_mode
  //document.body.appendChild(cam.texctx2.canvas); // sep_mode
  //document.body.appendChild(video);

  const tid = setInterval(()=>{
    cam.render();
    gui.__controllers
        .forEach((ctrl)=>{ ctrl.updateDisplay(); }); // dat-gui
  }, 30);

  video.play();

  await sleep(5 * 60 * 1000);

  clearTimeout(tid);
  cam.destructor();
  video.pause();
  URL.revokeObjectURL(url);
  stream.getTracks().forEach((a)=>{ a.stop(); });

  assert.ok(true);
});


QUnit.test("Fisheye2Equirectangular", async (assert: Assert)=>{
  const video = document.createElement("video");
  video.src = "./ec2e5847-b502-484c-b898-b8e2955f4545.webm";

  await new Promise((resolve, reject)=>{
    video.addEventListener("loadeddata", resolve, <any>{once: true});
    video.addEventListener("error", reject, <any>{once: true});
  });
  const cam = new Fisheye2Equirectangular();
  window["cam"] = cam;
  cam.src = video;
  //cam.canvasSize = {width: 600, height: 400};
  cam.fisheyeRegion = {centerX: 1259, centerY: 887, radius: 879};
  document.body.appendChild(cam.canvas);

  cam.render();

  assert.ok(true);
});

import * as THREE from "three";
QUnit.test("Equirectangular2Fisheye", async (assert: Assert)=>{
  const img = new Image();
  img.src = "./WellsCathedral-28F12wyrdlight.equirectangular.png";
  await new Promise((resolve, reject)=>{
    img.addEventListener("load", resolve, <any>{once: true});
    img.addEventListener("error", reject, <any>{once: true});
  });
  const skyboxtex = await load_skybox_texture('../textures/cube/Park3Med/');
  const skybox = await createSkyboxMesh(skyboxtex);

  const renderer = new THREE.WebGLRenderer();
  const scene = new THREE.Scene();
  
  const tex = new THREE.Texture(img);
  tex.needsUpdate = true;
  const mesh = createFisheyeMesh(tex);
  mesh.rotation.x = Math.PI; // 北緯側の半球になるように回転
  mesh.rotation.y = Math.PI; // こっちむいてベイビー
  mesh.position.z = -800; // カメラからの距離
  const {width, height} = (<THREE.PlaneGeometry>mesh.geometry).parameters;
  const camera = new THREE.OrthographicCamera(100/-2, 100/2, 100/2, 100/-2, 1, 10000);
  //const camera = new THREE.PerspectiveCamera( 30, 4 / 3, 1, 10000 );
  camera.position.z = 0.01;
  scene.add(camera);
  scene.add(mesh);
  scene.add(skybox);
  
  //renderer.setSize( 400, 300 );

  renderer.setSize( width, height );
  camera.left = width/-2;
  camera.right = width/2;
  camera.top = height/2;
  camera.bottom = height/-2;
  
  camera.updateProjectionMatrix();

  document.body.appendChild(renderer.domElement);

  tex.needsUpdate = true;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  

  assert.ok(true);
});


function sleep(ms: number): Promise<void>{
  return new Promise<void>((resolve)=> setTimeout(resolve, ms));
}

