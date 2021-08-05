Shady is a WebGPU playground. You can preview it at
<https://krockot.github.io/shady>.

WebGPU must be enabled for the application to work. Either wait until the WebGPU
Origin Trial begins and use Chrome M94, or enable WebGPU locally by following
the instructions below.

## Enabling WebGPU

### Chrome

For Chrome use `--enable-unsafe-webgpu` or enable it from `chrome://flags`.

On Linux you may also need `--enable-features=Vulkan,UseSkiaRenderer`. Note that
Linux support is incomplete at the moment, so it's better to test on Windows or
Mac.

The WebGPU spec is still in development, but this repository should stay
in sync with the latest API changes and work with the current Chrome
Canary release.

### Firefox

Firefox Nightly *may* also work with `dom.webgpu.enabled` and
`gfx.webrender.all` set in `about:config`, but as of this writing the API is
lagging behind the spec enough to be broken. To wit, at least the following
are out of date:

* GPUCanvasContext acquisition
* Device loss handling
* Swap chain configuration

## Local Deployment

If you want to hack on the repository and run the dev server locally, it's a
standard Node toolchain. From a local checkout, install dependencies:

```
npm install
```

And then run the dev server:

```
npm start
```
