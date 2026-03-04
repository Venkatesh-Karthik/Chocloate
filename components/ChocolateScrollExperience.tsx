"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useSpring, useTransform, motion, MotionValue } from "framer-motion";

const FRAME_COUNT = 120;
// Format: frame_0.jpg ... frame_119.jpg
const currentFrame = (index: number) => `/sequence/frame_${index}.jpg`;

// Helper component for Scrollytelling text beats
function TextBeat({
    scrollYProgress,
    start,
    end,
    titleHighlight,
    titleRest,
    subtitle,
    alignment = "center",
}: {
    scrollYProgress: MotionValue<number>;
    start: number;
    end: number;
    titleHighlight: string;
    titleRest: string;
    subtitle: string;
    alignment?: "left" | "right" | "center";
}) {
    const range = [start, start + 0.1, end - 0.1, end];
    const opacity = useTransform(scrollYProgress, range, [0, 1, 1, 0]);
    const y = useTransform(scrollYProgress, range, [20, 0, 0, -20]);

    const alignClass =
        alignment === "left"
            ? "items-start text-left"
            : alignment === "right"
                ? "items-end text-right"
                : "items-center text-center";

    return (
        <motion.div
            style={{ opacity, y }}
            className={`absolute inset-0 flex flex-col justify-center px-6 md:px-20 z-10 pointer-events-none ${alignClass}`}
        >
            <h2 className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-white/90 mb-4 drop-shadow-xl">
                {titleHighlight && <span className="text-amber-400/90">{titleHighlight}</span>}{" "}
                {titleRest}
            </h2>
            <p className="text-xl md:text-3xl font-light tracking-wide text-white/60 max-w-2xl drop-shadow-lg">
                {subtitle}
            </p>
        </motion.div>
    );
}

export default function ChocolateScrollExperience() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [loadedFrames, setLoadedFrames] = useState(0);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const isLoaded = loadedFrames === FRAME_COUNT;

    // Preload images & set mounted state
    useEffect(() => {
        setIsMounted(true);
        const loadedImages: HTMLImageElement[] = [];
        let loadedCount = 0;

        for (let i = 0; i < FRAME_COUNT; i++) {
            const img = new Image();
            img.src = currentFrame(i);
            img.onload = () => {
                loadedCount++;
                setLoadedFrames(loadedCount);
                if (loadedCount === FRAME_COUNT) {
                    setImages(loadedImages);
                }
            };
            // Important to push to index i to preserve order of loaded images
            loadedImages[i] = img;
        }
    }, []);

    // Use a state to hold the DOM element instead of passing the ref object directly
    // This entirely avoids Framer Motion's "Target ref is defined but not hydrated" SSR error.
    const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);

    // Attach the element to state only after mounting on the client
    const handleRef = (node: HTMLDivElement | null) => {
        if (node !== null && !containerElement) {
            setContainerElement(node);
        }
    };

    const { scrollYProgress } = useScroll({
        target: containerElement ? { current: containerElement } : undefined,
        offset: ["start start", "end end"],
    });

    const springScroll = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    // Canvas drawing logic
    useEffect(() => {
        if (!isLoaded || images.length === 0) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            // Resize canvas to window if it changed
            const width = window.innerWidth;
            const height = window.innerHeight;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            const rawProgress = springScroll.get();
            // map progress 0-1 to frame 0-119
            const frameIndex = Math.min(
                FRAME_COUNT - 1,
                Math.max(0, Math.floor(rawProgress * FRAME_COUNT))
            );

            const img = images[frameIndex];
            // ensure image is successfully loaded and valid before drawing
            if (img && img.complete && img.naturalHeight !== 0) {
                // clear canvas
                ctx.clearRect(0, 0, width, height);

                // "contain" scaling logic
                const imgRatio = img.width / img.height;
                const canvasRatio = width / height;
                let drawWidth, drawHeight, offsetX, offsetY;

                if (imgRatio > canvasRatio) {
                    drawWidth = width;
                    drawHeight = width / imgRatio;
                    offsetX = 0;
                    offsetY = (height - drawHeight) / 2;
                } else {
                    drawHeight = height;
                    drawWidth = height * imgRatio;
                    offsetX = (width - drawWidth) / 2;
                    offsetY = 0;
                }

                // Draw image
                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            }
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [isLoaded, images, springScroll]);

    const scrollIndicatorOpacity = useTransform(springScroll, [0, 0.1], [1, 0]);

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0f19]">
                <div className="w-12 h-12 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-8"></div>
                <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-amber-400 transition-all duration-300 ease-out"
                        style={{ width: `${(loadedFrames / FRAME_COUNT) * 100}%` }}
                    />
                </div>
                <div className="mt-4 text-white/50 font-light tracking-widest text-sm uppercase">
                    Tempering Craft... {Math.round((loadedFrames / FRAME_COUNT) * 100)}%
                </div>
            </div>
        );
    }

    return (
        <div ref={handleRef} className="relative h-[400vh] bg-[#0b0f19]">
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Canvas for image sequence */}
                <canvas ref={canvasRef} className="w-full h-full object-contain" />

                {/* Scroll Indicator */}
                <motion.div
                    style={{ opacity: scrollIndicatorOpacity }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                >
                    <div className="text-white/40 tracking-widest text-xs uppercase mb-2">Scroll to Explore</div>
                    <div className="w-px h-16 bg-gradient-to-b from-white/40 to-transparent" />
                </motion.div>

                {/* Text Beats */}
                {/* Beat A — 0–20% */}
                <TextBeat
                    scrollYProgress={springScroll}
                    start={0} end={0.2}
                    titleHighlight="PURE"
                    titleRest="CACAO"
                    subtitle="75% Artisan Dark Chocolate."
                    alignment="center"
                />

                {/* Beat B — 25–45% */}
                <TextBeat
                    scrollYProgress={springScroll}
                    start={0.25} end={0.45}
                    titleHighlight="GILDED"
                    titleRest="& SALTED"
                    subtitle="Hand-placed 24K gold leaf and flaky sea salt crystals."
                    alignment="left"
                />

                {/* Beat C — 50–70% */}
                <TextBeat
                    scrollYProgress={springScroll}
                    start={0.5} end={0.7}
                    titleHighlight="THE"
                    titleRest="MOLTEN CORE"
                    subtitle="Dynamic fluid dynamics revealing a rich, flowing heart."
                    alignment="right"
                />

                {/* Beat D — 75–95% */}
                <TextBeat
                    scrollYProgress={springScroll}
                    start={0.75} end={0.95}
                    titleHighlight="TASTE"
                    titleRest="THE CRAFT"
                    subtitle="Experience the ultimate gourmet indulgence."
                    alignment="center"
                />
            </div>
        </div>
    );
}
