export const REQUISITION_REMAINING_MARGIN = 0.5;
export const REQUISITION_TOTAL_REMAINING_MARGIN = 1;

const BADGE_STYLE = {
  display: 'inline-block',
  padding: '4px 7px',
  'border-radius': '7px',
  'font-size': '12px',
  'font-weight': '600',
  'line-height': '1.2',
  'white-space': 'nowrap',
};

const YELLOW_BADGE = {
  ...BADGE_STYLE,
  color: '#946800',
  'background-color': 'rgba(245, 158, 11, 0.15)',
};

const GREEN_BADGE = {
  ...BADGE_STYLE,
  color: '#047857',
  'background-color': 'rgba(34, 197, 94, 0.12)',
};

const RED_BADGE = {
  ...BADGE_STYLE,
  color: '#b91c1c',
  'background-color': 'rgba(239, 68, 68, 0.12)',
};

function quantityBadgeStyle(value: number | null | undefined, margin: number) {
  if (value == null || !Number.isFinite(value)) return null;
  if (value > 0) return YELLOW_BADGE;
  return value >= -margin ? GREEN_BADGE : RED_BADGE;
}

export function requisitionRemainingBadgeStyle(value: number | null | undefined) {
  return quantityBadgeStyle(value, REQUISITION_REMAINING_MARGIN);
}

export function requisitionTotalRemainingBadgeStyle(value: number | null | undefined) {
  return quantityBadgeStyle(value, REQUISITION_TOTAL_REMAINING_MARGIN);
}