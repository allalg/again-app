import { cn } from '@/lib/utils'

interface ArtProps {
  className?: string
}

// 1. Abstract Modernist Exhibition Logo (top left of reference image)
export function ExhibitionMark({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={cn('w-7 h-7', className)}>
      <path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C65 85 80 75 85 60 C80 68 70 75 58 75 C38 75 25 62 25 45 C25 28 40 18 60 18 C72 18 82 24 87 32 C82 22 68 15 50 15 Z" />
      <circle cx="58" cy="42" r="10" />
    </svg>
  )
}

// 2. Classical Botanical Ivy & Sanguine Hand Etching (right side of reference image)
export function BotanicalHandEtching({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 340 520" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('w-full h-auto', className)}>
      {/* Sanguine Classical Hand */}
      <g stroke="#c24b38" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        {/* Palm & Wrist */}
        <path d="M120 480 C125 420 130 380 145 340 C155 310 160 270 160 220" />
        <path d="M230 480 C220 430 215 385 210 330 C205 280 210 230 215 190" />
        
        {/* Thumb */}
        <path d="M142 320 C120 280 105 230 110 200 C114 185 125 180 135 195 C145 210 152 235 160 260" />
        {/* Fine crosshatch thumb */}
        <path d="M120 220 L135 230 M118 235 L138 245 M122 250 L145 260" strokeWidth="0.8" opacity="0.6" />

        {/* Index Finger */}
        <path d="M162 215 C160 160 165 110 175 80 C182 60 195 62 198 85 C202 115 198 160 195 210" />
        {/* Fine crosshatch index */}
        <path d="M172 110 L190 120 M170 130 L192 140 M168 150 L194 160 M166 170 L195 180" strokeWidth="0.8" opacity="0.6" />

        {/* Middle Finger */}
        <path d="M198 160 C205 120 215 70 228 45 C236 30 248 35 248 55 C248 90 238 145 230 190" />
        {/* Fine crosshatch middle */}
        <path d="M218 80 L238 92 M215 100 L240 115 M212 120 L238 135 M208 140 L234 155" strokeWidth="0.8" opacity="0.6" />

        {/* Ring Finger */}
        <path d="M232 185 C245 150 258 110 268 95 C275 85 284 90 280 110 C274 140 258 185 248 215" />
        {/* Fine crosshatch ring */}
        <path d="M250 125 L270 138 M248 145 L266 158" strokeWidth="0.8" opacity="0.6" />

        {/* Pinky Finger */}
        <path d="M246 220 C265 195 282 170 292 165 C300 160 305 170 298 188 C286 218 265 255 250 280" />
        {/* Fine crosshatch palm */}
        <path d="M170 260 C185 280 195 300 195 320" strokeWidth="1" />
        <path d="M155 350 L185 345 M150 370 L190 360 M145 390 L195 380 M140 410 L200 400" strokeWidth="0.8" opacity="0.6" />
      </g>

      {/* Deep Botanical Leaves & Vines Twining Around Hand */}
      <g stroke="#2e4a3b" strokeWidth="1.8" fill="#3d614e" fillOpacity="0.85" strokeLinecap="round" strokeLinejoin="round">
        {/* Main Vine Stem */}
        <path d="M100 460 C110 390 140 330 130 280 C120 220 150 170 140 120 C130 80 150 40 180 20" fill="none" strokeWidth="2.2" />
        <path d="M130 280 C160 260 190 290 220 270 C250 250 260 210 280 190" fill="none" strokeWidth="1.8" />
        
        {/* Leaves */}
        {/* Leaf 1 */}
        <path d="M135 270 C120 250 90 260 85 285 C80 310 115 310 135 270 Z" />
        {/* Leaf 2 */}
        <path d="M165 240 C175 210 205 205 215 225 C220 245 190 265 165 240 Z" />
        {/* Leaf 3 */}
        <path d="M210 275 C230 260 255 270 260 290 C265 310 230 320 210 275 Z" />
        {/* Leaf 4 */}
        <path d="M125 180 C105 165 100 140 115 130 C135 120 150 150 125 180 Z" />
        {/* Leaf 5 */}
        <path d="M140 115 C130 90 150 65 170 70 C185 80 175 110 140 115 Z" />
        {/* Flower Buds at the top */}
        <path d="M180 20 C185 10 200 15 195 28 C190 35 180 30 180 20 Z" fill="#faf6ef" stroke="#2e4a3b" strokeWidth="1.2" />
        <path d="M190 30 C205 25 215 35 210 45 C205 52 195 45 190 30 Z" fill="#faf6ef" stroke="#2e4a3b" strokeWidth="1.2" />
      </g>
    </svg>
  )
}

// 3. Surrealist Celestial Eye Medallion (left side of reference image)
export function SurrealistEyeMedallion({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('w-28 h-auto', className)}>
      {/* Outer Ethereal Halo Radiance */}
      <circle cx="80" cy="60" r="54" stroke="#c29336" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.7" />
      <circle cx="80" cy="60" r="50" stroke="#c29336" strokeWidth="0.5" opacity="0.4" />
      
      {/* Eye Outline */}
      <path d="M25 60 C45 35 115 35 135 60 C115 85 45 85 25 60 Z" stroke="#221d19" strokeWidth="1.8" fill="#faf6ef" fillOpacity="0.9" />
      
      {/* Iris */}
      <circle cx="80" cy="60" r="22" stroke="#3d614e" strokeWidth="1.5" fill="#56826b" fillOpacity="0.4" />
      <circle cx="80" cy="60" r="16" fill="#2e4a3b" />
      <circle cx="80" cy="60" r="8" fill="#171614" />
      {/* Catchlight */}
      <circle cx="75" cy="55" r="3.5" fill="#faf6ef" />
      
      {/* Delicate Sanguine Eyelashes / Accent */}
      <path d="M40 45 L35 38 M60 38 L58 28 M80 36 L80 25 M100 38 L102 28 M120 45 L125 38" stroke="#c24b38" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// 4. Botanical Shell with Sunburst Rays (bottom of reference image)
export function CelestialShellArtwork({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('w-full h-auto', className)}>
      {/* Sunburst Rays */}
      <g stroke="#c29336" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.7">
        <line x1="160" y1="110" x2="160" y2="20" />
        <line x1="160" y1="110" x2="225" y2="45" />
        <line x1="160" y1="110" x2="250" y2="110" />
        <line x1="160" y1="110" x2="225" y2="175" />
        <line x1="160" y1="110" x2="160" y2="200" />
        <line x1="160" y1="110" x2="95" y2="175" />
        <line x1="160" y1="110" x2="70" y2="110" />
        <line x1="160" y1="110" x2="95" y2="45" />
      </g>

      {/* Nautilus Shell Geometry */}
      <path d="M160 110 C145 95 125 105 125 125 C125 155 165 170 195 155 C225 140 235 95 210 65 C180 35 120 40 85 80 C50 120 60 190 120 215" stroke="#221d19" strokeWidth="1.5" fill="#faf6ef" fillOpacity="0.85" />
      
      {/* Classical Floral Blossom Nestled in Shell */}
      <g fill="#faf7f2" stroke="#c24b38" strokeWidth="1.2">
        <circle cx="160" cy="85" r="14" />
        <circle cx="145" cy="80" r="12" />
        <circle cx="175" cy="80" r="12" />
        <circle cx="160" cy="70" r="12" />
        <circle cx="160" cy="85" r="5" fill="#c29336" />
      </g>
      
      {/* Botanical leaves around shell */}
      <path d="M125 110 C100 115 85 135 95 150 C110 160 130 140 125 110 Z" fill="#3d614e" stroke="#2e4a3b" strokeWidth="1" />
      <path d="M185 100 C210 100 230 115 225 130 C215 145 195 130 185 100 Z" fill="#3d614e" stroke="#2e4a3b" strokeWidth="1" />

      {/* Extended Classical Hand Reaching to Left */}
      <g stroke="#c24b38" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 130 C40 130 65 135 90 125 C105 120 115 110 120 112" />
        <path d="M30 145 C50 145 75 145 95 135" />
        {/* Butterfly upon fingers */}
        <path d="M40 120 C35 110 30 110 32 118 C30 110 25 112 28 122 Z" fill="#c29336" stroke="#171614" strokeWidth="0.8" />
      </g>
    </svg>
  )
}

// 5. Circular "ENTER ->" Badge Button
export function CircularEnterStamp({ className, text = "ENTER" }: { className?: string, text?: string }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center cursor-pointer group", className)}>
      <svg viewBox="0 0 110 110" className="w-24 h-24 text-foreground/70 group-hover:text-primary transition-all duration-300 group-hover:rotate-45">
        <circle cx="55" cy="55" r="48" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" fill="none" />
        <circle cx="55" cy="55" r="42" stroke="currentColor" strokeWidth="0.75" fill="none" opacity="0.6" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-cinzel text-xs font-semibold tracking-[0.2em] uppercase text-foreground group-hover:text-primary transition-colors">
        <span>{text}</span>
        <span className="ml-1 text-sm font-sans">→</span>
      </div>
    </div>
  )
}

// 6. Classical Wax Seal / Museum Honor Badge
export function ArchivalSeal({ label = "VERIFIED", number = "90D", className }: { label?: string, number?: string, className?: string }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div className="w-16 h-16 rounded-full border border-cinnabar-600/40 bg-cinnabar-500/10 flex flex-col items-center justify-center p-2 text-center text-cinnabar-600 dark:text-cinnabar-400">
        <span className="font-mono text-[8px] tracking-[0.2em] uppercase">{label}</span>
        <span className="font-serif text-sm font-bold leading-none my-0.5">{number}</span>
        <span className="font-cinzel text-[7px] tracking-widest uppercase">EPOCH</span>
      </div>
    </div>
  )
}
