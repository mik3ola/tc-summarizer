"use client";

import { ClassValue, clsx } from "clsx";
import * as Color from "color-bits";
import Link from "next/link";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useTheme } from "@/components/ThemeProvider";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to convert any CSS color to rgba
export const getRGBA = (
  cssColor: React.CSSProperties["color"],
  fallback: string = "rgba(180, 180, 180)",
): string => {
  if (typeof window === "undefined") return fallback;
  if (!cssColor) return fallback;

  try {
    if (typeof cssColor === "string" && cssColor.startsWith("var(")) {
      const element = document.createElement("div");
      element.style.color = cssColor;
      document.body.appendChild(element);
      const computedColor = window.getComputedStyle(element).color;
      document.body.removeChild(element);
      return Color.formatRGBA(Color.parse(computedColor));
    }

    return Color.formatRGBA(Color.parse(cssColor));
  } catch (e) {
    console.error("Color parsing failed:", e);
    return fallback;
  }
};

// Helper function to add opacity to an RGB color string
export const colorWithOpacity = (color: string, opacity: number): string => {
  if (!color.startsWith("rgb")) return color;
  return Color.formatRGBA(Color.alpha(Color.parse(color), opacity));
};

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number | string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 3,
  gridGap = 3,
  flickerChance = 0.2,
  color = "#B4B4B4",
  width,
  height,
  className,
  maxOpacity = 0.15,
  text = "",
  fontSize = 140,
  fontWeight = 600,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = useMemo(() => {
    return getRGBA(color);
  }, [color]);

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ) => {
      ctx.clearRect(0, 0, width, height);

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      if (!maskCtx) return;

      if (text) {
        maskCtx.save();
        maskCtx.scale(dpr, dpr);
        maskCtx.fillStyle = "white";
        maskCtx.font = `${fontWeight} ${fontSize}px "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        maskCtx.textAlign = "center";
        maskCtx.textBaseline = "middle";
        maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr));
        maskCtx.restore();
      }

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * (squareSize + gridGap) * dpr;
          const y = j * (squareSize + gridGap) * dpr;
          const squareWidth = squareSize * dpr;
          const squareHeight = squareSize * dpr;

          const maskData = maskCtx.getImageData(
            x,
            y,
            squareWidth,
            squareHeight,
          ).data;
          const hasText = maskData.some(
            (value, index) => index % 4 === 0 && value > 0,
          );

          const opacity = squares[i * rows + j];
          const finalOpacity = hasText
            ? Math.min(1, opacity * 3 + 0.4)
            : opacity;

          ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity);
          ctx.fillRect(x, y, squareWidth, squareHeight);
        }
      }
    },
    [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight],
  );

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const cols = Math.ceil(width / (squareSize + gridGap));
      const rows = Math.ceil(height / (squareSize + gridGap));

      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity],
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      updateSquares(gridParams.squares, deltaTime);
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr,
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div
      ref={containerRef}
      className={cn(`h-full w-full ${className}`)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  );
};

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function checkQuery() {
      const result = window.matchMedia(query);
      setValue(result.matches);
    }

    checkQuery();
    window.addEventListener("resize", checkQuery);
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", checkQuery);

    return () => {
      window.removeEventListener("resize", checkQuery);
      mediaQuery.removeEventListener("change", checkQuery);
    };
  }, [query]);

  return value;
}

const footerLinks = [
  {
    title: "Product",
    links: [
      { id: 1, title: "Features", url: "/#features" },
      { id: 2, title: "Pricing", url: "/#pricing" },
      { id: 3, title: "Demo", url: "/#demo" },
    ],
  },
  {
    title: "Legal",
    links: [
      { id: 4, title: "Privacy Policy", url: "/privacy" },
      { id: 5, title: "Terms of Service", url: "/terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { id: 6, title: "Help Center", url: "/support" },
      { id: 7, title: "Contact Us", url: "/support" },
    ],
  },
];

export const FlickeringFooter = () => {
  const tablet = useMediaQuery("(max-width: 1024px)");
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Only use isDark for components that need it as a prop (like FlickeringGrid color)
  const isDark = mounted ? theme === "dark" : true;

  return (
    <footer id="footer" className="w-full pb-0 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Logo, Description and Badge */}
          <div className="flex flex-col items-start max-w-sm">
            <Link href="/" className="flex items-center gap-2" style={{ display: 'flex', whiteSpace: 'nowrap' }}>
              <Image src="/logo.png" alt="TermsDigest" width={32} height={32} className="w-8 h-8" style={{ flexShrink: 0 }} />
              <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white" style={{ whiteSpace: 'nowrap' }}>
                TermsDigest
              </span>
            </Link>
            <p className="mt-3 text-sm font-light leading-relaxed text-gray-600 dark:text-gray-400">
              AI-powered summaries of Terms & Conditions, Privacy Policies, and legal documents.
            </p>
            {/* GDPR Badge - render after mounting to avoid hydration mismatch */}
            <div className="mt-4">
              {mounted && !isDark ? (
                <svg width="46" height="45" viewBox="0 0 46 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                  <rect x="3" y="0.863281" width="40" height="40" rx="20" fill="url(#paint0_gdpr_light)" />
                  <path d="M30.6146 31.3062L31.2991 33.4127L33.5139 33.4127L31.7221 34.7145L32.4065 36.821L30.6146 35.5191L28.8228 36.821L29.5072 34.7145L27.7153 33.4127L29.9302 33.4127L30.6146 31.3062Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M23.6857 35.4549L23.0013 33.3485L22.3168 35.4549H20.102L21.8938 36.7568L21.2094 38.8633L23.0013 37.5614L24.7932 38.8633L24.1087 36.7568L25.9006 35.4549H23.6857Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M23.6857 4.96976L23.0013 2.86328L22.3168 4.96975L20.102 4.96975L21.8938 6.27163L21.2094 8.3781L23.0013 7.07623L24.7932 8.3781L24.1087 6.27163L25.9006 4.96975L23.6857 4.96976Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M30.6226 4.90555L31.307 7.01202L33.5219 7.01202L31.73 8.3139L32.4144 10.4204L30.6226 9.1185L28.8307 10.4204L29.5151 8.3139L27.7233 7.01202L29.9381 7.01202L30.6226 4.90555Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M16.0644 33.4127L15.38 31.3062L14.6955 33.4127H12.4807L14.2725 34.7145L13.5881 36.821L15.38 35.5191L17.1719 36.821L16.4874 34.7145L18.2793 33.4127L16.0644 33.4127Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M36.1956 10.4846L36.8801 12.5911L39.095 12.5911L37.3031 13.8929L37.9875 15.9994L36.1956 14.6975L34.4038 15.9994L35.0882 13.8929L33.2963 12.5911L35.5112 12.5911L36.1956 10.4846Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M10.4755 27.8336L9.79104 25.7272L9.1066 27.8336H6.89172L8.6836 29.1355L7.99916 31.242L9.79104 29.9401L11.5829 31.242L10.8985 29.1355L12.6903 27.8336L10.4755 27.8336Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M38.2439 18.1059L38.9283 20.2123L41.1432 20.2123L39.3513 21.5142L40.0357 23.6207L38.2439 22.3188L36.452 23.6207L37.1364 21.5142L35.3446 20.2123H37.5594L38.2439 18.1059Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M8.44313 20.2123L7.75869 18.1059L7.07425 20.2123H4.85938L6.65125 21.5142L5.96682 23.6207L7.75869 22.3188L9.55056 23.6207L8.86613 21.5142L10.658 20.2123H8.44313Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M36.1956 25.7272L36.8801 27.8336H39.095L37.3031 29.1355L37.9875 31.242L36.1956 29.9401L34.4038 31.242L35.0882 29.1355L33.2963 27.8336L35.5112 27.8336L36.1956 25.7272Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M10.4755 12.591L9.79103 10.4846L9.1066 12.591H6.89172L8.6836 13.8929L7.99916 15.9994L9.79103 14.6975L11.5829 15.9994L10.8985 13.8929L12.6903 12.591H10.4755Z" fill="url(#paint1_gdpr_light)" />
                  <path d="M16.0565 7.01202L15.372 4.90555L14.6876 7.01202H12.4727L14.2646 8.3139L13.5802 10.4204L15.372 9.1185L17.1639 10.4204L16.4795 8.3139L18.2714 7.01203L16.0565 7.01202Z" fill="url(#paint1_gdpr_light)" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.2383 20.8682C15.2383 22.1882 15.9883 23.0882 17.2243 23.0882C17.8363 23.0882 18.3403 22.8302 18.5623 22.4162L18.5983 22.9922H19.2223V20.7542H17.3023V21.4802H18.1843C18.1363 21.9362 17.8243 22.2362 17.3263 22.2362C16.6243 22.2362 16.3123 21.6782 16.3123 20.8682C16.3123 20.0642 16.6483 19.4882 17.3083 19.4882C17.8063 19.4882 18.0523 19.7582 18.1303 20.2082L19.2103 20.1602C19.0123 19.2122 18.4303 18.6362 17.2963 18.6362C16.0003 18.6362 15.2383 19.5842 15.2383 20.8682ZM19.7261 18.7322V22.9922H21.2801C22.6601 22.9922 23.4341 22.2302 23.4341 20.8682C23.4341 19.5002 22.6481 18.7322 21.2441 18.7322H19.7261ZM21.2441 22.1402H20.7701V19.5842H21.2441C22.0121 19.5842 22.3601 19.9922 22.3601 20.8622C22.3601 21.7322 22.0121 22.1402 21.2441 22.1402ZM23.8059 22.6543V22.9922H24.8499V21.5822H25.5699C26.6139 21.5822 27.2499 21.0362 27.2499 20.1542C27.2499 19.2722 26.6139 18.7322 25.5699 18.7322H23.8059V22.1211H23.6798V22.6543H23.8059ZM25.4979 20.7242H24.8499V19.5842H25.4979C25.9239 19.5842 26.1819 19.7822 26.1819 20.1542C26.1819 20.5322 25.9179 20.7242 25.4979 20.7242ZM29.531 18.7322H27.581V22.9922H28.625V21.4862H29.423C29.831 21.4862 29.969 21.6362 29.993 21.9542L30.059 22.9922H31.127L31.025 21.7802C30.989 21.3542 30.767 21.1082 30.329 21.0482C30.797 20.9042 31.091 20.5202 31.091 19.9982C31.091 19.2302 30.479 18.7322 29.531 18.7322ZM29.369 20.6342H28.625V19.5842H29.357C29.789 19.5842 30.023 19.7642 30.023 20.1062C30.023 20.4422 29.789 20.6342 29.369 20.6342Z" fill="#101828" />
                  <defs>
                    <linearGradient id="paint0_gdpr_light" x1="9.88803" y1="6.55415" x2="36.0447" y2="35.5773" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#E5E7EB" /><stop offset="1" stopColor="#F9FAFB" />
                    </linearGradient>
                    <linearGradient id="paint1_gdpr_light" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse">
                      <stop offset="0.188554" stopColor="#364153" stopOpacity="0" /><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                <svg width="46" height="45" viewBox="0 0 46 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
                  <rect x="3" y="0.863281" width="40" height="40" rx="20" fill="url(#paint0_gdpr_dark)" />
                  <path d="M30.6146 31.3062L31.2991 33.4127L33.5139 33.4127L31.7221 34.7145L32.4065 36.821L30.6146 35.5191L28.8228 36.821L29.5072 34.7145L27.7153 33.4127L29.9302 33.4127L30.6146 31.3062Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M23.6857 35.4549L23.0013 33.3485L22.3168 35.4549H20.102L21.8938 36.7568L21.2094 38.8633L23.0013 37.5614L24.7932 38.8633L24.1087 36.7568L25.9006 35.4549H23.6857Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M23.6857 4.96976L23.0013 2.86328L22.3168 4.96975L20.102 4.96975L21.8938 6.27163L21.2094 8.3781L23.0013 7.07623L24.7932 8.3781L24.1087 6.27163L25.9006 4.96975L23.6857 4.96976Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M30.6226 4.90555L31.307 7.01202L33.5219 7.01202L31.73 8.3139L32.4144 10.4204L30.6226 9.1185L28.8307 10.4204L29.5151 8.3139L27.7233 7.01202L29.9381 7.01202L30.6226 4.90555Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M16.0644 33.4127L15.38 31.3062L14.6955 33.4127H12.4807L14.2725 34.7145L13.5881 36.821L15.38 35.5191L17.1719 36.821L16.4874 34.7145L18.2793 33.4127L16.0644 33.4127Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M36.1956 10.4846L36.8801 12.5911L39.095 12.5911L37.3031 13.8929L37.9875 15.9994L36.1956 14.6975L34.4038 15.9994L35.0882 13.8929L33.2963 12.5911L35.5112 12.5911L36.1956 10.4846Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M10.4755 27.8336L9.79104 25.7272L9.1066 27.8336H6.89172L8.6836 29.1355L7.99916 31.242L9.79104 29.9401L11.5829 31.242L10.8985 29.1355L12.6903 27.8336L10.4755 27.8336Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M38.2439 18.1059L38.9283 20.2123L41.1432 20.2123L39.3513 21.5142L40.0357 23.6207L38.2439 22.3188L36.452 23.6207L37.1364 21.5142L35.3446 20.2123H37.5594L38.2439 18.1059Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M8.44313 20.2123L7.75869 18.1059L7.07425 20.2123H4.85938L6.65125 21.5142L5.96682 23.6207L7.75869 22.3188L9.55056 23.6207L8.86613 21.5142L10.658 20.2123H8.44313Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M36.1956 25.7272L36.8801 27.8336H39.095L37.3031 29.1355L37.9875 31.242L36.1956 29.9401L34.4038 31.242L35.0882 29.1355L33.2963 27.8336L35.5112 27.8336L36.1956 25.7272Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M10.4755 12.591L9.79103 10.4846L9.1066 12.591H6.89172L8.6836 13.8929L7.99916 15.9994L9.79103 14.6975L11.5829 15.9994L10.8985 13.8929L12.6903 12.591H10.4755Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M16.0565 7.01202L15.372 4.90555L14.6876 7.01202H12.4727L14.2646 8.3139L13.5802 10.4204L15.372 9.1185L17.1639 10.4204L16.4795 8.3139L18.2714 7.01203L16.0565 7.01202Z" fill="url(#paint1_gdpr_dark)" />
                  <path d="M17.2242 23.0882C16.8122 23.0882 16.4582 22.9942 16.1622 22.8062C15.8662 22.6182 15.6382 22.3582 15.4782 22.0262C15.3182 21.6942 15.2382 21.3082 15.2382 20.8682C15.2382 20.4402 15.3202 20.0582 15.4842 19.7222C15.6482 19.3862 15.8822 19.1222 16.1862 18.9302C16.4942 18.7342 16.8642 18.6362 17.2962 18.6362C17.6762 18.6362 17.9942 18.6982 18.2502 18.8222C18.5102 18.9422 18.7182 19.1162 18.8742 19.3442C19.0342 19.5722 19.1462 19.8442 19.2102 20.1602L18.1302 20.2082C18.0902 19.9802 18.0062 19.8042 17.8782 19.6802C17.7502 19.5522 17.5602 19.4882 17.3082 19.4882C17.0882 19.4882 16.9042 19.5482 16.7562 19.6682C16.6082 19.7882 16.4962 19.9522 16.4202 20.1602C16.3482 20.3642 16.3122 20.6002 16.3122 20.8682C16.3122 21.1362 16.3482 21.3742 16.4202 21.5822C16.4922 21.7862 16.6022 21.9462 16.7502 22.0622C16.9022 22.1782 17.0942 22.2362 17.3262 22.2362C17.4942 22.2362 17.6382 22.2042 17.7582 22.1402C17.8822 22.0762 17.9802 21.9882 18.0522 21.8762C18.1242 21.7602 18.1682 21.6282 18.1842 21.4802H17.3022V20.7542H19.2222V22.9922H18.5982L18.5442 22.1042L18.6642 22.1402C18.6242 22.3282 18.5362 22.4942 18.4002 22.6382C18.2682 22.7782 18.1002 22.8882 17.8962 22.9682C17.6962 23.0482 17.4722 23.0882 17.2242 23.0882ZM19.726 22.9922V18.7322H21.244C21.948 18.7322 22.488 18.9182 22.864 19.2902C23.244 19.6582 23.434 20.1842 23.434 20.8682C23.434 21.5482 23.248 22.0722 22.876 22.4402C22.504 22.8082 21.972 22.9922 21.28 22.9922H19.726ZM20.77 22.1402H21.244C21.628 22.1402 21.91 22.0362 22.09 21.8282C22.27 21.6202 22.36 21.2982 22.36 20.8622C22.36 20.4262 22.27 20.1042 22.09 19.8962C21.91 19.6882 21.628 19.5842 21.244 19.5842H20.77V22.1402ZM23.8058 22.9922V18.7322H25.5698C26.0938 18.7322 26.5038 18.8602 26.7998 19.1162C27.0998 19.3682 27.2498 19.7142 27.2498 20.1542C27.2498 20.4462 27.1818 20.7002 27.0458 20.9162C26.9138 21.1282 26.7218 21.2922 26.4698 21.4082C26.2178 21.5242 25.9178 21.5822 25.5698 21.5822H24.8498V22.9922H23.8058ZM24.8498 20.7242H25.4978C25.7098 20.7242 25.8758 20.6762 25.9958 20.5802C26.1198 20.4842 26.1818 20.3422 26.1818 20.1542C26.1818 19.9702 26.1218 19.8302 26.0018 19.7342C25.8818 19.6342 25.7138 19.5842 25.4978 19.5842H24.8498V20.7242ZM27.5809 22.9922V18.7322H29.5309C29.8469 18.7322 30.1209 18.7842 30.3529 18.8882C30.5889 18.9922 30.7709 19.1402 30.8989 19.3322C31.0269 19.5202 31.0909 19.7422 31.0909 19.9982C31.0909 20.1982 31.0509 20.3742 30.9709 20.5262C30.8909 20.6782 30.7789 20.8042 30.6349 20.9042C30.4949 21.0002 30.3269 21.0642 30.1309 21.0962L30.1129 21.0362C30.4049 21.0362 30.6249 21.0982 30.7729 21.2222C30.9249 21.3462 31.0089 21.5322 31.0249 21.7802L31.1269 22.9922H30.0589L29.9929 21.9542C29.9809 21.7942 29.9329 21.6762 29.8489 21.6002C29.7689 21.5242 29.6269 21.4862 29.4229 21.4862H28.6249V22.9922H27.5809ZM28.6249 20.6342H29.3689C29.5809 20.6342 29.7429 20.5882 29.8549 20.4962C29.9669 20.4042 30.0229 20.2742 30.0229 20.1062C30.0229 19.9342 29.9649 19.8042 29.8489 19.7162C29.7369 19.6282 29.5729 19.5842 29.3569 19.5842H28.6249V20.6342Z" fill="#D4D4D8" />
                  <defs>
                    <linearGradient id="paint0_gdpr_dark" x1="9.88803" y1="6.55415" x2="36.0447" y2="35.5773" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#27272A" /><stop offset="1" stopColor="#52525C" />
                    </linearGradient>
                    <linearGradient id="paint1_gdpr_dark" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse">
                      <stop offset="0.188554" stopColor="#FAFAFA" stopOpacity="0" /><stop offset="0.526459" stopColor="#FAFAFA" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex flex-wrap gap-x-12 gap-y-6 md:gap-x-16">
            {footerLinks.map((column, columnIndex) => (
              <ul key={columnIndex} className="flex flex-col gap-y-2">
                <li className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {column.title}
                </li>
                {column.links.map((link) => (
                  <li
                    key={link.id}
                    className="text-sm font-light transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Link href={link.url}>{link.title}</Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t text-xs font-light border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} TermsDigest. All rights reserved.
        </div>
      </div>

      {/* Flickering Grid - only render after mounting for correct theme colors */}
      <div className="w-full h-32 md:h-40 relative z-0">
        <div className="absolute inset-0 z-10 from-40% bg-gradient-to-t from-transparent to-white dark:to-black" />
        <div className="absolute inset-0 mx-6">
          {mounted && (
            <FlickeringGrid
              text={tablet ? "TermsDigest" : "Terms Made Simple"}
              fontSize={tablet ? 50 : 70}
              className="h-full w-full"
              squareSize={2}
              gridGap={tablet ? 2 : 3}
              color={isDark ? "#6B7280" : "#9CA3AF"}
              maxOpacity={isDark ? 0.3 : 0.4}
              flickerChance={0.1}
            />
          )}
        </div>
      </div>
    </footer>
  );
};

export default FlickeringFooter;
