export interface ActivityLogItem {
  id: string;
  userId?: string | null;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  actionType: string;
  actionLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  status: string;
  severity: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  location?: string | null;
  metadata?: string | null;
  createdAt: string;
  abnormal: boolean;
  abnormalReason?: string | null;
}

export interface ActivityLogSummary {
  totalLogs: number;
  failedLoginCount: number;
  blockedMessageCount: number;
  suspiciousActivityCount: number;
  topActiveUser?: string | null;
  topActiveUserFullName?: string | null;
  topActiveUserLogCount: number;
}

export interface ActivityLogPagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ActivityLogPageResponse {
  items: ActivityLogItem[];
  content?: ActivityLogItem[];
  pagination?: ActivityLogPagination;
  summary?: ActivityLogSummary;
  totalElements?: number;
  totalPages?: number;
}

export interface ActivityLogFilters {
  username?: string;
  actionType?: string;
  status?: string;
  severity?: string;
  from?: string;
  to?: string;
  abnormalOnly?: boolean;
}
