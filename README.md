# sparroWASM

Run [`sparrow`](https://github.com/JeroenGar/sparrow) in any browser with WebAssembly:
<br>
[**https://jeroengar.github.io/sparroWASM**](https://jeroengar.github.io/sparroWASM)

[UNDER DEVELOPMENT]

## Prerequisites
- Rust
- Node.js
- wasm-pack & npm packages: `cargo install wasm-pack && npm install`


## Build and Run
```
wasm-pack build --target web --release
npm run build
npm run preview -- --host
```