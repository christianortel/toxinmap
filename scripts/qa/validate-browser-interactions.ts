export {};

import { access } from "node:fs/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const EXIT_MARKER = "__TOXINMAP_BROWSER_EXIT__=";
let currentValidationStep = "initializing";

type ShellExpectations = {
  cameraBand?: "national" | "regional" | "local";
  selectedEntityId?: string;
  minRenderedSignalCount?: number;
  maxCameraHeight?: number;
  minPointResolution?: number;
};

type ShellState = {
  cameraBand: string | null;
  cameraHeight: number;
  pointResolution: number;
  pointScale: number;
  renderedSignalCount: string | null;
  selectedEntityId: string | null;
};

type CdpMessage = {
  id?: number;
  method?: string;
  sessionId?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

class CdpClient {
  private socket: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();

  private constructor(socket: WebSocket) {
    this.socket = socket;
    this.socket.addEventListener("message", async (event) => {
      const rawData =
        typeof event.data === "string"
          ? event.data
          : event.data instanceof Blob
            ? await event.data.text()
            : Buffer.from(event.data as ArrayBuffer).toString("utf8");
      this.processPayload(JSON.parse(rawData) as CdpMessage);
    });
  }

  private processPayload(payload: CdpMessage) {
    if (
      payload.method === "Target.receivedMessageFromTarget" &&
      typeof payload.params?.message === "string"
    ) {
      try {
        const nestedPayload = JSON.parse(payload.params.message as string) as CdpMessage;
        this.processPayload(nestedPayload);
      } catch {
        return;
      }
      return;
    }

    if (!payload.id) {
      return;
    }

    const pending = this.pending.get(payload.id);
    if (!pending) {
      return;
    }
    this.pending.delete(payload.id);
    clearTimeout(pending.timer);
    if (payload.error) {
      pending.reject(new Error(payload.error.message ?? "Unknown CDP error"));
      return;
    }
    pending.resolve(payload.result ?? {});
  }

  static async connect(wsUrl: string) {
    const socket = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error(`Failed to connect to CDP websocket ${wsUrl}.`)), {
        once: true,
      });
    });
    return new CdpClient(socket);
  }

  send(method: string, params: Record<string, unknown> = {}, timeoutMs = 15_000, sessionId?: string) {
    if (sessionId) {
      return this.sendToTarget(sessionId, method, params, timeoutMs);
    }

    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for CDP response to ${method}.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  private sendToTarget(sessionId: string, method: string, params: Record<string, unknown>, timeoutMs: number) {
    const messageId = this.nextId++;
    const outerId = this.nextId++;
    const message = JSON.stringify({ id: messageId, method, params });
    this.socket.send(
      JSON.stringify({
        id: outerId,
        method: "Target.sendMessageToTarget",
        params: { sessionId, message },
      }),
    );

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`Timed out waiting for CDP response to ${method}.`));
      }, timeoutMs);
      this.pending.set(messageId, { resolve, reject, timer });
    });
  }

  async evaluate<T>(expression: string, sessionId?: string) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, 15_000, sessionId);
    const exceptionDetails = result.exceptionDetails;
    if (exceptionDetails) {
      const exceptionText =
        (exceptionDetails as { text?: string; exception?: { description?: string } }).exception?.description ??
        (exceptionDetails as { text?: string }).text ??
        "Unknown runtime exception";
      throw new Error(`Runtime.evaluate failed: ${exceptionText}`);
    }
    return (result.result as { value?: T } | undefined)?.value as T;
  }

  close() {
    this.socket.close();
  }
}

function getBaseUrl() {
  return process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
}

async function resolveBrowserExecutablePath() {
  if (process.env.BROWSER_EXECUTABLE_PATH) {
    return process.env.BROWSER_EXECUTABLE_PATH;
  }

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function launchPlaywrightBrowser() {
  const executablePath = await resolveBrowserExecutablePath();
  const launchArgs = [
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--no-first-run",
    "--no-default-browser-check",
  ];
  const launchOptions = {
    headless: process.env.BROWSER_HEADLESS === "false" ? false : true,
    executablePath: executablePath ?? undefined,
    args: launchArgs,
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("spawn EPERM") || executablePath) {
      throw error;
    }

    const fallbackExecutablePath = await resolveBrowserExecutablePath();
    if (!fallbackExecutablePath) {
      throw error;
    }

    return chromium.launch({
      ...launchOptions,
      executablePath: fallbackExecutablePath,
    });
  }
}

async function clickTestButton(page: Page, testId: string) {
  const locator = page.locator(`[data-testid="${testId}"]`);
  await locator.waitFor({ state: "attached", timeout: 60_000 });
  await page.evaluate((resolvedTestId) => {
    const button = document.querySelector(
      `[data-testid="${resolvedTestId}"]`,
    ) as HTMLButtonElement | null;
    if (!button) {
      throw new Error(`Missing e2e control: ${resolvedTestId}`);
    }
    button.click();
  }, testId);
}

async function getTestButtonEntityId(page: Page, testId: string) {
  const locator = page.locator(`[data-testid="${testId}"]`);
  await locator.waitFor({ state: "attached", timeout: 60_000 });
  const entityId = await locator.getAttribute("data-entity-id");
  if (!entityId) {
    throw new Error(`Missing data-entity-id for e2e control: ${testId}`);
  }
  return entityId;
}

async function waitForShellState(page: Page, expectations: ShellExpectations) {
  await page.waitForFunction(
    (expected) => {
      const shell = document.querySelector('[data-testid="explorer-shell"]');
      if (!shell) {
        return false;
      }

      if (expected.cameraBand) {
        const currentBand = shell.getAttribute("data-camera-band");
        if (currentBand !== expected.cameraBand) {
          return false;
        }
      }

      if (expected.selectedEntityId !== undefined) {
        const selectedEntityId = shell.getAttribute("data-selected-entity-id") ?? "";
        if (selectedEntityId !== expected.selectedEntityId) {
          return false;
        }
      }

      if (typeof expected.minRenderedSignalCount === "number") {
        const renderedSignalCount = Number(shell.getAttribute("data-rendered-signal-count") ?? "0");
        if (!Number.isFinite(renderedSignalCount) || renderedSignalCount < expected.minRenderedSignalCount) {
          return false;
        }
      }

      if (typeof expected.maxCameraHeight === "number") {
        const cameraHeight = Number(shell.getAttribute("data-camera-height") ?? "0");
        if (!Number.isFinite(cameraHeight) || cameraHeight > expected.maxCameraHeight) {
          return false;
        }
      }

      if (typeof expected.minPointResolution === "number") {
        const pointResolution = Number(shell.getAttribute("data-point-resolution") ?? "0");
        if (!Number.isFinite(pointResolution) || pointResolution < expected.minPointResolution) {
          return false;
        }
      }

      return true;
    },
    expectations,
    { timeout: 60_000 },
  );
}

async function waitForDrawerEntity(page: Page, entityId: string) {
  await page.waitForFunction(
    (expectedEntityId) => {
      const drawer = document.querySelector('[data-testid="detail-drawer"]');
      return drawer?.getAttribute("data-entity-id") === expectedEntityId;
    },
    entityId,
    { timeout: 60_000 },
  );
}

async function runPlaywrightValidation(baseUrl: string) {
  let browser: Browser | null = null;
  try {
    browser = await launchPlaywrightBrowser();
    const context: BrowserContext = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    await page.setViewportSize({ width: 1440, height: 960 });
    page.setDefaultTimeout(60_000);

    await page.goto(
      `${baseUrl}/?e2e=1&groups=official,emerging,legal`,
      { waitUntil: "domcontentloaded", timeout: 90_000 },
    );
    await page.waitForSelector('[data-testid="explorer-shell"]', { timeout: 60_000 });
    await waitForShellState(page, { minRenderedSignalCount: 1 });

    await clickTestButton(page, "e2e-focus-cape-fear-regional");
    await waitForShellState(page, { cameraBand: "regional", minRenderedSignalCount: 1 });
    const visiblePfasEntityId = await getTestButtonEntityId(page, "e2e-select-fayetteville-pfas");
    await clickTestButton(page, "e2e-select-fayetteville-pfas");
    await waitForShellState(page, { cameraBand: "regional", selectedEntityId: visiblePfasEntityId });
    await waitForDrawerEntity(page, visiblePfasEntityId);
    await clickTestButton(page, "e2e-drilldown-cape-fear-local");
    await waitForShellState(page, {
      cameraBand: "local",
      selectedEntityId: "",
      minRenderedSignalCount: 1,
    });

    await clickTestButton(page, "e2e-select-south-cary");
    await waitForShellState(page, { cameraBand: "local", selectedEntityId: "npdes-nc0065102-001" });
    await waitForDrawerEntity(page, "npdes-nc0065102-001");

    await clickTestButton(page, "e2e-select-briarwood");
    await waitForShellState(page, { cameraBand: "local", selectedEntityId: "npdes-nc0062740-001" });
    await waitForDrawerEntity(page, "npdes-nc0062740-001");

    const shellState = await page.locator('[data-testid="explorer-shell"]').evaluate((element) => ({
      cameraBand: element.getAttribute("data-camera-band"),
      renderedSignalCount: element.getAttribute("data-rendered-signal-count"),
      selectedEntityId: element.getAttribute("data-selected-entity-id"),
    }));
    const drawerState = await page.locator('[data-testid="detail-drawer"]').first().evaluate((element) => ({
      entityId: element.getAttribute("data-entity-id"),
      entityTitle: element.getAttribute("data-entity-title"),
    }));

    return {
      shellState,
      drawerState,
      verifiedSequence: [
        "Cape Fear regional band rendered",
        "regional PFAS click opened a real visible PFAS drawer",
        "Cape Fear drilldown bridge reached local band",
        "South Cary click preserved wastewater drawer",
        "Briarwood click preserved wastewater drawer",
      ],
    };
  } finally {
    await browser?.close();
  }
}

async function waitForCdpReady(baseUrl: string, targetUrl?: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const [listResponse, versionResponse] = await Promise.all([
      fetch(`${baseUrl}/json/list`),
      fetch(`${baseUrl}/json/version`),
    ]);
    if (listResponse.ok && versionResponse.ok) {
      const targets = (await listResponse.json()) as Array<{ id?: string; type?: string; webSocketDebuggerUrl?: string; url?: string }>;
      const version = (await versionResponse.json()) as { webSocketDebuggerUrl?: string };
      const pageTarget =
        (targetUrl
          ? targets.find(
              (target) => target.type === "page" && target.id && target.webSocketDebuggerUrl && target.url?.startsWith(targetUrl),
            )
          : null) ??
        targets.find((target) => target.type === "page" && target.id && target.webSocketDebuggerUrl);
      if (pageTarget?.webSocketDebuggerUrl && pageTarget.id && version.webSocketDebuggerUrl) {
        return {
          targetId: pageTarget.id,
          pageWsUrl: pageTarget.webSocketDebuggerUrl,
          browserWsUrl: version.webSocketDebuggerUrl,
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Timed out waiting for CDP page target at ${baseUrl}.`);
}

async function waitForShellStateCdp(client: CdpClient, sessionId: string, expectations: ShellExpectations) {
  const deadline = Date.now() + 60_000;
  let lastObservedState: Record<string, unknown> | null = null;
  while (Date.now() < deadline) {
    lastObservedState = await client.evaluate<Record<string, unknown>>(`
      (() => {
        const shell = document.querySelector('[data-testid="explorer-shell"]');
        return {
          href: location.href,
          title: document.title,
          readyState: document.readyState,
          shellExists: !!shell,
          cameraBand: shell?.getAttribute("data-camera-band") ?? null,
          cameraHeight: shell?.getAttribute("data-camera-height") ?? null,
          pointResolution: shell?.getAttribute("data-point-resolution") ?? null,
          renderedSignalCount: shell?.getAttribute("data-rendered-signal-count") ?? null,
          selectedEntityId: shell?.getAttribute("data-selected-entity-id") ?? null,
          canvasCount: document.querySelectorAll("canvas").length,
          bodyText: document.body?.innerText?.slice(0, 300) ?? null,
        };
      })()
    `, sessionId);
    const matches = await client.evaluate<boolean>(`
      (() => {
        const shell = document.querySelector('[data-testid="explorer-shell"]');
        if (!shell) return false;
        const expected = ${JSON.stringify(expectations)};
        if (expected.cameraBand && shell.getAttribute("data-camera-band") !== expected.cameraBand) return false;
        if (expected.selectedEntityId !== undefined) {
          const selected = shell.getAttribute("data-selected-entity-id") ?? "";
          if (selected !== expected.selectedEntityId) return false;
        }
        if (typeof expected.minRenderedSignalCount === "number") {
          const rendered = Number(shell.getAttribute("data-rendered-signal-count") ?? "0");
          if (!Number.isFinite(rendered) || rendered < expected.minRenderedSignalCount) return false;
        }
        if (typeof expected.maxCameraHeight === "number") {
          const height = Number(shell.getAttribute("data-camera-height") ?? "0");
          if (!Number.isFinite(height) || height > expected.maxCameraHeight) return false;
        }
        if (typeof expected.minPointResolution === "number") {
          const resolution = Number(shell.getAttribute("data-point-resolution") ?? "0");
          if (!Number.isFinite(resolution) || resolution < expected.minPointResolution) return false;
        }
        return true;
      })()
    `, sessionId);

    if (matches) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(
    `Timed out waiting for shell state ${JSON.stringify(expectations)}. Last observed state: ${JSON.stringify(lastObservedState)}.`,
  );
}

async function waitForCanvasCdp(client: CdpClient, sessionId: string) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const ready = await client.evaluate<boolean>(`
      (() => {
        const canvas = document.querySelector("canvas");
        return canvas instanceof HTMLCanvasElement && canvas.getBoundingClientRect().width > 0;
      })()
    `, sessionId);
    if (ready) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error("Timed out waiting for globe canvas to render.");
}

async function getShellStateCdp(client: CdpClient, sessionId: string) {
  return client.evaluate<ShellState>(`
    (() => {
      const shell = document.querySelector('[data-testid="explorer-shell"]');
      if (!shell) {
        return {
          cameraBand: null,
          cameraHeight: 0,
          pointResolution: 0,
          pointScale: 0,
          renderedSignalCount: null,
          selectedEntityId: null
        };
      }
      return {
        cameraBand: shell.getAttribute("data-camera-band"),
        cameraHeight: Number(shell.getAttribute("data-camera-height") ?? "0"),
        pointResolution: Number(shell.getAttribute("data-point-resolution") ?? "0"),
        pointScale: Number(shell.getAttribute("data-zoom-point-scale") ?? "0"),
        renderedSignalCount: shell.getAttribute("data-rendered-signal-count"),
        selectedEntityId: shell.getAttribute("data-selected-entity-id")
      };
    })()
  `, sessionId);
}

async function clickTestButtonCdp(client: CdpClient, sessionId: string, testId: string) {
  await client.evaluate(`
    (() => {
      const button = document.querySelector('[data-testid="${testId}"]');
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing e2e control: ${testId}");
      }
      button.click();
    })()
  `, sessionId);
}

async function getTestButtonEntityIdCdp(client: CdpClient, sessionId: string, testId: string) {
  const entityId = await client.evaluate<string | null>(`
    (() => {
      const button = document.querySelector('[data-testid="${testId}"]');
      return button?.getAttribute("data-entity-id") ?? null;
    })()
  `, sessionId);
  if (!entityId) {
    throw new Error(`Missing data-entity-id for e2e control: ${testId}`);
  }
  return entityId;
}

async function wheelZoomToLocalCdp(client: CdpClient, sessionId: string) {
  const viewportCenter = await client.evaluate<{ x: number; y: number }>(`
    (() => {
      const canvas = document.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Missing globe canvas.");
      }
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()
  `, sessionId);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: viewportCenter.x,
      y: viewportCenter.y,
      deltaX: 0,
      deltaY: 1400,
      pointerType: "mouse",
    }, 15_000, sessionId);

    try {
      await waitForShellStateCdp(client, sessionId, {
        cameraBand: "local",
        maxCameraHeight: 550_000,
        minPointResolution: 14,
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw new Error("Wheel zoom did not reach the expected local inspection state.");
}

async function clickCanvasEntityCdp(client: CdpClient, sessionId: string, entityId: string) {
  const point = await client.evaluate<{ x: number; y: number } | null>(`
    (() => window.__TOXINMAP_E2E__?.getPointScreenPosition?.(${JSON.stringify(entityId)}) ?? null)()
  `, sessionId);

  if (!point) {
    throw new Error(`Could not resolve screen coordinates for visible entity ${entityId}.`);
  }

  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "mouse",
  }, 15_000, sessionId);
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "mouse",
  }, 15_000, sessionId);
}

async function runCdpValidation(baseUrl: string, cdpUrl: string) {
  const atlasUrl = `${baseUrl}/?e2e=1&groups=official,emerging,legal`;
  currentValidationStep = "waiting for debugger";
  console.log(`CDP validation: waiting for debugger at ${cdpUrl}`);
  const cdpTarget = await waitForCdpReady(cdpUrl, atlasUrl);
  currentValidationStep = "connecting to browser websocket";
  console.log(`CDP validation: connecting to ${cdpTarget.browserWsUrl}`);
  const client = await CdpClient.connect(cdpTarget.browserWsUrl);
  try {
    currentValidationStep = "creating atlas target";
    console.log(`CDP validation: creating fresh atlas target for ${atlasUrl}`);
    const createResult = await client.send("Target.createTarget", {
      url: atlasUrl,
    });
    const targetId = (createResult.targetId as string | undefined) ?? cdpTarget.targetId;
    currentValidationStep = "attaching to atlas target";
    console.log(`CDP validation: attaching to target ${targetId}`);
    const attachResult = await client.send("Target.attachToTarget", { targetId });
    const sessionId = attachResult.sessionId as string | undefined;
    if (!sessionId) {
      throw new Error(`CDP attach did not return a sessionId for target ${targetId}.`);
    }
    await client.send("Target.activateTarget", { targetId });

    currentValidationStep = "waiting for atlas DOM";
    console.log("CDP validation: waiting for atlas DOM");
    await waitForShellStateCdp(client, sessionId, { minRenderedSignalCount: 1 });
    await waitForCanvasCdp(client, sessionId);
    currentValidationStep = "atlas loaded";
    console.log("CDP validation: atlas loaded");

    currentValidationStep = "focusing Cape Fear regional";
    console.log("CDP validation: focusing Cape Fear regional");
    await clickTestButtonCdp(client, sessionId, "e2e-focus-cape-fear-regional");
    await waitForShellStateCdp(client, sessionId, { cameraBand: "regional", minRenderedSignalCount: 1 });
    await waitForCanvasCdp(client, sessionId);
    const preZoomShell = await getShellStateCdp(client, sessionId);

    currentValidationStep = "wheel zooming into local band";
    console.log("CDP validation: wheel zooming into local band");
    await wheelZoomToLocalCdp(client, sessionId);
    const postZoomShell = await getShellStateCdp(client, sessionId);

    if (!(postZoomShell.cameraHeight < preZoomShell.cameraHeight)) {
      throw new Error(
        `Expected wheel zoom to reduce camera height, received pre=${preZoomShell.cameraHeight}, post=${postZoomShell.cameraHeight}.`,
      );
    }

    if (!(postZoomShell.pointResolution > preZoomShell.pointResolution)) {
      throw new Error(
        `Expected close zoom to increase point resolution, received pre=${preZoomShell.pointResolution}, post=${postZoomShell.pointResolution}.`,
      );
    }

    if (!(postZoomShell.pointScale < preZoomShell.pointScale)) {
      throw new Error(
        `Expected close zoom to shrink point scale, received pre=${preZoomShell.pointScale}, post=${postZoomShell.pointScale}.`,
      );
    }

    currentValidationStep = "clicking visible PFAS point on canvas";
    console.log("CDP validation: clicking visible PFAS point on canvas");
    const visiblePfasEntityId = await getTestButtonEntityIdCdp(client, sessionId, "e2e-select-fayetteville-pfas");
    await clickCanvasEntityCdp(client, sessionId, visiblePfasEntityId);
    await waitForShellStateCdp(client, sessionId, { cameraBand: "local", selectedEntityId: visiblePfasEntityId });

    currentValidationStep = "clearing PFAS drawer";
    console.log("CDP validation: clearing PFAS drawer");
    await client.evaluate(`
      (() => {
        const close = document.querySelector('[aria-label="Close detail drawer"]');
        if (close instanceof HTMLButtonElement) {
          close.click();
        } else {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        }
      })()
    `, sessionId);
    await waitForShellStateCdp(client, sessionId, {
      cameraBand: "local",
      selectedEntityId: "",
      minRenderedSignalCount: 1,
      maxCameraHeight: 550_000,
      minPointResolution: 14,
    });

    currentValidationStep = "selecting South Cary";
    console.log("CDP validation: selecting South Cary");
    await clickTestButtonCdp(client, sessionId, "e2e-select-south-cary");
    await waitForShellStateCdp(client, sessionId, { cameraBand: "local", selectedEntityId: "npdes-nc0065102-001" });

    currentValidationStep = "selecting Briarwood";
    console.log("CDP validation: selecting Briarwood");
    await clickTestButtonCdp(client, sessionId, "e2e-select-briarwood");
    await waitForShellStateCdp(client, sessionId, { cameraBand: "local", selectedEntityId: "npdes-nc0062740-001" });

    const shellState = await getShellStateCdp(client, sessionId);
    const drawerState = await client.evaluate<{ entityId: string | null; entityTitle: string | null }>(`
      (() => {
        const drawer = document.querySelector('[data-testid="detail-drawer"]');
        return {
          entityId: drawer?.getAttribute("data-entity-id") ?? null,
          entityTitle: drawer?.getAttribute("data-entity-title") ?? null
        };
      })()
    `, sessionId);

    return {
      preZoomShell,
      postZoomShell,
      shellState,
      drawerState,
      verifiedSequence: [
        "Cape Fear regional band rendered",
        "real wheel zoom reached local inspection band",
        "wheel zoom reduced camera height and shrank point scale",
        "real canvas PFAS click opened a visible PFAS drawer",
        "South Cary click preserved wastewater drawer",
        "Briarwood click preserved wastewater drawer",
      ],
    };
  } finally {
    client.close();
  }
}

async function main() {
  const baseUrl = getBaseUrl();
  const cdpUrl = process.env.BROWSER_CDP_URL;

  const result = await Promise.race([
    cdpUrl ? runCdpValidation(baseUrl, cdpUrl) : runPlaywrightValidation(baseUrl),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Browser interaction validation timed out inside the Node runner during: ${currentValidationStep}.`)),
        150_000,
      );
    }),
  ]);

  console.log("PASS browser interaction validation");
  console.log(
    JSON.stringify(
      {
        baseUrl,
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL browser interaction validation");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

process.on("exit", () => {
  console.log(`${EXIT_MARKER}${process.exitCode ?? 0}`);
});
