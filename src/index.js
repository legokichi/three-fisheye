const THREE = require("three");
const TrackballControls = require('three-trackballcontrols');
const $     = require("jquery");
const Stats = require("stats.js");
window.THREE = THREE;
window.$ = $;

function load_video_texture() {
  const video = document.createElement("video");
  return new Promise((resolve, reject)=>{
    video.src = "./2016-10-18-120852.webm";
    video.addEventListener("loadeddata", function listener(){
      video.removeEventListener("loadeddata", listener);
      video.loop = true;
      video.play();
      const {videoWidth, videoHeight} = video;
      console.log("video size:", {videoWidth, videoHeight});
      resolve(new THREE.VideoTexture( video ));
    });
  });
}

function load_texture() {
  const texLoader = new THREE.TextureLoader();
  return new Promise((resolve, reject)=>{
    texLoader.load("./2016-10-18-16.29.01.png", resolve, (xhr) => {}, reject )
  });
}


function three_setup(texture){
  console.log(texture);
  //texture.wrapS = THREE.RepeatWrapping; // You do not need to set `.wrapT` in this case
  //texture.offset.x = 20 / ( 2 * Math.PI );
  //texture.offset.x = 0.5;
  //texture.mapping = THREE.SphericalReflectionMapping
  //texture.wrapS = THREE.MirroredRepeatWrapping;
  //texture.wrapT = THREE.MirroredRepeatWrapping;
  
  
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer();
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  const camera = new THREE.PerspectiveCamera( 100, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.z = 0.1;

  scene.add(camera);

  const 球体 = new THREE.SphereGeometry(200, 16, 16, 0, Math.PI*2);
  const 白い = new THREE.MeshBasicMaterial( { map:texture, color: 0xFFFFFF } );
  
  白い.side = THREE.DoubleSide;

  const 完全な白い球体 = new THREE.Mesh(球体, 白い);
  
  完全な白い球体.rotation.x = Math.PI;
  scene.add(完全な白い球体);

  const pointLight = new THREE.PointLight(0xFFFFFF);

  pointLight.position.x = 10;
  pointLight.position.y = 50;
  pointLight.position.z = 130;
  scene.add(pointLight);
  

  
  return Promise.resolve({ scene, camera, renderer, 完全な白い球体 });
}

function main(){
  const container = document.body;
  const stats = new Stats();
  stats.showPanel( 0 );
  container.appendChild( stats.dom );

  load_video_texture()
  .then(three_setup)
  .then(({ scene, camera, renderer, 完全な白い球体 })=>{
    container.appendChild(renderer.domElement);

    const controls = new TrackballControls(camera);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = true;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', ()=>{
      console.log("change");
    });

    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
      controls.handleResize();
      render();
    }, false);
    
    function render(){
      controls.update();
      renderer.render(scene, camera);
    }

    function _loop(){
      stats.begin();
      render();
      requestAnimationFrame(_loop);
      stats.end();
    }

    _loop();
  })
  .catch(console.error.bind(console));
}


$(main);
