import { type Operation } from '@electric-sql/client'

export type Change = {
  id: number
  operation: Operation
  value: {
    id: string
    user_id?: number
    round_id?: number
    number?: number
    timestamp?: Date
  }
  write_id: string
  transaction_id: string
}

export type Transaction = {
  id: string
  changes: Change[]
} 