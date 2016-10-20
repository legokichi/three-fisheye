const THREE = require("three");
const OrbitControls = require('three-orbitcontrols');
const $     = require("jquery");
const Stats = require("stats.js");
window.THREE = THREE;
window.$ = $;

function load_video(url) {
  const video = document.createElement("video");
  return new Promise((resolve, reject)=>{
    video.src = url;
    video.addEventListener("loadeddata", function listener(){
      video.removeEventListener("loadeddata", listener);
      resolve( video );
    });
  });
}

function load_video_texture(url) {
  return load_video(url).then((video)=>{
    video.loop = true;
    video.play();
    return new THREE.VideoTexture( video );
  });
}

function load_texture(url) {
  return new Promise((resolve, reject)=>{
    const loader = new THREE.TextureLoader();
    loader.load(url, resolve, (xhr) => {}, reject );
  });
}

function load_skybox_texture(urls){
  return new Promise((resolve, reject)=>{
    const loader = new THREE.CubeTextureLoader();
    loader.setPath(urls);
    loader.load( [
      'px.jpg', 'nx.jpg',
      'py.jpg', 'ny.jpg',
      'pz.jpg', 'nz.jpg'
    ], resolve, (xhr) => {}, reject );
  });
}


function load_clipped_video_canvas_texture(url){
  return load_video(url).then((video)=>{
    const cnv = document.createElement("canvas");
    const ctx = cnv.getContext("2d");
    const {videoWidth, videoHeight} = video;
    const min = Math.min(videoWidth, videoHeight);
    const max = Math.max(videoWidth, videoHeight);
    for(var i=0; min > Math.pow(2, i); i++); // 2^n の大きさを得る
    let pow = Math.pow(2, i-1);
    const [dx, dy, dw, dh] = [0, 0, pow, pow]; // 縮小先の大きさ
    const [sx, sy, sw, sh] = videoWidth < videoHeight ? [0, (max/2)-(min/2), min, min] // ソースのクリッピング領域
                                                      : [(max/2)-(min/2), 0, min, min];
    cnv.width = cnv.height = pow;
    const tex = new THREE.Texture(cnv);
    let paused = false;
    video.addEventListener("playing", (ev)=>{ paused = false; requestAnimationFrame(_draw) });
    video.addEventListener("pause", (ev)=>{ paused = true; });
    video.addEventListener("ended", (ev)=>{ paused = true; });
    function _draw(){
      cnv.width = cnv.width;
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      tex.needsUpdate = true;
      if(!paused) requestAnimationFrame(_draw);
    }
    video.loop = true;
    video.play();
    _draw(); // clipping draw loop start
    return tex;
  });
}



function createSkyboxMesh(skybox_texture){
  const cubeShader = THREE.ShaderLib[ 'cube' ];
  cubeShader.uniforms[ 'tCube' ].value = skybox_texture;
  const skyBoxMaterial = new THREE.ShaderMaterial({
    fragmentShader: cubeShader.fragmentShader,
    vertexShader: cubeShader.vertexShader,
    uniforms: cubeShader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });
  const skybox = new THREE.Mesh( new THREE.BoxGeometry( 1000, 1000, 1000, 1, 1, 1 ), skyBoxMaterial);
  return skybox;
}

function createFisheyeMesh(fisheye_texture){
  const 球体 = new THREE.SphereGeometry(800, 16, 16, 0, Math.PI);
  const {vertices, faces, faceVertexUvs} = 球体;
  const radius = 球体.boundingSphere.radius;
  // 半球の正射影をとる
  faces.forEach((face, i)=>{
    const {a, b, c} = face;
    faceVertexUvs[0][i] = [a, b, c].map((id)=>{
      const vect3 = vertices[id];
      return new THREE.Vector2(
        (vect3.x+radius)/(2*radius),
        (vect3.y+radius)/(2*radius));
    });
  });
  
  const mat = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide } );
  //mat.needsUpdate = true;
  //console.log(mat.needsUpdate)
  const 完全な白い球体 = new THREE.Mesh(球体, mat);
  完全な白い球体.rotation.x = Math.PI*3/2; // 北緯側の半球になるように回転
  return 完全な白い球体;
}

function main(){
  const container = document.body;

  const stats = new Stats();
  stats.showPanel( 0 ); // FPS測る
  container.appendChild( stats.dom );

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  // 画角, アスペクト比、視程近距離、視程遠距離
  const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.z = 0.01;
  scene.add(camera);

  // カメラポーズのコントローラ
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = false;
  
  window.addEventListener('resize', function() { // 全画面表示のリサイズ
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }, false);
  

  function _loop(){ // レンダリングループ
    stats.begin();

    // カメラポーズ更新
    controls.update();
    renderer.render(scene, camera);

    stats.end();
    requestAnimationFrame(_loop);
  }
  requestAnimationFrame(_loop);

  // 素材の遅延ロード
  Promise.all([
    load_skybox_texture('textures/cube/skybox/').then(createSkyboxMesh),
    //load_video_texture("./2016-10-18-120852.webm").then(createFisheyeMesh),
    load_clipped_video_canvas_texture("./2016-10-18-120852.webm").then(createFisheyeMesh),
    //load_texture("./2016-10-18-16.29.01.png").then(createFisheyeMesh),
  ]).then(([skybox, 完全な白い球体])=>{
    scene.add(skybox);
    scene.add(完全な白い球体);
  })
  .catch(console.error.bind(console));
}


$(main);
