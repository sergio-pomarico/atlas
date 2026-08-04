import { motion } from "motion/react";

export function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, index) => ({
    id: index,
    d: `M-${380 - index * 5 * position} -${189 + index * 6}C-${
      380 - index * 5 * position
    } -${189 + index * 6} -${312 - index * 5 * position} ${
      216 - index * 6
    } ${152 - index * 5 * position} ${343 - index * 6}C${
      616 - index * 5 * position
    } ${470 - index * 6} ${684 - index * 5 * position} ${
      875 - index * 6
    } ${684 - index * 5 * position} ${875 - index * 6}`,
    width: 0.5 + index * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        aria-hidden="true"
        className="h-full w-full text-primary-foreground"
        fill="none"
        viewBox="0 0 696 316"
      >
        {paths.map((path) => (
          <motion.path
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            d={path.d}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            key={path.d}
            stroke="currentColor"
            strokeOpacity={0.1 + path.id * 0.03}
            strokeWidth={path.width}
            transition={{
              duration: 20 + Math.random() * 10,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
