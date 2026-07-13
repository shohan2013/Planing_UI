import { ApproveMatrixGroupAssign } from "./ApproveMatrixGroupAssig";
import { Enroll } from "./ApproveMatrixGroupEnroll";
import { ApproveMatrixGroupHeader } from "./ApproveMatrixGroupHeader";

export class ApproveMatrixGroupSave {
  Header: ApproveMatrixGroupHeader = new ApproveMatrixGroupHeader();
  //Lines:  ApproveMatrixGroupAssign[] = [];
  Line:Enroll[]=[];
}

