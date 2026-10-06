export type Bar = [number, number, number, number, number, number]; // yyyymmdd, o, h, l, c, v
export type Timeframe = 'd' | 'w' | 'm' | 'q' | 'y';
export type Market = 'KR' | 'US';
export interface Leg { symbol: string; name: string; mult: number; file: string; available: boolean; stale: boolean; lastDate: number | null }
export interface Pair { id: string; market: Market; underlying: string; longs: Leg[]; shorts: Leg[] }
export interface PairsDoc { generatedAt: string; pairs: Pair[] }
export interface OhlcFile { symbol: string; market: Market; currency: string; bars: Bar[] }
