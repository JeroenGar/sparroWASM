import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function getGitCommitHash(): string {
  try {
    const hash = execSync("git rev-parse HEAD").toString().trim();
    return hash;
  } catch (error) {
    console.error("Failed to get git commit hash:", error);
    return "unknown";
  }
}

function getCpuModel(): string {
  try {
    const cpus = os.cpus();
    return cpus.length > 0 ? cpus[0].model : "unknown";
  } catch (error) {
    console.error("Failed to get CPU model:", error);
    return "unknown";
  }
}

function createResultsFile() {
  const resultsLocalFilePath = path.join("./", "results", "benchmark_results_local.csv");
  const resultsRemoteFilePath = path.join("./", "results", "benchmark_results_wasm.csv");

  fs.mkdirSync(path.dirname(resultsLocalFilePath), { recursive: true });
  fs.mkdirSync(path.dirname(resultsRemoteFilePath), { recursive: true });

  if (!fs.existsSync(resultsLocalFilePath)) {
    const logEntryHeader = `Timestamp;BenchConfiguration;Run;Browser;CPU;CommitHash;Max evals/s\n`;
    fs.appendFileSync(resultsLocalFilePath, logEntryHeader);
  }

  if (!fs.existsSync(resultsRemoteFilePath)) {
    const logEntryHeader = `Timestamp;BenchConfiguration;Run;Browser;CPU;CommitHash;RunningTime\n`;
    fs.appendFileSync(resultsRemoteFilePath, logEntryHeader);
  }
}

async function globalSetup() {
  const commitHash = getGitCommitHash();
  const cpuModel = getCpuModel();

  process.env.GIT_COMMIT_HASH = commitHash;
  process.env.CPU_MODEL = cpuModel;
  console.log(`Current Git Commit Hash: ${process.env.GIT_COMMIT_HASH}`);
  console.log(`Current CPU Model: ${process.env.CPU_MODEL}`);

  createResultsFile();
}

export default globalSetup;
