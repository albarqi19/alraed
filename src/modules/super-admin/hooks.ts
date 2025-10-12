import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  fetchPlatformFilters,
  fetchPlatformOverview,
  fetchPlatformRecentInvoices,
  fetchPlatformRevenueTrends,
  fetchPlatformSchools,
} from './api'
import { platformQueryKeys } from './query-keys'

export function usePlatformOverviewQuery() {
  return useQuery({
    queryKey: platformQueryKeys.overview(),
    queryFn: fetchPlatformOverview,
    refetchInterval: 1000 * 60 * 5, // كل خمس دقائق
  })
}

export function usePlatformRevenueTrendsQuery() {
  return useQuery({
    queryKey: platformQueryKeys.revenue(),
    queryFn: fetchPlatformRevenueTrends,
    staleTime: 1000 * 60 * 10,
  })
}

export function usePlatformRecentInvoicesQuery() {
  return useQuery({
    queryKey: platformQueryKeys.invoices(),
    queryFn: fetchPlatformRecentInvoices,
    refetchInterval: 1000 * 60 * 10,
  })
}

export function usePlatformFiltersQuery() {
  return useQuery({
    queryKey: platformQueryKeys.filters(),
    queryFn: fetchPlatformFilters,
    staleTime: 1000 * 60 * 60,
  })
}

export function usePlatformSchoolsQuery(params: { page?: number; search?: string; status?: string | null; plan?: string | null }) {
  return useQuery({
    queryKey: platformQueryKeys.schools(params),
    queryFn: () => fetchPlatformSchools(params),
    placeholderData: keepPreviousData,
  })
}
