import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./styles/App.module.css";
import { FileType, Status, OptimizationAlgo } from "./Enums";
import ChangeInputFile from "./components/InputOverview";

import Header from "./components/Header.tsx";

let cancelWorker: Worker | null = null;
let algorithmWorker: Worker | null = null;

interface FileChangeEvent extends React.ChangeEvent<HTMLInputElement> {
  target: HTMLInputElement & { files: FileList };
}

function App() {
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [showChangeInput, setShowChangeInput] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(
    new File([""], "swim.json", { type: "application/json" })
  );
  const [error, setError] = useState<string | null>(null);
  // list of available asset files in public/assets (kept in sync manually)
  const assetFiles = [
    "UPLOAD CUSTOM FILE",
    "albano.json",
    "blaz1.json",
    "dagli.json",
    "fu.json",
    "gardeyn0.json",
    "gardeyn0_c.json",
    "gardeyn1.json",
    "gardeyn1_c.json",
    "gardeyn2.json",
    "gardeyn2_c.json",
    "gardeyn3.json",
    "gardeyn3_c.json",
    "gardeyn4.json",
    "gardeyn4_c.json",
    "gardeyn5.json",
    "gardeyn5_c.json",
    "gardeyn6.json",
    "gardeyn6_c.json",
    "gardeyn7.json",
    "gardeyn7_c.json",
    "gardeyn8.json",
    "gardeyn8_c.json",
    "gardeyn9.json",
    "gardeyn9_c.json",
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
  const [selectedAsset, setSelectedAsset] = useState<string>("swim.json");
  const [showLogsInstant, setShowLogsInstant] = useState(true);
  const [showPreviewSvg, setShowPreviewSvg] = useState(true);
  const [timeLimit, setTimeLimit] = useState(600);
  const [seed, setSeed] = useState<bigint | undefined>();
  const [useEarlyTermination, setUseEarlyTermination] = useState(true);
  const [changeInputFile] = useState(false);
  const [optimizationAlgo] = useState(OptimizationAlgo.SPARROW);
  const [nWorkers, setNWorkers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [compressingPhase, setCompressingPhase] = useState(false);

  const logBoxRef = useRef<HTMLDivElement>(null);
  const fileContent = useRef<string | null>(null);

  const [workerKey, setWorkerKey] = useState(0);

  const resetState = () => {
    setSvgResult(null);
    setLogs([]);
    setShowChangeInput(false);
    setLoading(false);
    setCompressingPhase(false);

    if (algorithmWorker) {
      algorithmWorker.terminate();
      algorithmWorker = null;
    }

    if (cancelWorker) {
      cancelWorker.terminate();
      cancelWorker = null;
    }

    setWorkerKey((prevKey) => prevKey + 1);
  };

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
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

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
            showLogsInstant: showLogsInstant,
            showPreviewSvg: showPreviewSvg,
            timeLimit: useEarlyTermination ? undefined : timeLimit,
            seed: seed,
            useEarlyTermination: useEarlyTermination,
            nWorkers: nWorkers,
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

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (timeLimit < 1) {
      setError("Please choose a time limit higher than 0 seconds.");
      return;
    }

    // If user chose an asset (not 'Upload custom file'), load it from public/assets
      if (selectedAsset && selectedAsset !== "UPLOAD CUSTOM FILE") {
  const assetToLoad = selectedAsset;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}/assets/${assetToLoad}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        fileContent.current = await response.text();

        if (changeInputFile) {
          setShowChangeInput(true);
        } else {
          startOptimization(optimizationAlgo, fileContent.current, FileType.JSON);
        }
      } catch (e) {
        setError("Failed to load demo file: " + e);
      }

      return;
    }

    if (file) {
      const readFilePromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };

        reader.onerror = () => {
          reject("Error reading the file. Please try again.");
        };

        reader.readAsText(file);
      });

      try {
        fileContent.current = await readFilePromise;

        if (changeInputFile) {
          setShowChangeInput(true);
        } else {
          startOptimization(optimizationAlgo, fileContent.current, FileType.JSON);
        }
      } catch (error) {
        setError(error as string);
      }
    } else {
      setError("Please upload a file.");
    }
  };

  const handleCancel = (): void => {
    if (cancelWorker) {
      cancelWorker.postMessage({ type: Status.CANCEL, payload: {} });
      setCompressingPhase(true);
    }
  };

  const handleFileChange = (event: FileChangeEvent): void => {
    const uploadedFile: File | null = event.target.files[0];
    if (uploadedFile) {
      if (uploadedFile.type === "application/json") {
        setFile(uploadedFile);
        setError(null);
      } else {
        setError("Please upload a valid JSON file.");
        setFile(null);
      }
    } else {
      setFile(null);
      setError(null);
    }
  };

    // no demo checkbox; asset selection controls which asset is used

  const handleChangeShowLogsInstant = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setShowLogsInstant(event.target.checked);
  };

  const handleChangeShowPreviewSvg = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setShowPreviewSvg(event.target.checked);
  };

  const handleChangeTimeLimit = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      if (value < 1) {
        setTimeLimit(0);
        return;
      }
      setTimeLimit(value);
    } else {
      setTimeLimit(0);
    }
  };

  const handleChangeSeed = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (!event.target.value) {
      setSeed(undefined);
      return;
    }
    setSeed(BigInt(event.target.value));
  };

  const handleChangeUseEarlyTermination = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setUseEarlyTermination(event.target.checked);
  };

  const handleChangeNWorkers = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setNWorkers(value);
    } else {
      setNWorkers(2);
    }
  };

  const downloadSVG = (): void => {
    if (svgResult) {
      const blob = new Blob([svgResult], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = optimizationAlgo + "_sparrowasm.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const buttonTextContent = () => {
    if (changeInputFile) {
      return "Upload file";
    }

    if (compressingPhase) {
      return (
        <>
          <span className={styles.loader} /> Cancel compressing
        </>
      );
    }

    if (loading) {
      return (
        <>
          <span className={styles.loader} /> Cancel exploring
        </>
      );
    }

    return "Optimize";
  };

  if (svgResult) {
    return (
      <>
        <Header onHomeClick={resetState} />
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
                  <span className={styles.loader} /> Cancel exploring
                </>
              ) : (
                <>
                  <span className={styles.loader} /> Cancel compressing
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
              <button type="submit" className={styles.button} onClick={() => resetState()}>
                Start over
              </button>
            </div>
          </>
        )}
        {logs.length > 0 && (
          <div className={styles.logBox} ref={logBoxRef} data-testid="logBox">
            <h4>Logs</h4>
            <ul>
              {logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  if (showChangeInput) {
    return (
      <>
        <Header onHomeClick={resetState} />
        <ChangeInputFile fileContent={fileContent.current} startOptimization={startOptimization} />
        {logs.length > 0 && (
          <div className={styles.logBox} ref={logBoxRef} data-testid="logBox">
            <h4>Logs</h4>
            <ul>
              {logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Header onHomeClick={resetState} />
      <div className={styles.home}>
        <div className={styles.forms}>
          <div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (loading) {
                  handleCancel();
                } else {
                  handleUpload(event);
                }
              }}
              className={styles.form}
            >
              <label className={styles.label} htmlFor="assetSelect">
                Choose an instance to optimize
              </label>

              <select
                id="assetSelect"
                className={styles.algoDropdown}
                value={selectedAsset}
                onChange={(e) => {
                  setSelectedAsset(e.target.value);
                  // if user selects an asset from list, disable demo flag
                  if (e.target.value !== "UPLOAD CUSTOM FILE") {
                    // set file placeholder so UI shows the chosen asset name
                    setFile(new File([""], e.target.value, { type: "application/json" }));
                  } else {
                    // custom upload chosen
                    setFile(null);
                  }
                }}
              >
                {assetFiles.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Show native file chooser only when the user picked 'UPLOAD CUSTOM FILE' */}
              {selectedAsset === "UPLOAD CUSTOM FILE" && (
                <>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleFileChange}
                    className={styles.inputFile}
                  />

                  <span className={styles.checkBoxLabel}>
                    <strong>Currently selected:</strong> {file ? file.name : ""}
                    <br />
                    <small>(To change, select a new file above)</small>
                  </span>
                </>
              )}

              {optimizationAlgo === OptimizationAlgo.SPARROW && (
                <>
                  <label className={styles.checkboxWrapper}>
                    <span className={styles.checkboxLabel}>
                      Live logs
                      <br />
                      <span style={{ fontSize: "0.8em", color: "#888" }}>
                        Causes some speed loss
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showLogsInstant}
                      onChange={handleChangeShowLogsInstant}
                      className={styles.checkbox}
                      data-testid="showLogsInstant"
                    />
                  </label>

                  <label className={styles.checkboxWrapper}>
                    <span className={styles.checkboxLabel}>
                      Preview solution
                      <br />
                      <span style={{ fontSize: "0.8em", color: "#888" }}>
                        Causes minor speed loss
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showPreviewSvg}
                      onChange={handleChangeShowPreviewSvg}
                      className={styles.checkbox}
                      data-testid="showPreviewSvg"
                    />
                  </label>

                  <label className={styles.checkboxWrapper}>
                    <span className={styles.numberLabel}>Auto terminate</span>
                    <input
                      type="checkbox"
                      checked={useEarlyTermination}
                      onChange={handleChangeUseEarlyTermination}
                      className={styles.checkbox}
                      data-testid="earlyTerminationInput"
                    />
                  </label>

                  {!useEarlyTermination && (
                    <label className={styles.checkboxWrapper}>
                      <span className={styles.numberLabel}>Time limit [sec.]</span>

                      <input
                        type="number"
                        value={timeLimit}
                        onChange={handleChangeTimeLimit}
                        className={styles.numberInput}
                        data-testid="timeLimitInput"
                      />
                    </label>
                  )}

                  <label className={styles.checkboxWrapper}>
                    <span className={styles.numberLabel}>RNG seed
                      <br />
                      <span style={{ fontSize: "0.8em", color: "#888" }}>
                        Leave empty for random seed
                      </span>
                    </span>
                    <input
                      type="number"
                      value={seed?.toString() || ""}
                      onChange={handleChangeSeed}
                      className={`${styles.numberInput} ${styles.seedInput}`}
                      data-testid="seedInput"
                    />
                  </label>

                  <label className={styles.checkboxWrapper}>
                    <span className={styles.numberLabel}>Number of workers</span>
                    <input
                      type="number"
                      value={nWorkers}
                      onChange={handleChangeNWorkers}
                      min="1"
                      className={styles.numberInput}
                      data-testid="nWorkersInput"
                    />
                  </label>
                </>
              )}

              <button type="submit" className={styles.button}>
                {buttonTextContent()}
              </button>
            </form>

            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        </div>

        {logs.length > 0 && (
          <div className={styles.logBox} ref={logBoxRef} data-testid="logBox">
            <h4>Logs</h4>
            <ul>
              {logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
