
export enum DocumentStatusId {
  Initiator = 1,
  Pending = 2,
  Acknowledged = 3,
  Approved = 4,
  Rejected = 5,
  Generated = 6,
  Completed = 7,
}

export function getDocumentStatusClass(statusId: number): string {
  switch (Number(statusId)) {
    case DocumentStatusId.Pending: return 'pending';
    case DocumentStatusId.Approved: return 'approve';
    case DocumentStatusId.Rejected: return 'reject';
    case DocumentStatusId.Completed: return 'complete';
    default: return '';
  }
}