declare module 'gifuct-js' {
  interface ParsedGIF {
    lsd: { width: number; height: number }
    frames: any[]
  }

  interface DecompressedFrame {
    dims: { width: number; height: number; left: number; top: number }
    patch: Uint8ClampedArray
    delay: number
    disposalType: number
    transparentIndex?: number
  }

  export function parseGIF(data: ArrayBuffer): ParsedGIF
  export function decompressFrames(gif: ParsedGIF, buildImagePatches: boolean): DecompressedFrame[]
}

declare module 'gifenc' {
  interface WriteFrameOptions {
    palette?: number[][]
    delay?: number
    dispose?: number
    transparent?: boolean
    transparentIndex?: number
  }

  interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
    buffer: ArrayBuffer
    stream: any
  }

  export function GIFEncoder(opts?: { auto?: boolean }): GIFEncoderInstance
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: any): number[][]
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): Uint8Array
  export function nearestColorIndex(palette: number[][], pixel: number[]): number
  export function nearestColor(palette: number[][], pixel: number[]): number[]
  export function snapColorsToPalette(palette: number[][], knownColors: number[][], threshold?: number): void
  export function prequantize(rgba: Uint8Array | Uint8ClampedArray, options?: any): void
}
