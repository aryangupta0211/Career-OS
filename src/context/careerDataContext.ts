import { createContext } from 'react'
import type { CareerData, RecordType } from '../types'

export interface CareerDataContextValue {
  data: CareerData
  addRecord: (type: RecordType, values: Record<string, string>) => void
  updateRecord: (type: RecordType, id: string, values: Record<string, string>) => void
  deleteRecord: (type: RecordType, id: string) => void
  toggleTask: (id: string) => void
}

export const CareerDataContext = createContext<CareerDataContextValue | null>(null)
