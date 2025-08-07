import { FileType, Status, OptimizationAlgo } from "../Enums";

import initWasm, * as wasm from "../wasm/wasm_jagua_rs";

let wasmInitialized = false;

self.onmessage = async (event) => {
  const { type, payload } = event.data;
  const numThreads = payload.nWorkers;

  if (!wasmInitialized) {
    try {
      const wasmInstance = await initWasm();
      wasmInitialized = true;

      try {
        // Level of logging to apply in the WASM module
        // 0 => Off,
        // 1 => Error,
        // 2 => Warn,
        // 3 => Info,
        // 4 => Debug,
        // 5 => Trace,
        await wasm.init_logger(5, payload.showLogsInstant);
        self.postMessage({
          type: Status.PROCESSING,
          message: `Wasm logger successfully initialized`,
        });
      } catch (logger_err) {
        console.error("Failed to apply WASM logger:", logger_err);
      }

      try {
        await wasm.initThreadPool(numThreads);
        self.postMessage({
          type: Status.PROCESSING,
          message: `Wasm thread pool successfully initialized with ${numThreads} threads`,
        });
      } catch (thread_err) {
        console.error("Failed to initialize WASM thread pool:", thread_err);
        self.postMessage({
          type: Status.PROCESSING,
          message: `Failed to initialize WASM thread pool: ${thread_err}`,
        });
      }

      const wasmMemoryBuffer = wasmInstance.memory.buffer;

      if (!(wasmMemoryBuffer instanceof SharedArrayBuffer)) {
        throw new Error("WASM memory is not a SharedArrayBuffer! Check headers and build flags.");
      }

      const offset = wasm.get_terminate_flag_offset();

      self.postMessage({
        type: Status.INIT_SHARED_MEMORY,
        message: "Worker: Shared memory initialized successfully.",
        result: {
          sharedArrayBuffer: wasmMemoryBuffer,
          terminateFlagOffset: offset,
        },
      });
    } catch (e) {
      self.postMessage({ type: Status.ERROR, message: "Wasm initialization failed: " + e });
      return;
    }
  }

  if (type === Status.START) {
    self.postMessage({ type: Status.PROCESSING, message: `Wasm computation started` });
    const input = payload.input;

    try {
      if (payload.fileType === FileType.SVG) {
        wasm.svg_collision_test(input);
      } else if (payload.fileType === FileType.JSON) {
        if (payload.optimizationAlgo === OptimizationAlgo.LBF) {
          wasm.run_lbf(input);
        } else if (payload.optimizationAlgo === OptimizationAlgo.SPARROW) {
          let timeLimitBigint: bigint | undefined;
          if (payload.timeLimit) {
            timeLimitBigint = BigInt(payload.timeLimit);
          }
          wasm.run_sparrow(
            input,
            payload.showPreviewSvg,
            timeLimitBigint,
            payload.seed,
            payload.useEarlyTermination,
            payload.nWorkers
          );
        }
      }
    } catch (e) {
      self.postMessage({ type: Status.ERROR, message: `Wasm computation failed: ` + e });
    }
  }
};
