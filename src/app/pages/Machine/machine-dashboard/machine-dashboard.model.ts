import { MachineSlotType } from 'src/app/core/model/Common/Machine/machine-utilization';

export interface ISlotStyle {
  type: MachineSlotType;
  label: string;
  widthPercent: number;
  tooltip: string;
}
