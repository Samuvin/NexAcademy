"use client"

import type React from "react"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function PlaceholdersAndVanishInput({
  placeholders,
  onChange,
  onSubmit,
  multiline = false,
  maxLength = 200,
}: {
  placeholders: string[]
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  multiline?: boolean
  maxLength?: number
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 3000)
  }
  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current) // Clear the interval when the tab is not visible
      intervalRef.current = null
    } else if (document.visibilityState === "visible") {
      startAnimation() // Restart the interval when the tab becomes visible
    }
  }

  useEffect(() => {
    startAnimation()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [placeholders])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const newDataRef = useRef<any[]>([])
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const [value, setValue] = useState("")
  const [animating, setAnimating] = useState(false)

  const draw = useCallback(() => {
    if (!inputRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 800
    canvas.height = 800
    ctx.clearRect(0, 0, 800, 800)
    const computedStyles = getComputedStyle(inputRef.current)

    const fontSize = Number.parseFloat(computedStyles.getPropertyValue("font-size"))
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`
    ctx.fillStyle = "#FFF"
    ctx.fillText(value, 16, 40)

    const imageData = ctx.getImageData(0, 0, 800, 800)
    const pixelData = imageData.data
    const newData: any[] = []

    for (let t = 0; t < 800; t++) {
      const i = 4 * t * 800
      for (let n = 0; n < 800; n++) {
        const e = i + 4 * n
        if (pixelData[e] !== 0 && pixelData[e + 1] !== 0 && pixelData[e + 2] !== 0) {
          newData.push({
            x: n,
            y: t,
            color: [pixelData[e], pixelData[e + 1], pixelData[e + 2], pixelData[e + 3]],
          })
        }
      }
    }

    newDataRef.current = newData.map(({ x, y, color }) => ({
      x,
      y,
      r: 1,
      color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
    }))
  }, [value])

  useEffect(() => {
    draw()
  }, [value, draw])

  const animate = (start: number) => {
    const animateFrame = (pos = 0) => {
      requestAnimationFrame(() => {
        const newArr = []
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i]
          if (current.x < pos) {
            newArr.push(current)
          } else {
            if (current.r <= 0) {
              current.r = 0
              continue
            }
            current.x += Math.random() > 0.5 ? 1 : -1
            current.y += Math.random() > 0.5 ? 1 : -1
            current.r -= 0.05 * Math.random()
            newArr.push(current)
          }
        }
        newDataRef.current = newArr
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800)
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color } = t
            if (n > pos) {
              ctx.beginPath()
              ctx.rect(n, i, s, s)
              ctx.fillStyle = color
              ctx.strokeStyle = color
              ctx.stroke()
            }
          })
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8)
        } else {
          setValue("")
          setAnimating(false)
        }
      })
    }
    animateFrame(start)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !animating && !multiline) {
      vanishAndSubmit()
    }
  }

  const vanishAndSubmit = () => {
    setAnimating(true)
    draw()

    const value = inputRef.current?.value || ""
    if (value && inputRef.current) {
      const maxX = newDataRef.current.reduce((prev, current) => (current.x > prev ? current.x : prev), 0)
      animate(maxX)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    vanishAndSubmit()
    onSubmit && onSubmit(e)
  }

  const InputComponent = multiline ? "textarea" : "input"

  // Calculate character count color based on how close to the limit
  const getCharCountColor = () => {
    const percentage = value.length / maxLength
    if (percentage >= 0.9) return "text-red-400" // 90% or more - red
    if (percentage >= 0.75) return "text-yellow-400" // 75% or more - yellow
    return "text-blue-400" // default - blue
  }

  return (
    <form
      className={cn(
        "w-full relative mx-auto transition duration-300",
        multiline
          ? "rounded-xl h-auto shadow-[0px_2px_10px_-1px_rgba(0,0,0,0.2),_0px_1px_0px_0px_rgba(25,28,33,0.05),_0px_0px_0px_1px_rgba(25,28,33,0.1)]"
          : "rounded-full h-[54px]",
        "onboarding-input backdrop-blur-xl border border-indigo-500/20 dark:border-indigo-500/30"
      )}
      onSubmit={handleSubmit}
    >
      <canvas
        className={cn(
          "absolute pointer-events-none text-base transform scale-50 top-[20%] left-2 sm:left-8 origin-top-left filter invert dark:invert-0 pr-20",
          !animating ? "opacity-0" : "opacity-100",
        )}
        ref={canvasRef}
      />

      <InputComponent
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          if (!animating) {
            setValue(e.target.value)
            onChange && onChange(e)
          }
        }}
        onKeyDown={handleKeyDown}
        ref={inputRef as any}
        value={value}
        maxLength={maxLength}
        className={cn(
          "w-full relative text-sm sm:text-base z-50 border-none dark:text-white bg-transparent text-white focus:outline-none focus:ring-0 pl-5 sm:pl-10 pr-20",
          animating && "text-transparent dark:text-transparent",
          multiline ? "rounded-xl h-40 py-4 resize-none pb-8" : "rounded-full h-[54px]",
        )}
        placeholder=""
      />

      {value && (
        <button
          type="submit"
          className={cn(
            "absolute right-2 z-50 px-4 rounded-full border transition duration-300 flex items-center justify-center text-xs",
            multiline ? "top-4 h-7" : "top-1/2 -translate-y-1/2 h-7",
            "bg-gradient-to-r from-indigo-900/80 to-indigo-700/80 border-indigo-500/40 text-indigo-100 hover:from-indigo-800/90 hover:to-indigo-600/90 hover:border-indigo-500/60 backdrop-blur-md"
          )}
        >
          clear
        </button>
      )}

      {/* Character count indicator - only show for multiline */}
      {multiline && (
        <div className={cn("absolute bottom-2 right-4 text-xs font-medium z-50", getCharCountColor())}>
          {value.length}/{maxLength}
        </div>
      )}

      <div
        className={cn(
          "absolute inset-0 flex pointer-events-none",
          multiline ? "items-start pt-4 rounded-xl" : "items-center rounded-full",
        )}
      >
        <AnimatePresence mode="wait">
          {!value && (
            <motion.p
              initial={{
                y: 5,
                opacity: 0,
              }}
              key={`current-placeholder-${currentPlaceholder}`}
              animate={{
                y: 0,
                opacity: 0.7,
              }}
              exit={{
                y: -15,
                opacity: 0,
              }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              className="dark:text-indigo-300/80 text-sm sm:text-base font-light text-indigo-200/80 pl-5 sm:pl-10 text-left w-[calc(100%-2rem)] truncate"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Premium subtle glow effect */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none opacity-50"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 70%)',
        }}
      ></div>
    </form>
  )
}