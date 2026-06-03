import { SupportCategory, SupportPriority, SupportStatus } from '@/services/api/support';

export const getCategoryLabel = (cat?: SupportCategory) => {
  if (cat === undefined) return '';
  switch (cat) {
    case SupportCategory.Dispute:
      return 'Tranh chấp';
    case SupportCategory.Payment:
      return 'Thanh toán';
    case SupportCategory.Technical:
      return 'Kỹ thuật';
    case SupportCategory.Other:
    default:
      return 'Khác';
  }
};

export const getPriorityStyle = (pri?: SupportPriority) => {
  if (pri === undefined) return { text: '', color: '#818a91', bg: '#fbf9f8' };
  switch (pri) {
    case SupportPriority.Urgent:
      return { text: 'Khẩn cấp', color: '#ba1a1a', bg: '#ffebee' };
    case SupportPriority.High:
      return { text: 'Cao', color: '#d84315', bg: '#fbe9e7' };
    case SupportPriority.Normal:
      return { text: 'Trung bình', color: '#ff8228', bg: '#ffe6d5' };
    case SupportPriority.Low:
    default:
      return { text: 'Thấp', color: '#818a91', bg: '#f5f3f2' };
  }
};

export const getStatusStyle = (status?: SupportStatus) => {
  if (status === undefined) return { text: '', color: '#818a91', bg: '#fbf9f8' };
  switch (status) {
    case SupportStatus.Closed:
      return { text: 'Đã đóng', color: '#574237', bg: '#efedec' };
    case SupportStatus.Resolved:
      return { text: 'Đã giải quyết', color: '#2e7d32', bg: '#e8f5e9' };
    case SupportStatus.InProgress:
      return { text: 'Đang xử lý', color: '#01677d', bg: '#e7f8fc' };
    case SupportStatus.Open:
    default:
      return { text: 'Mở', color: '#ff8228', bg: '#ffe6d5' };
  }
};
