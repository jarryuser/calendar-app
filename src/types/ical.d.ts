declare module 'ical.js' {
  export function parse(input: string): unknown[]

  export class Component {
    constructor(jcal: unknown)
    getAllSubcomponents(name: string): Component[]
    getFirstProperty(name: string): Property | null
    addSubcomponent(comp: Component): void
    updatePropertyWithValue(name: string, value: unknown): void
    toString(): string
  }

  export class Event {
    constructor(component: Component)
    summary: string
    description: string
    location: string
    startDate: Time
    endDate: Time
  }

  export class Property {
    getFirstValue(): unknown
  }

  export class Recur {
    constructor(options?: { freq?: string })
    freq: string
    interval: number
    byday: Array<{ day: string; num: number }>
    bymonthday: number[]
    count: number
    until: Time | null
    toICALString(): string
  }

  export class Time {
    constructor()
    isDate: boolean
    static fromJSDate(date: Date, useUTC?: boolean): Time
    toJSDate(): Date
    toICALString(): string
  }

  export class Duration {
    toSeconds(): number
  }
}
