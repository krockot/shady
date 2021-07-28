Shady is a WebGPU playground.

## Install Dependencies

```
npm install
```

## Run the Dev Server

```
npm start
```

## Enable WebGPU

For Chrome use `--enable-unsafe-webgpu` or enable it from `chrome://flags`.
On Linux you may also need `--enable-features=Vulkan,SkiaRenderer`.

The WebGPU spec is still in development, but this repository should stay
in sync with the latest API changes and work with the current Chrome
Canary release.
