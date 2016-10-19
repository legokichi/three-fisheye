const THREE = require("three");
const OrbitControls = require('three-orbitcontrols');
const $     = require("jquery");
const Stats = require("stats.js");
window.THREE = THREE;
window.$ = $;

function load_video_texture(url) {
  const video = document.createElement("video");
  return new Promise((resolve, reject)=>{
    video.src = url;
    video.addEventListener("loadeddata", function listener(){
      video.removeEventListener("loadeddata", listener);
      video.loop = true;
      video.play();
      const {videoWidth, videoHeight} = video;
      resolve(new THREE.VideoTexture( video ));
    });
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
  const 球体 = new THREE.SphereGeometry(40, 16, 16, 0, Math.PI);
  const {vertices, faces, faceVertexUvs} = 球体;
  const radius = 球体.boundingSphere.radius;
  faces.forEach((face, i)=>{
    const {a, b, c} = face;
    faceVertexUvs[0][i] = [a, b, c].map((id)=>{
      const vect3 = vertices[id];
      // 正射影
      return new THREE.Vector2(
        (vect3.x+radius)/(2*radius),
        (vect3.y+radius)/(2*radius));
    });
  });
  
  const 完全な白い球体 = new THREE.Mesh(
    球体,
    new THREE.MeshBasicMaterial( { color: 0xFFFFFF, map: fisheye_texture, side: THREE.BackSide } ));
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

  const camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 1, 10000 );
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
    load_video_texture("./2016-10-18-120852.webm").then(createFisheyeMesh),
    //load_texture("./2016-10-18-16.29.01.png").then(createFisheyeMesh),
  ]).then(([skybox, 完全な白い球体])=>{
    scene.add(skybox);
    scene.add(完全な白い球体);
    /*
    const pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 130;
    scene.add(pointLight);*/
  })
  .catch(console.error.bind(console));
}


$(main);
