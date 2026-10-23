declare module 'ical.js' {
  export function parse(input: string): unknown[]

  export class Component {
    constructor(jcal: unknown)
    getAllSubcomponents(name: string): Component[]
    getFirstProperty(name: string): Property | null
    getAllProperties(name: string): Property[]
    removeAllProperties(name: string): boolean
    toJSON(): unknown[]
    addSubcomponent(comp: Component): void
    updatePropertyWithValue(name: string, value: unknown): void
    toString(): string
  }

  export class Event {
    constructor(component: Component)
    uid: string
    summary: string
    description: string
    location: string
    startDate: Time
    endDate: Time
    recurrenceId: Time
    iterator(startTime?: Time): { next(): Time | null }
  }

  export class Property {
    getFirstValue(): unknown
    getValues(): unknown[]
    getParameter(name: string): string
    removeParameter(name: string): void
  }

  export class Recur {
    constructor(options?: { freq?: string })
    freq: string
    interval: number
    parts: { BYDAY?: string[]; BYMONTHDAY?: number[] }
    count: number
    until: Time | null
    toString(): string
    toICALString(): string
  }

  export class Time {
    constructor()
    isDate: boolean
    year: number
    month: number
    day: number
    static fromString(value: string): Time
    static fromJSDate(date: Date, useUTC?: boolean): Time
    toJSDate(): Date
    toString(): string
    toICALString(): string
  }

  export class Timezone { constructor(options: { component: Component; tzid: string }) }
  export const TimezoneService: { register(name: string, zone: Timezone): void }

  export class Duration {
    toSeconds(): number
  }
}
