# three-fisheye

# install

```
npm install three-fisheye --save
```

# features

## original Fisheye

![](https://github.com/legokichi/three-fisheye/raw/master/test/WellsCathedral-28F12wyrdlight.png?raw=true)

## Perspective

![](https://github.com/legokichi/three-fisheye/raw/master/test/WellsCathedral-28F12wyrdlight.perspective.png?raw=true)

## Equirectangular

![](https://github.com/legokichi/three-fisheye/raw/master/test/WellsCathedral-28F12wyrdlight.equirectangular.png?raw=true)

# stable API

```ts
abstract class Fisheye{
  /** source */
  src: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | null;

  /** ajast center */
  centerX: number;
  centerY: number;
  radius: number;

  /** GL canvas */
  canvas: HTMLCanvasElement;

  /** canvas size */
  width: number;
  height: number;

  destructor(): void;
  render(): void;
}

class Fisheye2Perspective extends Fisheye {
  /** direction of view */
  pitch: number;
  yaw: number;
  zoom: number;
  constructor();
  drag(type: "start" | "move", offsetX: number, offsetY: number): any;
}

class Fisheye2Equirectangular extends Fisheye{
  constructor();
}
```

# usage

see `src/test.ts` and `src/example_perspective.ts`


# develop

```sh
npm run setup # install cli tools
npm run init  # install libraries
npm run build # build js code
npm run lint  # tslint
npm run doc   # typedoc
npm run check # type check
npm run test  # build test
npm run example # build example
```

# license

MIT

