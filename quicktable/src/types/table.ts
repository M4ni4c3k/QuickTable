export interface Table {
  number: number,
  status: 'free' | 'occupied' | 'reserved',
  customerName?: string,
  reservationTime?: string,
  orders: Array<{
    id: string,
    items: Array<{
      id: string,
      name: string,
      price: number,
      quantity: number
    }>,
    total: number,
    status: 'pending' | 'completed'
  }>
}