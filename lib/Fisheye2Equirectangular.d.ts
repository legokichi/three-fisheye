/// <reference types="three" />
import * as THREE from "three";
import { Fisheye } from "./Fisheye";
/**
 * Equirectangular Cylindrical Mercator
* http://wiki.panotools.org/Projections
*/
export declare class Fisheye2Equirectangular extends Fisheye<THREE.OrthographicCamera> {
    protected mesh_num: number;
    private meshes;
    private texis;
    constructor(o?: {});
    render(): void;
    protected load(): void;
    protected unload(): void;
    drag(type: "start" | "move", offsetX: number, offsetY: number): void;
}
export declare function createPanoramaMesh(fisheye_texture: any, panorama_width?: number, R1_ratio?: number, R2_ratio?: number): THREE.Mesh;
