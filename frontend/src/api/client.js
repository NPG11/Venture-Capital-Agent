import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 120000,
})

export const analyzeCompany = (company, stage) =>
  api.post('/analyze', { company, stage })

export const getDeals = () =>
  api.get('/deals')

export const getDeal = (id) =>
  api.get(`/deals/${id}`)

export const compareDeals = (company_a, company_b) =>
  api.post('/compare', { company_a, company_b })

export const getSectors = () =>
  api.get('/sectors')
