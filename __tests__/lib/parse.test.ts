// __tests__/lib/parse.test.ts
import { parseSentiment, parseConfidence, parsePriceImpact } from '@/lib/parse'

describe('parseSentiment', () => {
  it('returns BULLISH when text contains BULLISH', () => {
    expect(parseSentiment('This is a BULLISH scenario for EQR.')).toBe('BULLISH')
  })
  it('returns BEARISH when text contains BEARISH', () => {
    expect(parseSentiment('The outlook is BEARISH given macro headwinds.')).toBe('BEARISH')
  })
  it('returns NEUTRAL when neither keyword found', () => {
    expect(parseSentiment('This is ambiguous.')).toBe('NEUTRAL')
  })
  it('returns NEUTRAL for empty string', () => {
    expect(parseSentiment('')).toBe('NEUTRAL')
  })
  it('finds BULLISH case-insensitively (lowercase in text)', () => {
    expect(parseSentiment('bullish on the stock')).toBe('BULLISH')
  })
  it('returns BULLISH for first match when both present', () => {
    expect(parseSentiment('BULLISH short term but BEARISH long term')).toBe('BULLISH')
  })
})

describe('parseConfidence', () => {
  it('parses labeled confidence percentage', () => {
    expect(parseConfidence('My analysis. Confidence: 78%')).toBe(78)
  })
  it('is case-insensitive', () => {
    expect(parseConfidence('CONFIDENCE: 45%')).toBe(45)
  })
  it('clamps to 100', () => {
    expect(parseConfidence('Confidence: 150%')).toBe(100)
  })
  it('clamps to 0', () => {
    expect(parseConfidence('Confidence: -5%')).toBe(0)
  })
  it('returns null when not found', () => {
    expect(parseConfidence('No confidence here.')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseConfidence('')).toBeNull()
  })
})

describe('parsePriceImpact', () => {
  it('parses labeled price impact range', () => {
    expect(parsePriceImpact('Price impact: -10% to +25%')).toEqual({ low: -10, high: 25 })
  })
  it('parses with spaces around label', () => {
    expect(parsePriceImpact('Some text.\nPrice impact: -5% to +15%\n')).toEqual({ low: -5, high: 15 })
  })
  it('parses decimal values', () => {
    expect(parsePriceImpact('Price impact: -2.5% to +7.5%')).toEqual({ low: -2.5, high: 7.5 })
  })
  it('parses negative-only range', () => {
    expect(parsePriceImpact('Price impact: -30% to -5%')).toEqual({ low: -30, high: -5 })
  })
  it('returns null when label absent', () => {
    expect(parsePriceImpact('revenue grew 10% to 15%')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parsePriceImpact('')).toBeNull()
  })
})
