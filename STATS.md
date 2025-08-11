# STATS

## WEB

Met logs [evals/s] (d532aa9e186e51a7c0f33eebf13cdceecb695a3c)
84.91 | 80.25 | 82.30

Zonder logs: BUFFER [evals/s] (d6ebdb6bfdefeac3cc98fd8c17cdeda0d636bcb2)
94.36 | 107.26 | 115.74 | 133.35

Single Threaded (geen initThreadPool) [evals/s]
139.61 | 135.32 | 112.25

Slechts 1 worker [eval/s]
77.78 | 101.31 | 62.43 | 60.58

## NATIVE

3 Workers (25-30% CPU usage)
180 | 190 | 200

1 Worker [eval/s] (10% CPU usage)
130 | 90 | 110

# WASM OPT: 04 & -g

60% van native speed

fastmath approx library (misschien)

SIMD

arc er uit

op een plek std:time reexporten (in lib.rs)

## 30/06/2025 - MAX EVAL ipv avgEval - 8 web threads - 3 separator threads

### DEVELOPER TOOLS NIET OPENEN

- https://www.reddit.com/r/WebAssembly/comments/kk9vuv/webassembly_much_slower_than_js_in_this_benchmark/
- https://developer.chrome.com/blog/wasm-debugging-2020?hl=nl#profiling

### TIMING

Met logs [evals/s] (d532aa9e186e51a7c0f33eebf13cdceecb695a3c)
244.0 | 244.0 |233.0 | 231.0

Zonder logs: BUFFER [evals/s] (d6ebdb6bfdefeac3cc98fd8c17cdeda0d636bcb2)
381.0 | 340 | 327 | 430 | 434 (redelijk onconsistent)

SIMD feature enabled in sparrow
377 | 379 | 362 | 337

WASM-OPT: wasm-opt = ["-O4"]

### Profiling

Build wasm-pack --dev
Gebruik Firefox  
Kan je volledig stack chart zien dan
