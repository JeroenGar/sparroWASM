import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const resultsFilePath = path.join("./", "results", "benchmark_results_wasm.csv");
const url = "https://waterboy1602.github.io/nestasm/";
/**
 * This test measures the speed of the Wasm optimization process.
 * Without live logs
 * Without preview SVG view
 * Time limit: 60 seconds
 */
test("Speed - Config 1", async ({ page }) => {
  await page.goto(url);

  const showLogsInstantCheckbox = await page.getByTestId("showLogsInstant");
  await expect(showLogsInstantCheckbox).toBeVisible();
  await showLogsInstantCheckbox.uncheck();

  const showPreviewSvgCheckbox = await page.getByTestId("showPreviewSvg");
  await expect(showPreviewSvgCheckbox).toBeVisible();
  await showPreviewSvgCheckbox.uncheck();

  await startOptimization(page, 1);
});

/**
 * This test measures the speed of the Wasm optimization process.
 * With live logs
 * Without preview SVG view
 * Time limit: 60 seconds
 */
test("Speed - Config 2", async ({ page }) => {
  await page.goto(url);

  const showLogsInstantCheckbox = await page.getByTestId("showLogsInstant");
  await expect(showLogsInstantCheckbox).toBeVisible();
  await showLogsInstantCheckbox.check();

  const showPreviewSvgCheckbox = await page.getByTestId("showPreviewSvg");
  await expect(showPreviewSvgCheckbox).toBeVisible();
  await showPreviewSvgCheckbox.uncheck();

  await startOptimization(page, 2);
});

/**
 * This test measures the speed of the Wasm optimization process.
 * Without live logs
 * With preview SVG view
 * Time limit: 60 seconds
 */
test("Speed - Config 3", async ({ page }) => {
  await page.goto(url);

  const showLogsInstantCheckbox = await page.getByTestId("showLogsInstant");
  await expect(showLogsInstantCheckbox).toBeVisible();
  await showLogsInstantCheckbox.uncheck();

  const showPreviewSvgCheckbox = await page.getByTestId("showPreviewSvg");
  await expect(showPreviewSvgCheckbox).toBeVisible();
  await showPreviewSvgCheckbox.check();

  await startOptimization(page, 3);
});

/**
 * This test measures the speed of the Wasm optimization process.
 * With live logs
 * With preview SVG view
 * Time limit: 60 seconds
 */
test("Speed - Config 4", async ({ page }) => {
  await page.goto(url);

  const showLogsInstantCheckbox = await page.getByTestId("showLogsInstant");
  await expect(showLogsInstantCheckbox).toBeVisible();
  await showLogsInstantCheckbox.check();

  const showPreviewSvgCheckbox = await page.getByTestId("showPreviewSvg");
  await expect(showPreviewSvgCheckbox).toBeVisible();
  await showPreviewSvgCheckbox.check();

  await startOptimization(page, 4);
});

const startOptimization = async (page, configNumber) => {
  const earlyTermination = await page.getByTestId("earlyTerminationInput");
  await expect(earlyTermination).toBeVisible();
  await earlyTermination.check();

  const seed = await page.getByTestId("seedInput");
  await expect(seed).toBeVisible();
  await seed.fill("8780830896941405304");

  const startButton = await page.getByRole("button", { name: "Start optimization" });
  await expect(startButton).toBeVisible();
  await startButton.click();

  const startTime = Date.now();

  const logBox = await page.getByTestId("logBox");
  await expect(logBox).toBeVisible();
  await expect(logBox).toContainText("Wasm logger successfully initialized");

  try {
    await expect(logBox).toContainText("Wasm thread pool successfully initialized");
  } catch {
    test.fail(
      true,
      "Wasm thread pool initialization failed. This might be due to the environment not supporting Web Workers."
    );
  }
  await expect(logBox).toContainText("Wasm computation started");

  await expect(logBox).toContainText("Finished", { timeout: 900000 });
  const elapsedTime = Date.now() - startTime;

  await expect(logBox).toContainText("Max evals");
  const logBoxText = await page.getByTestId("logBox").textContent();

  if (!logBoxText) {
    test.fail(true, 'Log box text is empty. Could not extract "Max evals/s" value.');
    return;
  }

  const timestamp = new Date().toISOString();
  const commitHash = process.env.GIT_COMMIT_HASH || "unknown";
  const cpuModel = process.env.CPU_MODEL || "unknown";
  const logEntry = `${timestamp};${configNumber};${test.info().repeatEachIndex + 1};${
    test.info().project.name
  };${cpuModel};${commitHash};${elapsedTime}\n`;

  fs.appendFileSync(resultsFilePath, logEntry);

  expect(elapsedTime).toBeGreaterThan(0);
};
