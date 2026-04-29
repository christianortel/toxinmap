export type GlobeRuntimeFailureReason =
  | "no-webgl"
  | "software-renderer"
  | "runtime-error";

export type GlobeRendererSupportStatus =
  | {
      kind: "three-supported";
      browserLabel: string;
      renderer: string | null;
      webglLoose: boolean;
      webglStrict: boolean;
      webgl2Loose: boolean;
      webgl2Strict: boolean;
      cesiumReason:
        | "major-performance-caveat"
        | "unstable-renderer"
        | "software-renderer"
        | null;
    }
  | {
      kind: "cesium-supported";
      browserLabel: string;
      renderer: string | null;
      webglLoose: boolean;
      webglStrict: boolean;
      webgl2Loose: boolean;
      webgl2Strict: boolean;
      cesiumReason: null;
    }
  | {
      kind: "fallback-required";
      browserLabel: string;
      renderer: string | null;
      webglLoose: boolean;
      webglStrict: boolean;
      webgl2Loose: boolean;
      webgl2Strict: boolean;
      reason: GlobeRuntimeFailureReason;
      cesiumReason:
        | "major-performance-caveat"
        | "unstable-renderer"
        | "software-renderer"
        | null;
    };

function getBrowserLabel(userAgent: string) {
  if (/Brave/i.test(userAgent)) return "Brave";
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  return "This browser";
}

export function evaluateGlobeRendererSupport(): GlobeRendererSupportStatus {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      kind: "fallback-required",
      browserLabel: "This browser",
      renderer: null,
      webglLoose: false,
      webglStrict: false,
      webgl2Loose: false,
      webgl2Strict: false,
      reason: "runtime-error",
      cesiumReason: null,
    };
  }

  const browserLabel = getBrowserLabel(navigator.userAgent ?? "");

  try {
    const webglStrictContext = document.createElement("canvas").getContext("webgl", {
      failIfMajorPerformanceCaveat: true,
    });
    const webglLooseContext =
      webglStrictContext ??
      document.createElement("canvas").getContext("webgl", {
        failIfMajorPerformanceCaveat: false,
      });
    const webgl2StrictContext = document.createElement("canvas").getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
    });
    const webgl2LooseContext =
      webgl2StrictContext ??
      document.createElement("canvas").getContext("webgl2", {
        failIfMajorPerformanceCaveat: false,
      });

    const webglLoose = Boolean(webglLooseContext);
    const webglStrict = Boolean(webglStrictContext);
    const webgl2Loose = Boolean(webgl2LooseContext);
    const webgl2Strict = Boolean(webgl2StrictContext);

    if (!webglLoose) {
      return {
        kind: "fallback-required",
        browserLabel,
        renderer: null,
        webglLoose,
        webglStrict,
        webgl2Loose,
        webgl2Strict,
        reason: "no-webgl",
        cesiumReason: null,
      };
    }

    const contextForRenderer =
      webgl2StrictContext ?? webgl2LooseContext ?? webglStrictContext ?? webglLooseContext;
    if (!contextForRenderer) {
      return {
        kind: "fallback-required",
        browserLabel,
        renderer: null,
        webglLoose,
        webglStrict,
        webgl2Loose,
        webgl2Strict,
        reason: "runtime-error",
        cesiumReason: null,
      };
    }
    const debugInfo = contextForRenderer.getExtension("WEBGL_debug_renderer_info");
    const rawRenderer = debugInfo
      ? contextForRenderer.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : "";
    const renderer = typeof rawRenderer === "string" ? rawRenderer.toLowerCase() : "";

    const softwareRenderer =
      renderer.includes("swiftshader") ||
      renderer.includes("software") ||
      renderer.includes("llvmpipe");
    const unstableCesiumRenderer =
      (renderer.includes("amd radeon") || renderer.includes("angle(amd")) &&
      renderer.includes("direct3d11");

    if (softwareRenderer) {
      return {
        kind: "fallback-required",
        browserLabel,
        renderer: renderer || null,
        webglLoose,
        webglStrict,
        webgl2Loose,
        webgl2Strict,
        reason: "software-renderer",
        cesiumReason: "software-renderer",
      };
    }

    if (!webglStrict) {
      return {
        kind: "three-supported",
        browserLabel,
        renderer: renderer || null,
        webglLoose,
        webglStrict,
        webgl2Loose,
        webgl2Strict,
        cesiumReason: "major-performance-caveat",
      };
    }

    if (unstableCesiumRenderer) {
      return {
        kind: "three-supported",
        browserLabel,
        renderer: renderer || null,
        webglLoose,
        webglStrict,
        webgl2Loose,
        webgl2Strict,
        cesiumReason: "unstable-renderer",
      };
    }

    return {
      kind: "cesium-supported",
      browserLabel,
      renderer: renderer || null,
      webglLoose,
      webglStrict,
      webgl2Loose,
      webgl2Strict,
      cesiumReason: null,
    };
  } catch {
    return {
      kind: "fallback-required",
      browserLabel,
      renderer: null,
      webglLoose: false,
      webglStrict: false,
      webgl2Loose: false,
      webgl2Strict: false,
      reason: "runtime-error",
      cesiumReason: null,
    };
  }
}
