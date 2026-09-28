"use client";

import { useEffect } from "react";

const SCRIPT_ID = "yourgpt-chatbot";
const SCRIPT_SRC = "https://widget.yourgpt.ai/script.js";
const ROOT_ID = "yourgpt_root";

type SupportedLocale = "ar" | "en";

type YourGPTClient = {
  on?: (event: "init", callback: () => void) => void;
  off?: (event: "init", callback: () => void) => void;
  set?: (
    type: "session:data" | "visitor:data",
    data: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    YGC_WIDGET_ID?: string;
    $yourgptChatbot?: YourGPTClient;
  }
}

type Props = {
  locale: string;
};

function normalizeLocale(locale: string): SupportedLocale {
  return locale === "ar" ? "ar" : "en";
}

function getWidgetId(locale: SupportedLocale): string {
  const localeWidgetId =
    locale === "ar"
      ? process.env.NEXT_PUBLIC_YOURGPT_WIDGET_ID_AR
      : process.env.NEXT_PUBLIC_YOURGPT_WIDGET_ID_EN;

  return (
    localeWidgetId?.trim() ||
    process.env.NEXT_PUBLIC_YOURGPT_WIDGET_ID?.trim() ||
    ""
  );
}

function applyRootLocale(locale: SupportedLocale) {
  const root = document.getElementById(ROOT_ID);

  if (!root) {
    return;
  }

  const direction = locale === "ar" ? "rtl" : "ltr";

  if (root.lang !== locale) {
    root.lang = locale;
  }

  if (root.dir !== direction) {
    root.dir = direction;
  }

  if (root.dataset.locale !== locale) {
    root.dataset.locale = locale;
  }
}

function setSessionLocale(locale: SupportedLocale) {
  window.$yourgptChatbot?.set?.("session:data", {
    siteLocale: locale,
    siteLanguage: locale === "ar" ? "Arabic" : "English",
    siteDirection: locale === "ar" ? "rtl" : "ltr",
  });
}

function removeExistingWidget() {
  document.getElementById(SCRIPT_ID)?.remove();
  document.getElementById(ROOT_ID)?.remove();
  delete window.YGC_WIDGET_ID;
  delete window.$yourgptChatbot;
}

export default function YourGPTWidget({ locale }: Props) {
  useEffect(() => {
    const isEnabled =
      process.env.NEXT_PUBLIC_ENABLE_YOURGPT === "true";

    const normalizedLocale = normalizeLocale(locale);
    const widgetId = getWidgetId(normalizedLocale);

    document.documentElement.dataset.yourgptLocale = normalizedLocale;

    if (!isEnabled || !widgetId) {
      return;
    }

    const handleInit = () => {
      applyRootLocale(normalizedLocale);
      setSessionLocale(normalizedLocale);
    };

    const observer = new MutationObserver(() => {
      applyRootLocale(normalizedLocale);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const existingScript = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    const existingWidgetId =
      existingScript?.dataset.widget || window.YGC_WIDGET_ID;

    // عند تغيير اللغة واستخدام Widget ID مختلف، أزل النسخة السابقة.
    if (existingScript && existingWidgetId !== widgetId) {
      removeExistingWidget();
    }

    const currentScript = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (currentScript) {
      window.$yourgptChatbot?.on?.("init", handleInit);
      applyRootLocale(normalizedLocale);
      setSessionLocale(normalizedLocale);

      return () => {
        observer.disconnect();
        window.$yourgptChatbot?.off?.("init", handleInit);
      };
    }

    window.YGC_WIDGET_ID = widgetId;

    const script = document.createElement("script");

    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.dataset.widget = widgetId;

    script.onload = () => {
      window.$yourgptChatbot?.on?.("init", handleInit);
      applyRootLocale(normalizedLocale);
      setSessionLocale(normalizedLocale);
    };

    script.onerror = () => {
      console.warn("YourGPT widget script failed to load");
    };

    document.body.appendChild(script);

    return () => {
      observer.disconnect();
      window.$yourgptChatbot?.off?.("init", handleInit);
    };
  }, [locale]);

  return null;
}
