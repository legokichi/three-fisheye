"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var THREE = require("three");
var Fisheye_1 = require("./Fisheye");
var Equirectangular2Fisheye = (function (_super) {
    __extends(Equirectangular2Fisheye, _super);
    function Equirectangular2Fisheye(o) {
        var _this = this;
        // left, right, top, bottom, near, far
        var camera = new THREE.OrthographicCamera(600 / -2, 600 / 2, 400 / 2, 400 / -2, 1, 10000);
        camera.position.z = 0.01;
        _this = _super.call(this, camera, o) || this;
        _this.meshes = [];
        _this.texis = [];
        return _this;
    }
    Equirectangular2Fisheye.prototype.render = function () {
        var source = this.src;
        if (source == null) {
            return;
        }
        this.texctx.canvas.width = this.texctx.canvas.width;
        var w = source.width, h = source.height;
        if (source instanceof HTMLVideoElement) {
            w = source.videoWidth;
            h = source.videoHeight;
        }
        this.texctx.drawImage(source, 0, 0, w, h, 0, 0, this.texctx.canvas.width, this.texctx.canvas.height);
        this.texis.forEach(function (tex) { tex.needsUpdate = true; });
        this.renderer.render(this.scene, this.camera);
    };
    Equirectangular2Fisheye.prototype.load = function () {
        var source = this.src;
        if (source == null) {
            return;
        }
        this.unload(); // 以前のパノラマを消す
        var w = source.width, h = source.height;
        if (source instanceof HTMLVideoElement) {
            w = source.videoWidth;
            h = source.videoHeight;
        }
        this.texctx.canvas.width = h;
        this.texctx.canvas.height = h;
        var tex = new THREE.Texture(this.texctx.canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        //tex.offset.set( 0, 0 );
        tex.repeat.set(1, 1);
        var mesh = createFisheyeMesh(tex);
        var _a = mesh.geometry.parameters, width = _a.width, height = _a.height;
        this.renderer.setSize(width, height);
        this.camera.left = width / -2;
        this.camera.right = width / 2;
        this.camera.top = height / 2;
        this.camera.bottom = height / -2;
        this.camera.updateProjectionMatrix();
        this.scene.add(mesh);
        this.meshes.push(mesh);
        this.texis.push(tex);
    };
    Equirectangular2Fisheye.prototype.unload = function () {
        var _this = this;
        this.meshes.forEach(function (mesh) {
            _this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.texis.forEach(function (tex) {
            tex.dispose();
        });
        this.meshes = [];
        this.texis = [];
    };
    Equirectangular2Fisheye.prototype.drag = function (type, offsetX, offsetY) {
    };
    return Equirectangular2Fisheye;
}(Fisheye_1.Fisheye));
exports.Equirectangular2Fisheye = Equirectangular2Fisheye;
function createFisheyeMesh(tex, R1_ratio, R2_ratio) {
    if (R1_ratio === void 0) { R1_ratio = 0; }
    if (R2_ratio === void 0) { R2_ratio = 1; }
    var img = tex.image;
    var width = img.width, height = img.height;
    var fish_plane = new THREE.PlaneGeometry(height * 2, height * 2, 32, 32);
    var vertices = fish_plane.vertices, faces = fish_plane.faces, faceVertexUvs = fish_plane.faceVertexUvs;
    faceVertexUvs[0] = faceVertexUvs[0].map(function (pt2Dx3) {
        return pt2Dx3.map(function (_a) {
            var x = _a.x, y = _a.y;
            var _b = [x, y], xD = _b[0], yD = _b[1];
            var _c = Fisheye_1.fisheye2equirectangular(xD, yD), s = _c[0], t = _c[1];
            return new THREE.Vector2(s, t);
        });
    });
    var mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, map: tex, side: THREE.DoubleSide });
    var fish_mesh = new THREE.Mesh(fish_plane, mat);
    fish_mesh.rotation.z = -Math.PI / 2;
    fish_mesh.position.z = -800; // カメラからの距離
    return fish_mesh;
}
exports.createFisheyeMesh = createFisheyeMesh;
