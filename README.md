# NESTASM

## DEVELOPMENT

### WASM-PACK

- [Vite plugin WASM](https://github.com/Menci/vite-plugin-wasm)
- [Rust WASM](https://github.com/rustwasm/wasm-pack)

Install: `cargo install wasm-pack`  
BuildRelease : `wasm-pack build --target web --out-dir ../src/wasm`  
Build Dev: `wasm-pack build --dev --target web --out-dir ../src/wasm`

Ook _Clang_ nodig om foutmelding te vermijden: [LLVM](https://github.com/llvm/llvm-project)

### WASM Changes

- `getrandom = { version = "0.3", features = ["wasm_js"] }` in `Cargo.toml`

In `.cargo/config.toml`

```toml
# .cargo/config.toml
[target.wasm32-unknown-unknown]
rustflags = ["--cfg", "getrandom_backend=\"wasm_js\""]
```

### FRONTEND

- [React TSX](https://react.dev/)
- [Vite](https://vite.dev/)
  - [Vite SVGR](https://www.npmjs.com/package/vite-plugin-svgr): plugin to transform SVG's into React components
- [D3.js](https://d3js.org/): manipulating SVG's

Start development server: `npm run dev`

### PLAYWRIGHT (Testing/Benching)

Limited to one worker  
Writes results to `benchmark_result.txt`

`npx playwright test speed`  
`npx playwright test speed --project chromium`

### BACKEND SERVER (deprecated)

See [README.md](./gui/server/README.md)

## TIPS & TRICKS

### JAGUA-RS

[docs](https://jeroengar.github.io/jagua-rs/jagua_rs/index.html)

### LBF

`cd lbf`  
`cargo run --release -- -i ../assets/swim.json -p spp -c ../assets/config_lbf.json -s ../solutions`

### SPARROW

`cd sparrow`
`cargo run --release -- -i data/input/swim.json`  
`cargo run --release -- -i data/input/swim.json -x`: early termination  
`cargo run --release --features=live_svg -- -i data/input/swim.json`
