import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./styles/App.module.css";
import { FileType, Status, OptimizationAlgo } from "./Enums";
import Header from "./components/Header.tsx";

let cancelWorker: Worker | null = null;
let algorithmWorker: Worker | null = null;

function Demo() {
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [compressingPhase, setCompressingPhase] = useState(false);

  const logBoxRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const [workerKey] = useState(0);

  // List of available asset files
  const assetFiles = [
    "albano.json",
    "blaz1.json",
    "dagli.json",
    "fu.json",
    "gardeyn0.json",
    // "gardeyn0_c.json",
    "gardeyn1.json",
    // "gardeyn1_c.json",
    "gardeyn2.json",
    // "gardeyn2_c.json",
    "gardeyn3.json",
    // "gardeyn3_c.json",
    "gardeyn4.json",
    // "gardeyn4_c.json",
    "gardeyn5.json",
    // "gardeyn5_c.json",
    "gardeyn6.json",
    // "gardeyn6_c.json",
    "gardeyn7.json",
    // "gardeyn7_c.json",
    "gardeyn8.json",
    // "gardeyn8_c.json",
    "gardeyn9.json",
    // "gardeyn9_c.json",
    "jakobs1.json",
    "jakobs2.json",
    "mao.json",
    "marques.json",
    "shapes0.json",
    "shapes1.json",
    "shirts.json",
    "swim.json",
    "swim_c.json",
    "trousers.json",
  ];

  const getMaxEval = useCallback((logs: string[]): string | null => {
    const regex = /evals\/s:\s*(\d+\.?\d*)/;
    let maxEvalPerSecond = 0;

    logs.forEach((log) => {
      if (log.includes("evals/s")) {
        const value = log.match(regex);
        if (value && parseFloat(value[1]) > maxEvalPerSecond) {
          maxEvalPerSecond = parseFloat(value[1]);
        }
      }
    });

    return maxEvalPerSecond > 0 ? maxEvalPerSecond.toFixed(2) : null;
  }, []);

  useEffect(() => {
    algorithmWorker = new Worker(new URL("./services/algorithmWorker.ts", import.meta.url), {
      type: "module",
    });

    algorithmWorker.onmessage = (event) => {
      if (Array.isArray(event.data)) {
        setLogs((prevLogs: string[]) => [
          ...prevLogs,
          ...event.data.map((entry: { message?: string }) => entry.message ?? String(entry)),
        ]);

        return;
      }

      const { type, message, result } = event.data;

      if (type === Status.INIT_SHARED_MEMORY) {
        initCancelWorker(result.sharedArrayBuffer, result.terminateFlagOffset);

        return;
      }

      if (type === Status.INTERMEDIATE) {
        setSvgResult(result);

        return;
      }

      if (type === Status.FINISHED) {
        setSvgResult(result);

        setLogs((prevLogs) => {
          const logs = [...prevLogs, `Finished`];

          const maxEval = getMaxEval(logs);
          if (maxEval) {
            logs.push(`Max evals/s: ${maxEval} K`);
          }

          return logs;
        });

        setLoading(false);
        setCompressingPhase(false);

        return;
      }

      if (type === Status.ERROR) {
        setLogs((prevLogs) => [...prevLogs, `Error: ${message}`]);
        return;
      }

      setLogs((prevLogs) => [...prevLogs, message]);
    };

    return () => {
      if (algorithmWorker) {
        algorithmWorker.terminate();
        algorithmWorker = null;
      }
    };
  }, [setLogs, setSvgResult, getMaxEval, workerKey]);

  useEffect(() => {
    if (logBoxRef.current) {
      const logBox = logBoxRef.current;
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scrollHeight = logBox.scrollHeight;
          const scrollTop = logBox.scrollTop;
          const clientHeight = logBox.clientHeight;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          
          if (distanceFromBottom <= 500) {
            logBox.scrollTop = scrollHeight;
            
            setTimeout(() => {
              const newDistanceFromBottom = logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight;
              if (newDistanceFromBottom > 5) {
                logBox.scrollTop = logBox.scrollHeight;
              }
            }, 10);
          }
        });
      });
    }
  }, [logs]);

  const scrollToBottom = (): void => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  };

  const startOptimization = (
    optimizationAlgo: OptimizationAlgo,
    input: string,
    fileType: FileType
  ): void => {
    if (algorithmWorker) {
      if (!loading) {
        algorithmWorker.postMessage({
          type: Status.START,
          payload: {
            optimizationAlgo: optimizationAlgo,
            input: input,
            fileType: fileType,
            showLogsInstant: true,
            showPreviewSvg: true,
            timeLimit: undefined,
            seed: undefined,
            useEarlyTermination: true,
            nWorkers: 2,
          },
        });

        setLoading(true);
      }
    }
  };

  const initCancelWorker = (sharedArrayBuffer: SharedArrayBuffer, offset: number): void => {
    cancelWorker = new Worker(new URL("./services/cancelWorker.ts", import.meta.url), {
      type: "module",
    });

    cancelWorker.postMessage({
      type: Status.INIT_SHARED_MEMORY,
      payload: {
        wasmMemoryBuffer: sharedArrayBuffer,
        terminateFlagOffset: offset,
      },
    });
  };

  const handleCancel = (): void => {
    if (cancelWorker) {
      cancelWorker.postMessage({ type: Status.CANCEL, payload: {} });
      setCompressingPhase(true);
    }
  };

  const downloadSVG = (): void => {
    if (svgResult) {
      const blob = new Blob([svgResult], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sparroWASM_demo_solution.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const goToHome = (): void => {
    window.location.href = import.meta.env.BASE_URL || "/";
  };

  // Automatically start optimization with a random file on mount
  useEffect(() => {
    if (!hasStarted.current && algorithmWorker) {
      hasStarted.current = true;
      
      // Select a random asset file
      const randomIndex = Math.floor(Math.random() * assetFiles.length);
      const randomAsset = assetFiles[randomIndex];

      setLogs([`Demo mode: Loading random instance "${randomAsset}"...`]);

      // Load and start optimization
      fetch(`${import.meta.env.BASE_URL}/assets/${randomAsset}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(fileContent => {
          setLogs(prev => [...prev, `Starting optimization...`]);
          startOptimization(OptimizationAlgo.SPARROW, fileContent, FileType.JSON);
        })
        .catch(error => {
          setLogs(prev => [...prev, `Error loading demo file: ${error}`]);
        });
    }
  }, [algorithmWorker]);

  if (svgResult) {
    return (
      <>
        <Header onHomeClick={goToHome} />
        <div dangerouslySetInnerHTML={{ __html: svgResult }} className={styles.svgBox} />
        {loading && (
          <div className={styles.processing}>
            <button
              type="submit"
              className={styles.button}
              onClick={() => handleCancel()}
              style={{ marginTop: "0" }}
            >
              {!compressingPhase ? (
                <>
                  <span className={styles.loader} /> Terminate phase
                </>
              ) : (
                <>
                  <span className={styles.loader} /> Terminate phase
                </>
              )}
            </button>
          </div>
        )}
        {!loading && (
          <>
            <div className={styles.processing}>
              <button type="submit" className={styles.button} onClick={() => downloadSVG()}>
                Download SVG
              </button>
            </div>

            <div className={styles.processing}>
              <button type="submit" className={styles.button} onClick={() => goToHome()}>
                Start over
              </button>
            </div>
          </>
        )}
        {logs.length > 0 && (
          <div className={styles.logBoxContainer}>
            <button type="button" className={styles.scrollToBottomBtn} onClick={scrollToBottom}>
              ↓ Scroll to bottom
            </button>
            <div className={styles.logBox} ref={logBoxRef} data-testid="logBox">
              <h4>Logs</h4>
              <ul>
                {logs.map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Header onHomeClick={goToHome} />
      <div className={styles.home}>
        <div className={styles.forms}>
          <div className={styles.form}>
            <h2>Demo Mode</h2>
            <p>Automatically optimizing a random instance...</p>
            {loading && (
              <button
                type="button"
                className={styles.button}
                onClick={() => handleCancel()}
              >
                {!compressingPhase ? (
                  <>
                    <span className={styles.loader} /> Cancel phase
                  </>
                ) : (
                  <>
                    <span className={styles.loader} /> Terminate phase
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {logs.length > 0 && (
          <div className={styles.logBoxContainer}>
            <button type="button" className={styles.scrollToBottomBtn} onClick={scrollToBottom}>
              ↓ Scroll to bottom
            </button>
            <div className={styles.logBox} ref={logBoxRef} data-testid="logBox">
              <h4>Logs</h4>
              <ul>
                {logs.map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Demo;
