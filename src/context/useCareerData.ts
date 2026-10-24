import { useContext } from 'react'
import { CareerDataContext } from './careerDataContext'

export function useCareerData() {
  const context = useContext(CareerDataContext)
  if (!context) throw new Error('useCareerData must be used within CareerDataProvider')
  return context
}
