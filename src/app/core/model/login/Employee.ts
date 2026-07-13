export interface Employee{
     rowID: number;
  enroll: number;
  code: string;
  name: string;

  unit: number;
  unitName: string;

  intDepartmentID: number;
  strDepatrment: string;

  designation: number;
  designationName: string;

  intJobStationID: number;
  strJobStationName: string;

  // [NotMapped]
  jobtype: number;
  jobtypeName: string;
  // [NotMapped]
  dteAppointmentDate: string;

  intPfUnitId?: number | null;

  email: string;
  phoneno: string;
  supervisor: string;

  // [NotMapped]
  otp: number;

  // [NotMapped]
  message_: string;
}
