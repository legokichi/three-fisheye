"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.load_image = load_image;
exports.load_video = load_video;
exports.load_video_texture = load_video_texture;
exports.load_skybox_texture = load_skybox_texture;
exports.calculate_clip_size = calculate_clip_size;
exports.load_fisheye_image_canvas_texture = load_fisheye_image_canvas_texture;
exports.load_fisheye_video_canvas_texture = load_fisheye_video_canvas_texture;
exports.createSkyboxMesh = createSkyboxMesh;
exports.createFisheyeMesh = createFisheyeMesh;
exports.createPanoramaMesh = createPanoramaMesh;
exports.create_camera = create_camera;
exports.updateAngleOfView = updateAngleOfView;
exports.recorder = recorder;
exports._main = _main;
exports.main = main;
var THREE = require("three");
var OrbitControls = require('three-orbitcontrols');
var $ = require("jquery");
var Stats = require("stats.js");

function load_image(url) {
  var img = new Image();
  return new Promise(function (resolve, reject) {
    img.src = url;
    img.addEventListener("load", function listener() {
      img.removeEventListener("load", listener);
      resolve(img);
    });
  });
}

function load_video(url) {
  var video = document.createElement("video");
  return new Promise(function (resolve, reject) {
    video.src = url;
    video.addEventListener("loadeddata", function listener() {
      video.removeEventListener("loadeddata", listener);
      resolve(video);
    });
  });
}

function load_video_texture(url) {
  return load_video(url).then(function (video) {
    video.loop = true;
    video.play();
    return new THREE.VideoTexture(video);
  });
}

function load_skybox_texture(urls) {
  return new Promise(function (resolve, reject) {
    var loader = new THREE.CubeTextureLoader();
    loader.setPath(urls);
    loader.load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'], resolve, function (xhr) {}, reject);
  });
}

function calculate_clip_size(width, height) {
  var min = Math.min(width, height);
  var max = Math.max(width, height);
  for (var i = 0; min > Math.pow(2, i); i++) {} // 2^n の大きさを得る
  var pow = Math.pow(2, i - 1);
  var dx = 0;
  var dy = 0;
  var dw = pow;
  var dh = pow; // 縮小先の大きさ

  var _ref = width < height ? [0, max / 2 - min / 2, min, min] // ソースのクリッピング領域
  : [max / 2 - min / 2, 0, min, min];

  var _ref2 = _slicedToArray(_ref, 4);

  var sx = _ref2[0];
  var sy = _ref2[1];
  var sw = _ref2[2];
  var sh = _ref2[3];

  console.log("fisheye size: " + pow + "x" + pow);
  return { sx: sx, sy: sy, sw: sw, sh: sh, dx: dx, dy: dy, dw: dw, dh: dh };
}

function load_fisheye_image_canvas_texture(url) {
  return load_image(url).then(function (img) {
    var cnv = document.createElement("canvas");
    var ctx = cnv.getContext("2d");
    var width = img.width;
    var height = img.height;

    var _calculate_clip_size = calculate_clip_size(width, height);

    var sx = _calculate_clip_size.sx;
    var sy = _calculate_clip_size.sy;
    var sw = _calculate_clip_size.sw;
    var sh = _calculate_clip_size.sh;
    var dx = _calculate_clip_size.dx;
    var dy = _calculate_clip_size.dy;
    var dw = _calculate_clip_size.dw;
    var dh = _calculate_clip_size.dh;

    var _dw = 2 * dw;

    var _dh = 2 * dh; // 静止画はアップサイジング


    var _ref3 = [_dw, _dh];
    cnv.width = _ref3[0];
    cnv.height = _ref3[1];

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, _dw, _dh);
    var tex = new THREE.Texture(cnv);
    tex.needsUpdate = true;
    return tex;
  });
}

function load_fisheye_video_canvas_texture(url) {
  return load_video(url).then(function (video) {
    var cnv = document.createElement("canvas");
    var ctx = cnv.getContext("2d");
    var videoWidth = video.videoWidth;
    var videoHeight = video.videoHeight;

    var _calculate_clip_size2 = calculate_clip_size(videoWidth, videoHeight);

    var sx = _calculate_clip_size2.sx;
    var sy = _calculate_clip_size2.sy;
    var sw = _calculate_clip_size2.sw;
    var sh = _calculate_clip_size2.sh;
    var dx = _calculate_clip_size2.dx;
    var dy = _calculate_clip_size2.dy;
    var dw = _calculate_clip_size2.dw;
    var dh = _calculate_clip_size2.dh;
    var _ref4 = [dw, dh];
    cnv.width = _ref4[0];
    cnv.height = _ref4[1];

    var tex = new THREE.Texture(cnv);
    var paused = false;
    video.addEventListener("playing", function (ev) {
      paused = false;requestAnimationFrame(_draw);
    });
    video.addEventListener("pause", function (ev) {
      paused = true;
    });
    video.addEventListener("ended", function (ev) {
      paused = true;
    });
    function _draw() {
      cnv.width = cnv.width;
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      tex.needsUpdate = true;
      if (!paused) requestAnimationFrame(_draw);
    }
    video.loop = true;
    video.play();
    _draw(); // clipping draw loop start
    return tex;
  });
}

function createSkyboxMesh(skybox_texture) {
  var cubeShader = THREE.ShaderLib['cube'];
  cubeShader.uniforms['tCube'].value = skybox_texture;
  var skyBoxMaterial = new THREE.ShaderMaterial({
    fragmentShader: cubeShader.fragmentShader,
    vertexShader: cubeShader.vertexShader,
    uniforms: cubeShader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });
  // BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments)
  var skybox = new THREE.Mesh(new THREE.BoxGeometry(3000, 3000, 3000, 1, 1, 1), skyBoxMaterial);
  return skybox;
}

function createFisheyeMesh(fisheye_texture) {
  // 正方形テクスチャを仮定
  // SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength)
  var 球体 = new THREE.SphereGeometry(800, 16, 16, 0, Math.PI);
  var vertices = 球体.vertices;
  var faces = 球体.faces;
  var faceVertexUvs = 球体.faceVertexUvs;

  var radius = 球体.boundingSphere.radius;
  // 半球の正射影をとる
  faces.forEach(function (face, i) {
    var a = face.a;
    var b = face.b;
    var c = face.c;

    faceVertexUvs[0][i] = [a, b, c].map(function (id) {
      var _vertices$id = vertices[id];
      var x = _vertices$id.x;
      var y = _vertices$id.y;

      return new THREE.Vector2((x + radius) / (2 * radius), (y + radius) / (2 * radius));
    });
  });
  var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide });
  var 完全な白い球体 = new THREE.Mesh(球体, mat);
  完全な白い球体.rotation.x = Math.PI * 3 / 2; // 北緯側の半球になるように回転
  return 完全な白い球体;
}

function createPanoramaMesh() {
  var panorama_width = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  var R1_ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var R2_ratio = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

  //const panorama_width = 400; パノラマ板ポリの空間上の横幅、デフォルトはR2の円周の長さ
  //const R1_ratio = 0; // 扇型の下弦 0~1
  //const R2_ratio = 1; // 扇型の上弦 0~1 下弦 < 上弦
  return function _createPanoramaMesh(fisheye_texture) {
    // 正方形テクスチャを仮定
    var _ref5 = function () {
      // fisheye -> panorama のパノラマのw/hアスペクト比を計算
      var _fisheye_texture$imag = fisheye_texture.image;
      var width = _fisheye_texture$imag.width;
      var height = _fisheye_texture$imag.height;
      var Hs = width;
      var Ws = height; // fisheye 画像短径

      var Cx = Ws / 2;
      var Cy = Hs / 2; // fisheye 中心座標

      var R = Hs / 2; // 中心座標からの半径
      var R1 = R * R1_ratio;
      var R2 = R * R2_ratio; // fisheye から ドーナッツ状に切り取る領域を決める半径二つ

      var Wd = (R2 + R1) * Math.PI;
      var Hd = R2 - R1; // ドーナッツ状に切り取った領域を短径に変換した大きさ

      return { height: Hd, width: Wd };
    }();

    var width = _ref5.width;
    var height = _ref5.height;

    var h_per_w_ratio = height / width;
    // panorama_width の デフォルト値設定
    if (panorama_width < 0) {
      panorama_width = width;
    }
    var モノリス = new THREE.PlaneGeometry(panorama_width, panorama_width * h_per_w_ratio, 32, 32);
    var vertices = モノリス.vertices;
    var faces = モノリス.faces;
    var faceVertexUvs = モノリス.faceVertexUvs;
    // UVを扇型に変換

    var Hs = 1;
    var Ws = 1; // UV のサイズ

    var Cx = Ws / 2;
    var Cy = Hs / 2; // UV の中心座標

    var R = Hs / 2; // 中心座標からの半径
    var R1 = R * R1_ratio;
    var R2 = R * R2_ratio; // UV からドーナッツ状に切り取る領域を決める半径二つ

    var Wd = 1;
    var Hd = 1; // ドーナッツ状に切り取った領域を短径に変換した大きさ

    faceVertexUvs[0] = faceVertexUvs[0].map(function (pt2Dx3) {
      return pt2Dx3.map(function (_ref6) {
        var x = _ref6.x;
        var y = _ref6.y;
        var xD = x;
        var yD = y;

        var r = yD / Hd * (R2 - R1) + R1;
        var theta = xD / Wd * 2.0 * Math.PI;
        var xS = Cx + r * Math.sin(theta);
        var yS = Cy + r * Math.cos(theta);
        return new THREE.Vector2(xS, yS);
      });
    });
    var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: fisheye_texture });
    var 漆黒のモノリス = new THREE.Mesh(モノリス, mat);
    漆黒のモノリス.rotation.x = Math.PI; // 北緯側の半球になるように回転
    漆黒のモノリス.rotation.y = Math.PI; // こっちむいてベイビー
    漆黒のモノリス.position.z = -panorama_width; // カメラからの距離
    return 漆黒のモノリス;
  };
}

function create_camera(type) {
  // カメラ初期値
  var camera = type === "orthographic"
  // 画角, アスペクト比、視程近距離、視程遠距離
  ? new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 1, 10000)
  // left, right, top, bottom, near, far
  : new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);

  camera.position.z = 0.01;

  return camera;
}

function updateAngleOfView(camera, renderer, mesh) {
  if (camera instanceof THREE.PerspectiveCamera) {
    // 普通のカメラ
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else if (camera instanceof THREE.OrthographicCamera && mesh instanceof THREE.Mesh && mesh.geometry instanceof THREE.PlaneGeometry) {
    // 並行投影 + クリッピング
    var _mesh$geometry$parame = mesh.geometry.parameters;
    var width = _mesh$geometry$parame.width;
    var height = _mesh$geometry$parame.height;

    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  } else if (camera instanceof THREE.OrthographicCamera) {
    // 単純並行投影
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function recorder(canvas) {
  // 録画準備
  var stream = canvas.captureStream(30); // fps
  var recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs="vp8, opus"' });
  var chunks = [];
  recorder.ondataavailable = function (ev) {
    chunks.push(ev.data);
  };
  function getBlob() {
    var blob = new Blob(chunks, { 'type': 'video/webm' });
    chunks = [];
    return blob;
  }
  return { stream: stream, recorder: recorder, chunks: chunks, getBlob: getBlob };
}

function _main() {
  var container = document.body;

  var stats = new Stats();
  stats.showPanel(0); // FPS測る
  container.appendChild(stats.dom);

  var scene = new THREE.Scene();
  var renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // 素材ロード
  // const src = "2016-10-18-123734.jpg";
  var src = "2016-10-18-16.29.01.png";
  var webm = "2016-10-18-123529.webm";
  Promise.all([
  // カメラをひとつ選択
  create_camera("perspective"),
  //create_camera("orthographic"),
  // 空をひとつ選択
  load_skybox_texture('textures/cube/Park3Med/').then(createSkyboxMesh), // 夜の住宅街
  //load_skybox_texture('textures/cube/SwedishRoyalCastle/').then(createSkyboxMesh), // 夜のお城
  //load_skybox_texture('textures/cube/skybox/').then(createSkyboxMesh),             // 空
  // 魚眼素材と表示方法をひとつ選択
  load_fisheye_image_canvas_texture(src).then(createFisheyeMesh)]).then(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 3);

    var camera = _ref8[0];
    var skybox = _ref8[1];
    var mesh = _ref8[2];

    // 画角初期化
    updateAngleOfView(camera, renderer, mesh);

    // カメラポーズのコントローラ
    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = false;

    // 全画面表示のリサイズに応じて画角調整
    window.addEventListener('resize', function () {
      updateAngleOfView(camera, renderer, mesh);
    }, false);

    scene.add(camera);
    scene.add(skybox);
    scene.add(mesh);

    // レンダリングループ
    function _loop() {
      stats.begin();

      // カメラポーズ更新
      controls.update();
      renderer.render(scene, camera);

      stats.end();
      requestAnimationFrame(_loop);
    }

    requestAnimationFrame(_loop);
  }).catch(console.error.bind(console));
}

function main() {
  window.THREE = THREE;
  window.$ = $;
  $(_main);
}